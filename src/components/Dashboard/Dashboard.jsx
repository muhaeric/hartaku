import { useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useGoldPrice } from '../../hooks/useGoldPrice.js'
import { buildMonthOptions, currentMonthKey } from '../../lib/dates.js'
import {
  accountBalances,
  categoryBreakdown,
  filterByMonth,
  goldSummary,
  monthsWithData,
  netWorth,
  summarize
} from '../../lib/summary.js'
import { Card, SectionHeader } from '../ui/Card.jsx'
import { ErrorState, SkeletonRows, SkeletonSummary } from '../ui/Feedback.jsx'
import AccountBalances from './AccountBalances.jsx'
import MonthSelector from './MonthSelector.jsx'
import NetWorthCard from './NetWorthCard.jsx'
import NetWorthTrend from './NetWorthTrend.jsx'
import SummaryCards from './SummaryCards.jsx'
import TopExpenses from './TopExpenses.jsx'

export default function Dashboard () {
  const { transactions, categories, accounts, goldLots, loading, error, reload } = useData()
  const { quote } = useGoldPrice()
  const [month, setMonth] = useState(currentMonthKey)

  const monthOptions = useMemo(
    () => buildMonthOptions(monthsWithData(transactions)),
    [transactions]
  )

  const balances = useMemo(
    () => accountBalances(accounts, transactions, goldLots),
    [accounts, transactions, goldLots]
  )

  /**
   * Archived accounts drop off the list once they are empty, which is what
   * archiving one is normally for. One still holding money stays on - it is part
   * of the net worth above it, and a list that quietly omitted it would stop
   * adding up to the figure it sits under.
   */
  const listed = useMemo(
    () => balances.filter((entry) => !entry.account.archived || entry.balance !== 0),
    [balances]
  )

  const gold = useMemo(
    () => goldSummary(goldLots, quote?.buybackPerGram),
    [goldLots, quote]
  )

  const worth = useMemo(() => netWorth(balances, gold.value || 0), [balances, gold.value])

  const { summary, breakdown } = useMemo(() => {
    const items = filterByMonth(transactions, month)
    return { summary: summarize(items), breakdown: categoryBreakdown(items, 'expense') }
  }, [transactions, month])

  if (error) return <ErrorState message={error} onRetry={() => reload()} />

  if (loading && !transactions.length && !accounts.length) {
    return (
      <div className="space-y-section">
        <SkeletonSummary />
        <SkeletonRows rows={4} />
      </div>
    )
  }

  return (
    <>
      <NetWorthCard worth={worth}>
        <NetWorthTrend
          accounts={accounts}
          transactions={transactions}
          goldLots={goldLots}
          holdsGold={gold.grams > 0}
        />
      </NetWorthCard>

      <AccountBalances balances={listed} gold={gold} />

      <div className="space-y-gap-normal">
        <SectionHeader
          title="Bulan ini"
          action={<MonthSelector value={month} options={monthOptions} onChange={setMonth} />}
        />
        <SummaryCards summary={summary} />
      </div>

      <div className="space-y-gap-normal">
        <SectionHeader title="Pengeluaran terbesar" />
        <Card flush as="div">
          <TopExpenses breakdown={breakdown} categories={categories} />
        </Card>
      </div>
    </>
  )
}
