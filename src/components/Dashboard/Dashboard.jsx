import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { buildMonthOptions, currentMonthKey } from '../../lib/dates.js'
import { categoryBreakdown, filterByMonth, monthsWithData, summarize } from '../../lib/summary.js'
import Button from '../ui/Button.jsx'
import { ErrorState, SkeletonCard } from '../ui/Feedback.jsx'
import { ListIcon, PlusIcon } from '../ui/icons.jsx'
import AccountBalances from './AccountBalances.jsx'
import MonthSelector from './MonthSelector.jsx'
import SummaryCards from './SummaryCards.jsx'
import TopExpenses from './TopExpenses.jsx'

export default function Dashboard () {
  const navigate = useNavigate()
  const { transactions, categories, accounts, loading, error, reload } = useData()
  const [month, setMonth] = useState(currentMonthKey)

  const monthOptions = useMemo(
    () => buildMonthOptions(monthsWithData(transactions)),
    [transactions]
  )

  const { summary, breakdown } = useMemo(() => {
    const items = filterByMonth(transactions, month)
    return { summary: summarize(items), breakdown: categoryBreakdown(items, 'expense') }
  }, [transactions, month])

  if (error) return <ErrorState message={error} onRetry={() => reload()} />

  if (loading && !transactions.length && !accounts.length) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <AccountBalances accounts={accounts} transactions={transactions} />

      <MonthSelector value={month} options={monthOptions} onChange={setMonth} />
      <SummaryCards summary={summary} />

      <section className="card" aria-labelledby="top-expenses-heading">
        <h2 id="top-expenses-heading" className="mb-4 text-base font-semibold">
          Pengeluaran terbesar
        </h2>
        <TopExpenses breakdown={breakdown} categories={categories} />
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button className="justify-center" onClick={() => navigate('/add')}>
          <PlusIcon className="h-5 w-5" />
          Tambah transaksi
        </Button>
        <Button
          variant="secondary"
          className="justify-center"
          onClick={() => navigate('/transactions')}
        >
          <ListIcon className="h-5 w-5" />
          Lihat semua transaksi
        </Button>
      </div>
    </div>
  )
}
