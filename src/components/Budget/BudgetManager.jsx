import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { budgetProgress } from '../../lib/budgets.js'
import { buildMonthOptions, currentMonthKey, monthLabel, shiftMonth } from '../../lib/dates.js'
import { formatCurrency } from '../../lib/format.js'
import { monthsWithData } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState } from '../ui/Feedback.jsx'
import KebabMenu from '../ui/KebabMenu.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import MonthStepper from '../ui/MonthStepper.jsx'
import { CopyIcon, PencilIcon, PlusIcon, TrashIcon } from '../ui/icons.jsx'
import BudgetForm from './BudgetForm.jsx'
import BudgetProgressBar from './BudgetProgressBar.jsx'

export default function BudgetManager () {
  const toast = useToast()
  const { settings } = useSettings()
  const {
    budgets,
    transactions,
    categories,
    activeCategories,
    addBudget,
    addBudgets,
    editBudget,
    removeBudget
  } = useData()

  const [month, setMonth] = useState(currentMonthKey)
  const [editing, setEditing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [copying, setCopying] = useState(false)

  const options = useMemo(
    () => buildMonthOptions([...monthsWithData(transactions), ...budgets.map((budget) => budget.month)]),
    [transactions, budgets]
  )

  const progress = useMemo(
    () => budgetProgress(budgets, transactions, month),
    [budgets, transactions, month]
  )

  const categoryByName = useMemo(
    () => new Map(categories.map((category) => [category.name, category])),
    [categories]
  )

  const eligible = useMemo(() => {
    const used = new Set(
      budgets
        .filter((budget) => budget.month === month && budget.id !== editing?.id)
        .map((budget) => budget.category)
    )

    return activeCategories
      .filter((category) =>
        (category.type === 'expense' || category.type === 'both') && !used.has(category.name)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [activeCategories, budgets, editing, month])

  const formCategories = useMemo(() => {
    if (!editing?.category || eligible.some((category) => category.name === editing.category)) {
      return eligible
    }
    const current = categoryByName.get(editing.category)
    return current ? [current, ...eligible] : eligible
  }, [categoryByName, editing, eligible])

  const previous = shiftMonth(month, -1)
  const missingPrevious = useMemo(() => {
    const existing = new Set(
      budgets.filter((budget) => budget.month === month).map((budget) => budget.category)
    )
    const allowed = new Set(
      activeCategories
        .filter((category) => category.type === 'expense' || category.type === 'both')
        .map((category) => category.name)
    )
    const seen = new Set()
    return budgets.filter((budget) => {
      if (
        budget.month !== previous ||
        !allowed.has(budget.category) ||
        existing.has(budget.category) ||
        seen.has(budget.category)
      ) return false

      seen.add(budget.category)
      return true
    })
  }, [activeCategories, budgets, month, previous])

  const money = (value, compact = false) =>
    formatCurrency(value, settings.currency, { compact, precise: compact })

  const save = async (values) => {
    try {
      if (values.id) {
        await editBudget(values)
        toast.success('Anggaran diperbarui.')
      } else {
        await addBudget(values)
        toast.success('Anggaran ditambahkan.')
      }
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const copyPrevious = async () => {
    setCopying(true)
    try {
      const created = await addBudgets(
        missingPrevious.map(({ category, amount }) => ({ month, category, amount }))
      )
      toast.success(`${created.length} anggaran dari ${monthLabel(previous)} disalin.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCopying(false)
    }
  }

  const remove = async () => {
    try {
      await removeBudget(pendingDelete.id)
      toast.success('Anggaran dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const sorted = [...progress.entries].sort((a, b) => a.category.localeCompare(b.category))

  return (
    <div className="space-y-gap-normal">
      <SectionHeader
        title="Anggaran bulanan"
        hint={`${progress.entries.length} kategori · ${monthLabel(month)}`}
        action={
          <Button
            size="sm"
            disabled={!eligible.length}
            onClick={() => setEditing({ month, category: '', amount: '' })}
          >
            <PlusIcon className="h-4 w-4" /> Tambah
          </Button>
        }
      />

      <MonthStepper value={month} options={options} onChange={setMonth} allowAll={false} />

      {progress.entries.length > 0 && (
        <Card>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-caption text-subtitle">Terpakai</p>
              <p className={`amount text-card-title font-semibold ${progress.remaining < 0 ? 'text-expense' : ''}`}>
                {money(progress.totalSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-caption text-subtitle">dari {money(progress.totalBudget)}</p>
              <p className={`amount text-caption font-medium ${progress.remaining < 0 ? 'text-expense' : 'text-subtitle'}`}>
                {progress.remaining < 0
                  ? `Lebih ${money(Math.abs(progress.remaining))}`
                  : `Sisa ${money(progress.remaining)}`}
              </p>
            </div>
          </div>
          <BudgetProgressBar
            ratio={progress.ratio}
            over={progress.remaining < 0}
            className="mt-3"
          />
          {progress.unbudgetedSpent > 0 && (
            <p className="mt-2 text-caption text-warning">
              {money(progress.unbudgetedSpent)} pengeluaran belum punya anggaran.
            </p>
          )}
        </Card>
      )}

      {!progress.entries.length ? (
        <Card flush as="div">
          <EmptyState
            icon="🎯"
            title="Belum ada anggaran"
            description={`Tentukan batas pengeluaran per kategori untuk ${monthLabel(month)}.`}
            actionLabel={eligible.length ? 'Buat anggaran' : undefined}
            onAction={eligible.length ? () => setEditing({ month, category: '', amount: '' }) : undefined}
          />
        </Card>
      ) : (
        <Card flush as="ul" className="divide-hairline overflow-hidden">
          {sorted.map((entry) => {
            const category = categoryByName.get(entry.category)
            return (
              <li key={entry.id}>
                <div className="px-page py-2.5">
                  <ListRow
                    className="!px-0 !py-0"
                    leading={<RowIcon icon={category?.icon || '🏷️'} color={category?.color} />}
                    title={entry.category}
                    subtitle={`${money(entry.spent, true)} dari ${money(entry.amount, true)}`}
                    trailing={entry.over ? `Lebih ${money(Math.abs(entry.remaining), true)}` : `Sisa ${money(entry.remaining, true)}`}
                    action={
                      <KebabMenu
                        label={`Aksi anggaran ${entry.category}`}
                        items={[
                          { label: 'Ubah', icon: <PencilIcon className="h-4 w-4" />, onSelect: () => setEditing(entry) },
                          { label: 'Hapus', icon: <TrashIcon className="h-4 w-4" />, destructive: true, onSelect: () => setPendingDelete(entry) }
                        ]}
                      />
                    }
                  />
                  <BudgetProgressBar ratio={entry.ratio} over={entry.over} className="mt-2" />
                </div>
              </li>
            )
          })}
        </Card>
      )}

      {missingPrevious.length > 0 && (
        <Button variant="secondary" className="w-full justify-center" loading={copying} onClick={copyPrevious}>
          <CopyIcon className="h-4 w-4" />
          Salin {missingPrevious.length} dari bulan lalu
        </Button>
      )}

      {editing && (
        <BudgetForm
          key={editing.id || `${month}-new`}
          initial={editing}
          categories={formCategories}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus anggaran?"
        message={`Batas ${pendingDelete?.category} untuk ${monthLabel(pendingDelete?.month || month)} akan dihapus. Transaksi tidak ikut terhapus.`}
        onConfirm={remove}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}
