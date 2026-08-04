import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PAGE_SIZE, PAGINATION_THRESHOLD } from '../../lib/constants.js'
import { buildMonthOptions, currentMonthKey } from '../../lib/dates.js'
import { filterByMonth, groupByDay, monthsWithData, summarize } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../ui/Feedback.jsx'
import { TrashIcon } from '../ui/icons.jsx'
import DayGroupHeader from './DayGroup.jsx'
import PeriodSummary from './PeriodSummary.jsx'
import TransactionFilters from './TransactionFilters.jsx'
import TransactionRow from './TransactionRow.jsx'

const INITIAL_FILTERS = { type: 'all', categories: [], account: '', search: '' }

function labelOf (transaction) {
  if (transaction.description) return transaction.description
  if (transaction.type === 'transfer') return 'Transfer'
  return transaction.category || 'Tanpa kategori'
}

export default function TransactionList () {
  const navigate = useNavigate()
  const toast = useToast()
  const { transactions, categories, accounts, loading, error, reload, removeTransactions } =
    useData()

  const [month, setMonth] = useState(currentMonthKey)
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [selecting, setSelecting] = useState(false)
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
          [
            transaction.description,
            transaction.category,
            transaction.account,
            transaction.toAccount
          ]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(search))
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [transactions, month, filters])

  const summary = useMemo(() => summarize(visible), [visible])

  const paginated = visible.length > PAGINATION_THRESHOLD
  const pageCount = paginated ? Math.ceil(visible.length / PAGE_SIZE) : 1
  const rows = paginated ? visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : visible

  // Grouping happens after paging so a day is never split across two pages
  // without its header.
  const days = useMemo(() => groupByDay(rows), [rows])

  const filtersActive =
    filters.type !== 'all' ||
    filters.categories.length > 0 ||
    Boolean(filters.account) ||
    Boolean(filters.search.trim())

  useEffect(() => setPage(1), [month, filters])
  useEffect(() => setSelected([]), [month, filters])

  const toggleSelected = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )

  const confirmDelete = async () => {
    const ids = pendingDelete.ids
    try {
      await removeTransactions(ids)
      setSelected([])
      setSelecting(false)
      toast.success(ids.length > 1 ? `${ids.length} transaksi dihapus.` : 'Transaksi dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => reload()} />
  if (loading && !transactions.length) return <SkeletonRows rows={6} />

  return (
    <>
      <TransactionFilters
        filters={filters}
        month={month}
        monthOptions={monthOptions}
        categories={categories}
        accounts={accounts}
        onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
        onMonthChange={setMonth}
      />

      <PeriodSummary summary={summary} filtered={filtersActive} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-subtitle dark:text-subtitle-dark">
          {visible.length} transaksi
        </p>

        {/* Checkboxes only appear on demand - they are clutter the rest of the time. */}
        {selecting ? (
          <div className="flex items-center gap-1.5">
            {selected.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setPendingDelete({ ids: selected })}
              >
                <TrashIcon className="h-4 w-4" />
                Hapus {selected.length}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelecting(false)
                setSelected([])
              }}
            >
              Selesai
            </Button>
          </div>
        ) : (
          rows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelecting(true)}>
              Pilih
            </Button>
          )
        )}
      </div>

      {!rows.length ? (
        <EmptyState
          icon="📄"
          title="Belum ada transaksi"
          description="Tidak ada transaksi yang cocok dengan filter di bulan ini."
          actionLabel="Tambah transaksi"
          onAction={() => navigate('/add')}
        />
      ) : (
        <>
          <Card flush as="div" className="overflow-hidden">
            {days.map((day) => (
              <section key={day.date}>
                <DayGroupHeader day={day} />
                <ul className="divide-hairline">
                  {day.items.map((transaction) => (
                    <li key={transaction.id}>
                      <TransactionRow
                        transaction={transaction}
                        selecting={selecting}
                        selected={selected.includes(transaction.id)}
                        onSelect={() => toggleSelected(transaction.id)}
                        onOpen={() => navigate(`/transactions/${transaction.id}/edit`)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </Card>

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
              <span className="text-caption text-subtitle dark:text-subtitle-dark">
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
            ? `"${labelOf(pendingDelete.transaction)}" akan dihapus dari spreadsheet. Tindakan ini tidak bisa dibatalkan.`
            : `${pendingDelete?.ids.length || 0} transaksi akan dihapus dari spreadsheet. Tindakan ini tidak bisa dibatalkan.`
        }
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
