import { useCallback, useEffect, useMemo, useState } from 'react'
import { useData } from '../../context/DataContext.jsx'
import { useGoldPrice } from '../../hooks/useGoldPrice.js'
import {
  readDashboardCategories,
  writeDashboardCategories
} from '../../lib/dashboardFilters.js'
import { buildMonthOptions, currentMonthKey } from '../../lib/dates.js'
import {
  accountBalances,
  accountBreakdown,
  categoryBreakdown,
  filterByMonth,
  goldSummary,
  monthsWithData,
  netWorth,
  summarize,
  tagBreakdown
} from '../../lib/summary.js'
import { Card, SectionHeader } from '../ui/Card.jsx'
import CategoryFilterChips from '../ui/CategoryFilterChips.jsx'
import Carousel from '../ui/Carousel.jsx'
import { ErrorState, SkeletonRows, SkeletonSummary } from '../ui/Feedback.jsx'
import AccountBalances from './AccountBalances.jsx'
import MonthSelector from './MonthSelector.jsx'
import NetWorthCard from './NetWorthCard.jsx'
import NetWorthTrend from './NetWorthTrend.jsx'
import SummaryCards from './SummaryCards.jsx'
import TagSpending from './TagSpending.jsx'
import TopExpenses from './TopExpenses.jsx'
import BudgetSummary from './BudgetSummary.jsx'
import InstallAppBanner from './InstallAppBanner.jsx'
import SnapshotTeaser from '../Snapshot/SnapshotTeaser.jsx'

