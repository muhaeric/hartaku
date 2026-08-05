import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ACCOUNT_KINDS, PAGE_SIZE, PAGINATION_THRESHOLD } from '../../lib/constants.js'
import { buildMonthOptions, currentMonthKey } from '../../lib/dates.js'
import { readLastAccount, writeLastAccount } from '../../lib/lastAccount.js'
import { filterByMonth, groupByDay, monthsWithData, summarize } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { Card } from '../ui/Card.jsx'
import ConfirmDialog from '../ui/ConfirmDialog.jsx'
import { EmptyState, ErrorState, SkeletonRows } from '../ui/Feedback.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import Sheet from '../ui/Sheet.jsx'
import DayGroupHeader from './DayGroup.jsx'
import PeriodSummary from './PeriodSummary.jsx'
import SelectionBar from './SelectionBar.jsx'
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
  const {
    transactions,
    categories,
    accounts,
    loading,
    error,
    reload,
    addTransactions,
    moveTransactions,
    removeTransactions
  } = useData()

  // Arriving from an account row: ?account=<name> preselects that filter.
  const [params] = useSearchParams()
  const accountParam = params.get('account') || ''

  const [month, setMonth] = useState(currentMonthKey)
  // The account filter survives leaving the page: it is what the entry form
  // preselects, so silently forgetting it here would make that preselection
  // look random.
  const [filters, setFilters] = useState(() => ({
    ...INITIAL_FILTERS,
    account: accountParam || readLastAccount()
  }))
  // Null so the month jump still runs once the transactions have loaded.
  const appliedAccount = useRef(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState([])
  const [pendingDelete, setPendingDelete] = useState(null)
  const [moving, setMoving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [busy, setBusy] = useState(false)
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

  useEffect(() => writeLastAccount(filters.account), [filters.account])

  /**
   * A remembered filter pointing at a deleted account would show an empty list
   * with no obvious cause, so drop it once the accounts are known.
   */
  useEffect(() => {
    if (!filters.account || !accounts.length) return
    if (accounts.some((account) => account.name === filters.account)) return

    setFilters((current) => ({ ...current, account: '' }))
  }, [accounts, filters.account])

  /**
   * Landing on an account whose current month happens to be empty would look
   * like the account has no history at all, so jump to the newest month it does
   * have. The ref keeps this to once per arrival - otherwise it would yank the
   * month back every time the user picked a different one.
   */
  useEffect(() => {
    if (!accountParam || !transactions.length) return
    if (appliedAccount.current === accountParam) return

    appliedAccount.current = accountParam
    setFilters((current) => ({ ...current, account: accountParam }))

    const owned = transactions.filter(
      (transaction) =>
        transaction.account === accountParam || transaction.toAccount === accountParam
    )
    const months = monthsWithData(owned).sort().reverse()

    setMonth((current) => (months.length && !months.includes(current) ? months[0] : current))
  }, [accountParam, transactions])

  const toggleSelected = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )

  const leaveSelection = () => {
    setSelected([])
    setSelecting(false)
  }

  const confirmDelete = async () => {
    const ids = pendingDelete.ids
    try {
      await removeTransactions(ids)
      leaveSelection()
      toast.success(ids.length > 1 ? `${ids.length} transaksi dihapus.` : 'Transaksi dihapus.')
    } catch (err) {
      toast.error(err.message)
    }
  }

  /**
   * Moving rewrites which account the transaction was recorded on. Transfers
   * already arriving at the target cannot move - both ends would be the same
   * account - so the count that actually moved is what gets reported, never the
   * count that was asked for.
   */
  const handleMove = async (account) => {
    setBusy(true)
    try {
      const moved = await moveTransactions(selected, account)
      const skipped = selected.length - moved.length

      if (!moved.length) {
        toast.error(`Tidak ada yang bisa dipindah ke ${account} — semuanya sudah di sana.`)
        return
      }

      setMoving(false)
      leaveSelection()
      toast.success(
        skipped > 0
          ? `${moved.length} transaksi pindah ke ${account}, ${skipped} dilewati.`
          : `${moved.length} transaksi pindah ke ${account}.`
      )
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    const wanted = new Set(selected)
    const copies = transactions
      .filter((transaction) => wanted.has(transaction.id))
      .map((transaction) => ({
        date: transaction.date,
        account: transaction.account,
        toAccount: transaction.toAccount || '',
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category || '',
        description: transaction.description || ''
      }))

    try {
      // Deliberately no `createdAt`: a copy was made now, and stamping it with
      // the original's time would bury it next to the row it was copied from.
      await addTransactions(copies)
      leaveSelection()
      toast.success(
        copies.length > 1 ? `${copies.length} transaksi disalin.` : 'Transaksi disalin.'
      )
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
          {selecting ? `${selected.length} dipilih` : `${visible.length} transaksi`}
        </p>

        {/* Checkboxes only appear on demand - they are clutter the rest of the time. */}
        {selecting ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setSelected((current) =>
                  current.length === visible.length ? [] : visible.map((item) => item.id)
                )
              }
            >
              {selected.length === visible.length ? 'Kosongkan' : 'Pilih semua'}
            </Button>
            <Button variant="ghost" size="sm" onClick={leaveSelection}>
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

          {selecting && (
            <SelectionBar
              count={selected.length}
              onMove={() => setMoving(true)}
              onCopy={() => setCopying(true)}
              onDelete={() => setPendingDelete({ ids: selected })}
            />
          )}
        </>
      )}

      <Sheet
        open={moving}
        title="Pindah ke akun"
        description={`${selected.length} transaksi akan dicatat di akun lain.`}
        onClose={() => !busy && setMoving(false)}
      >
        <div className="divide-hairline">
          {accounts.map((account) => (
            <ListRow
              key={account.id}
              leading={<RowIcon icon={account.icon} color={account.color} />}
              title={account.name}
              subtitle={ACCOUNT_KINDS.find((kind) => kind.value === account.kind)?.label}
              onClick={() => !busy && handleMove(account.name)}
              className="!px-0"
            />
          ))}
        </div>
        <p className="hint">
          Yang berubah adalah akun tempat transaksinya tercatat — untuk transfer, itu akun
          asalnya. Transfer yang tujuannya sudah akun ini akan dilewati.
        </p>
      </Sheet>

      <ConfirmDialog
        open={copying}
        title="Salin transaksi?"
        message={`${selected.length} transaksi akan digandakan persis — tanggal, akun, kategori, dan nominalnya sama. Salinannya bisa diubah satu per satu setelah ini.`}
        confirmLabel="Salin"
        destructive={false}
        onConfirm={handleCopy}
        onClose={() => setCopying(false)}
      />

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
