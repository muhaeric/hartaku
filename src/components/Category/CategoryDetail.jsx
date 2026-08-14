import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import {
  ALL_MONTHS,
  buildMonthOptions,
  currentMonthKey,
  monthLabel,
  shiftMonth
} from '../../lib/dates.js'
import { formatCurrency } from '../../lib/format.js'
import { categoryMonthlyTotals, filterByMonth, groupByDay, monthsWithData } from '../../lib/summary.js'
import { Card } from '../ui/Card.jsx'
import { SkeletonRows } from '../ui/Feedback.jsx'
import ListRow, { RowIcon } from '../ui/ListRow.jsx'
import MonthStepper from '../ui/MonthStepper.jsx'
import { ChevronLeftIcon } from '../ui/icons.jsx'
import DayGroupHeader from '../Transaction/DayGroup.jsx'
import TransactionRow from '../Transaction/TransactionRow.jsx'
import CategoryTrend from './CategoryTrend.jsx'

/** Colour for a category the sheet no longer has - "Tanpa kategori" included. */
const FALLBACK_COLOR = '#94a3b8'

/**
 * Months drawn either side of the one being read. Weighted backwards because
 * that is where the comparison is - the months ahead are there so a future-dated
 * entry is visible rather than silently off the edge.
 */
const BEHIND = 4
const AHEAD = 2

export default function CategoryDetail () {
  const { name } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { settings } = useSettings()
  const { transactions, categories, loading } = useData()

  /**
   * Opens on the month whoever linked here was looking at, so arriving from the
   * dashboard's "Juli 2026" does not land on today. Read once - after that the
   * stepper owns it, and rewriting the URL on every step would fill the back
   * button with months nobody asked to revisit.
   */
  const [month, setMonth] = useState(() => {
    const wanted = params.get('month')
    return /^\d{4}-\d{2}$/.test(wanted || '') ? wanted : currentMonthKey()
  })

  const category = categories.find((item) => item.name === name)
  const color = category?.color || FALLBACK_COLOR

  const money = (value) => formatCurrency(value, settings.currency)

  const monthOptions = useMemo(
    () => buildMonthOptions(monthsWithData(transactions)),
    [transactions]
  )

  /**
   * Which flow the chart plots follows the category's own type, so an income
   * category is not drawn as a flat zero line of spending it never had. A
   * category that takes both is charted as spending - that is the question the
   * dashboard was asking when it linked here - while the list below stays
   * complete, because a month's history that hides half its rows is not one.
   */
  const flow = category?.type === 'income' ? 'income' : 'expense'

  /**
   * The stepper offers "Semua periode" like it does everywhere else, and it
   * means the same thing here: the list drops its month filter. The chart still
   * has to be drawn around some month, so it anchors on this one - there is no
   * such thing as the chart of every month at once.
   */
  const all = month === ALL_MONTHS
  const anchor = all ? currentMonthKey() : month

  const series = useMemo(() => {
    const months = []
    for (let offset = -BEHIND; offset <= AHEAD; offset += 1) {
      months.push(shiftMonth(anchor, offset))
    }

    return categoryMonthlyTotals(transactions, name, months, flow)
  }, [transactions, name, anchor, flow])

  const { days, total, count } = useMemo(() => {
    const scoped = transactions.filter(
      (transaction) => (transaction.category || 'Tanpa kategori') === name
    )
    const items = all ? scoped : filterByMonth(scoped, month)

    return {
      days: groupByDay(items),
      total: items.reduce(
        (sum, transaction) => (transaction.type === flow ? sum + transaction.amount : sum),
        0
      ),
      count: items.length
    }
  }, [transactions, month, all, name, flow])

  const periodLabel = all ? 'Semua periode' : monthLabel(month)

  if (loading && !transactions.length) return <SkeletonRows rows={5} />

  return (
    <>
      <div className="space-y-gap-normal">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-1 flex items-center gap-0.5 text-body font-medium text-brand"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Kembali
        </button>

        <Card>
          <div className="flex items-center gap-2.5">
            <RowIcon icon={category?.icon || '🏷️'} color={color} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-card-title font-semibold">{name}</p>
              <p className="truncate text-caption text-subtitle">
                {periodLabel} · {count} transaksi
                {category?.archived && ' · arsip'}
              </p>
            </div>
            <p className="amount shrink-0 text-amount font-semibold">{money(total)}</p>
          </div>

          {category?.description && (
            <p className="mt-2 border-t border-hairline pt-2 text-caption text-subtitle">
              {category.description}
            </p>
          )}
        </Card>

        <MonthStepper value={month} options={monthOptions} onChange={setMonth} />
      </div>

      <div className="space-y-gap-normal">
        <p className="text-caption font-medium text-subtitle">
          {flow === 'income' ? 'Pemasukan' : 'Pengeluaran'} per bulan
        </p>
        <Card>
          <CategoryTrend
            series={series}
            selected={all ? null : month}
            color={color}
            onSelect={setMonth}
          />
          <p className="hint">Ketuk salah satu bulan untuk melihat riwayatnya.</p>
        </Card>
      </div>

      <div className="space-y-gap-normal">
        <p className="text-caption font-medium text-subtitle">Riwayat · {periodLabel}</p>

        {days.length ? (
          <Card flush as="div">
            {days.map((day) => (
              <div key={day.date}>
                <DayGroupHeader day={day} />
                {day.items.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onOpen={() => navigate(`/transactions/${transaction.id}/edit`)}
                  />
                ))}
              </div>
            ))}
          </Card>
        ) : (
          <ListRow
            title="Tidak ada transaksi di bulan ini"
            subtitle="Coba pindah ke bulan lain lewat grafik atau tombol di atas."
            className="rounded-card border border-hairline bg-surface"
          />
        )}
      </div>
    </>
  )
}