export default function Dashboard () {
  const { transactions, categories, accounts, goldLots, budgets, loading, error, reload } = useData()
  const { quote } = useGoldPrice()
  const [month, setMonth] = useState(currentMonthKey)
  const [expenseCategories, setExpenseCategories] = useState(readDashboardCategories)
  const [breakdownReset, setBreakdownReset] = useState(0)
  const collapseBreakdowns = useCallback(() => setBreakdownReset((value) => value + 1), [])

  useEffect(
    () => writeDashboardCategories(expenseCategories),
    [expenseCategories]
  )

  /**
   * A cached category may be renamed or deleted while the Dashboard is away.
   * Once data has finished loading, drop names that no longer resolve so the
   * chart never stays silently filtered by a chip that cannot be displayed.
   */
  useEffect(() => {
    if (loading) return

    const known = new Set(categories.map((category) => category.name))
    setExpenseCategories((current) => {
      const kept = current.filter((name) => known.has(name))
      return kept.length === current.length ? current : kept
    })
  }, [categories, loading])

  const monthOptions = useMemo(
    () => buildMonthOptions([...monthsWithData(transactions), ...budgets.map((budget) => budget.month)]),
    [transactions, budgets]
  )

  const balances = useMemo(
    () => accountBalances(accounts, transactions, goldLots),
    [accounts, transactions, goldLots]
  )

  /**
   * Archiving an account takes it off this list, full stop - a leftover balance
   * no longer keeps it here.
   *
   * The earlier rule kept one that still held money, so that the list would add
   * up to the total above it. In practice that meant an account someone had
   * deliberately put away kept reappearing on the home screen over a few
   * thousand rupiah, which is what archiving was meant to stop. The money is
   * still counted in the total - it exists, and writing it off here would be a
   * lie in the other direction - so the list can now sit slightly under the
   * figure above it. The place to see those accounts is Kelola, where they are
   * grouped under Arsip with their balances.
   */
  const listed = useMemo(
    () => balances.filter((entry) => !entry.account.archived),
    [balances]
  )

  /**
   * What the list stops showing but the total above it keeps counting, sent
   * through as one figure rather than as rows. A single line is enough to make
   * the two numbers reconcile, and it is the whole reason to mention the
   * archive here at all - putting the accounts back would undo the archiving.
   */
  const archived = useMemo(() => {
    const held = balances.filter((entry) => entry.account.archived && entry.balance !== 0)
    return {
      count: held.length,
      total: held.reduce((sum, entry) => sum + entry.balance, 0)
    }
  }, [balances])

  const gold = useMemo(
    () => goldSummary(goldLots, quote?.buybackPerGram),
    [goldLots, quote]
  )

  const worth = useMemo(() => netWorth(balances, gold.value || 0), [balances, gold.value])

  const { summary, breakdown, byAccount, tags } = useMemo(() => {
    const items = filterByMonth(transactions, month)
    return {
      summary: summarize(items),
      breakdown: categoryBreakdown(items, 'expense'),
      byAccount: accountBreakdown(items, 'expense'),
      tags: tagBreakdown(items, 'expense')
    }
  }, [transactions, month])

  const categoryFilterOptions = useMemo(() => {
    const namesWithSpending = new Set(breakdown.map((row) => row.name))

    return categories.filter(
      (category) =>
        (category.type === 'expense' || category.type === 'both') &&
        (!category.archived ||
          namesWithSpending.has(category.name) ||
          expenseCategories.includes(category.name))
    )
  }, [categories, breakdown, expenseCategories])

  const filteredBreakdown = useMemo(() => {
    if (!expenseCategories.length) return breakdown

    const wanted = new Set(expenseCategories)
    return breakdown.filter((row) => wanted.has(row.name))
  }, [breakdown, expenseCategories])

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
      <InstallAppBanner />

      <SnapshotTeaser />

      <NetWorthCard worth={worth}>
        <NetWorthTrend
          accounts={accounts}
          transactions={transactions}
          goldLots={goldLots}
          holdsGold={gold.grams > 0}
        />
      </NetWorthCard>

      <AccountBalances balances={listed} gold={gold} archived={archived} />

      <div className="space-y-gap-normal">
        <SectionHeader
          title="Bulan ini"
          action={<MonthSelector value={month} options={monthOptions} onChange={setMonth} />}
        />
        <SummaryCards summary={summary} />
      </div>

      <BudgetSummary budgets={budgets} transactions={transactions} month={month} />

      {/*
        One question - where the month went - asked three ways, so they belong
        in one slot rather than three stacked sections. Category opens because
        it is the only one of the three that partitions the month, so its ring
        is the only one that adds up to the total above it; tag and account
        follow as the two ways of cutting that same money differently.
      */}
      <div className="space-y-gap-normal">
        <SectionHeader title="Pengeluaran terbesar" />
        <Card flush as="div">
          <Carousel
            label="Pengeluaran terbesar, per kategori, tag dan akun"
            onSlideChange={collapseBreakdowns}
            slides={[
              {
                key: 'category',
                title: 'Per kategori',
                content: (
                  <>
                    <CategoryFilterChips
                      categories={categoryFilterOptions}
                      selected={expenseCategories}
                      onChange={setExpenseCategories}
                      label="Filter kategori pengeluaran terbesar"
                      layout="contained-scroll"
                      className="pt-2.5"
                    />
                    <TopExpenses
                      breakdown={filteredBreakdown}
                      categories={categories}
                      totalLabel={expenseCategories.length ? 'Total pilihan' : 'Total'}
                      emptyMessage={
                        expenseCategories.length
                          ? 'Belum ada pengeluaran untuk kategori pilihan di bulan ini.'
                          : undefined
                      }
                      limit={5}
                      resetSignal={breakdownReset}
                      /* The month travels with the link: the page it opens is
                         about this month's spending, not today's. */
                      linkFor={(name) =>
                        `/categories/${encodeURIComponent(name)}?month=${month}`
                      }
                    />
                  </>
                )
              },
              {
                key: 'tag',
                title: 'Per tag',
                content: <TagSpending breakdown={tags} limit={5} resetSignal={breakdownReset} />
              },
              {
                key: 'account',
                title: 'Per akun',
                content: (
                  <TopExpenses breakdown={byAccount} categories={accounts} unit="akun" limit={5} resetSignal={breakdownReset} />
                )
              }
            ]}
          />
        </Card>
      </div>
    </>
  )
}
