import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PAGE_SIZE, PAGINATION_THRESHOLD } from '../../lib/constants.js'
import { buildMonthOptions, currentMonthKey } from '../../lib/dates.js'
import { formatCurrency, formatDate } from '../../lib/format.js'
import { filterByMonth, monthsWithData } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState, ErrorState, LoadingBlock } from '../ui/Feedback.jsx'
import { PencilIcon, TrashIcon } from '../ui/icons.jsx'
import MonthSelector from '../Dashboard/MonthSelector.jsx'
import TransactionFilters from './TransactionFilters.jsx'

const INITIAL_FILTERS = { type: 'all', categories: [], account: '', search: '' }

/** What identifies a row at a glance. */
function primaryLabel (transaction) {
  if (transaction.description) return transaction.description
  if (transaction.type === 'transfer') return 'Transfer'
  return transaction.category || 'Tanpa kategori'
}

function accountLabel (transaction) {
  return transaction.type === 'transfer'
    ? `${transaction.account} → ${transaction.toAccount}`
    : transaction.account || '—'
}

export default function TransactionList () {
  const navigate = useNavigate()
  const toast = useToast()
  const { settings } = useSettings()
  const {
    transactions,
    categories,
    accounts,
    loading,
    error,
    reload,
    removeTransactions
  } = useData()

  const [month, setMonth] = useState(currentMonthKey)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [selected, setSelected] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [page, setPage] = useState(1)

  const monthOptions = useMemo(
    () => buildMonthOptions(monthsWithData(transactions)),
    [transactions]
  )

  const visible = useMemo(() => {
    const search = filters.search.trim().toLowerCase()
    const wantedCategories = new Set(filters.categories)

    return filterByMonth(transactions, month)
      .filter((transaction) => filters.type === 'all' || transaction.type === filters.type)
      .filter(
        (transaction) =>
          !wantedCategories.size ||
          (transaction.type !== 'transfer' && wantedCategories.has(transaction.category))
      )
      .filter(
        (transaction) =>
          !filters.account ||
          transaction.account === filters.account ||
          transaction.toAccount === filters.account
      )
      .filter(
        (transaction) =>
          !search ||
          [transaction.description, transaction.category, transaction.account, transaction.toAccount]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(search))
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [transactions, month, filters])

  const paginated = visible.length > PAGINATION_THRESHOLD
  const pageCount = paginated ? Math.ceil(visible.length / PAGE_SIZE) : 1
  const rows = paginated ? visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : visible

  useEffect(() => setPage(1), [month, filters])
  useEffect(() => setSelected([]), [month, filters])

  const toggleSelected = (id) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const confirmDelete = async () => {
    const ids = pendingDelete.ids
    try {
      await removeTransactions(ids)
      setSelected([])
      toast.success(ids.length > 1 ? `${ids.length} transaksi dihapus.` : 'Transaksi dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => reload()} />
  if (loading && !transactions.length) return <LoadingBlock />

  return (
    <div className="space-y-4">
      <MonthSelector value={month} options={monthOptions} onChange={setMonth} />
      <TransactionFilters
        filters={filters}
        categories={categories}
        accounts={accounts}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
      />

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
        <span>{visible.length} transaksi</span>
        {selected.length > 0 && (
          <Button variant="danger" size="sm" onClick={() => setPendingDelete({ ids: selected })}>
            <TrashIcon className="h-4 w-4" />
            Hapus {selected.length} terpilih
          </Button>
        )}
      </div>

      {!rows.length ? (
        <EmptyState
          icon="🧾"
          title="Belum ada transaksi"
          description="Tidak ada transaksi yang cocok dengan filter di bulan ini."
          action={<Button onClick={() => navigate('/add')}>Tambah transaksi</Button>}
        />
      ) : (
        <>
          {/* Cards on phones, table from lg up - same data, different density. */}
          <ul className="space-y-2 lg:hidden">
            {rows.map((transaction) => (
              <TransactionCard
                key={transaction.id}
                transaction={transaction}
                currency={settings.currency}
                dateFormat={settings.dateFormat}
                selected={selected.includes(transaction.id)}
                onToggle={() => toggleSelected(transaction.id)}
                onEdit={() => navigate(`/transactions/${transaction.id}/edit`)}
                onDelete={() => setPendingDelete({ ids: [transaction.id], transaction })}
              />
            ))}
          </ul>

          <TransactionTable
            rows={rows}
            currency={settings.currency}
            dateFormat={settings.dateFormat}
            selected={selected}
            onToggle={toggleSelected}
            onToggleAll={(checked) => setSelected(checked ? rows.map((row) => row.id) : [])}
            onEdit={(transaction) => navigate(`/transactions/${transaction.id}/edit`)}
            onDelete={(transaction) => setPendingDelete({ ids: [transaction.id], transaction })}
          />

          {paginated && (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-slate-500">
                Halaman {page} dari {pageCount}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Berikutnya
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus transaksi?"
        message={
          pendingDelete?.transaction
            ? `"${primaryLabel(pendingDelete.transaction)}" akan dihapus dari spreadsheet. Tindakan ini tidak bisa dibatalkan.`
            : `${pendingDelete?.ids.length || 0} transaksi akan dihapus dari spreadsheet. Tindakan ini tidak bisa dibatalkan.`
        }
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  )
}

/** Transfers get no sign: the money never left the books. */
function Amount ({ transaction, currency, className = '' }) {
  const { type, amount } = transaction
  const prefix = type === 'income' ? '+' : type === 'transfer' ? '' : '−'

  const tone =
    type === 'income'
      ? 'text-income dark:text-emerald-400'
      : type === 'transfer'
        ? 'text-slate-500 dark:text-slate-400'
        : 'text-slate-900 dark:text-slate-100'

  return (
    <span className={`font-semibold tabular-nums ${tone} ${className}`}>
      {prefix}
      {formatCurrency(amount, currency)}
    </span>
  )
}

function TransactionCard ({
  transaction,
  currency,
  dateFormat,
  selected,
  onToggle,
  onEdit,
  onDelete
}) {
  return (
    <li
      className={`card flex gap-3 p-3 ${selected ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}
    >
      <label className="flex items-start pt-1">
        <span className="sr-only">Pilih transaksi {primaryLabel(transaction)}</span>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-5 w-5 rounded border-slate-300 text-brand-600"
        />
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate font-medium">{primaryLabel(transaction)}</p>
          <Amount transaction={transaction} currency={currency} />
        </div>

        <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
          {formatDate(transaction.date, dateFormat)} · {accountLabel(transaction)}
          {transaction.type !== 'transfer' && transaction.category && ` · ${transaction.category}`}
        </p>

        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="tap flex items-center gap-1.5 rounded-lg px-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <PencilIcon className="h-4 w-4" /> Ubah
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="tap flex items-center gap-1.5 rounded-lg px-2 text-sm text-expense hover:bg-expense/10"
          >
            <TrashIcon className="h-4 w-4" /> Hapus
          </button>
        </div>
      </div>
    </li>
  )
}

function TransactionTable ({
  rows,
  currency,
  dateFormat,
  selected,
  onToggle,
  onToggleAll,
  onEdit,
  onDelete
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.includes(row.id))

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 lg:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <tr>
            <th scope="col" className="w-10 px-3 py-3">
              <input
                type="checkbox"
                aria-label="Pilih semua"
                checked={allSelected}
                onChange={(event) => onToggleAll(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">Tanggal</th>
            <th scope="col" className="px-3 py-3 font-semibold">Keterangan</th>
            <th scope="col" className="px-3 py-3 font-semibold">Akun</th>
            <th scope="col" className="px-3 py-3 font-semibold">Kategori</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Jumlah</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((transaction, index) => (
            <tr
              key={transaction.id}
              className={
                index % 2 ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'
              }
            >
              <td className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label={`Pilih ${primaryLabel(transaction)}`}
                  checked={selected.includes(transaction.id)}
                  onChange={() => onToggle(transaction.id)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
              </td>
              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                {formatDate(transaction.date, dateFormat)}
              </td>
              <td className="px-3 py-3 font-medium">{primaryLabel(transaction)}</td>
              <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                {accountLabel(transaction)}
              </td>
              <td className="px-3 py-3 text-slate-600 dark:text-slate-300">
                {transaction.type === 'transfer' ? '—' : transaction.category || '—'}
              </td>
              <td className="px-3 py-3 text-right">
                <Amount transaction={transaction} currency={currency} />
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(transaction)}
                    aria-label={`Ubah ${primaryLabel(transaction)}`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(transaction)}
                    aria-label={`Hapus ${primaryLabel(transaction)}`}
                    className="rounded-lg p-2 text-expense hover:bg-expense/10"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
