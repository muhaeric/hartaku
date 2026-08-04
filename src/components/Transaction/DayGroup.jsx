import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * Day heading: the date on the left, that day's income and expense on the right.
 * Reading down the right edge answers "which days cost me money" without opening
 * anything, which a flat list cannot do.
 */
export default function DayGroupHeader ({ day }) {
  const { settings } = useSettings()
  const [year, month, date] = day.date.split('-').map(Number)
  const weekday = new Date(year, month - 1, date).toLocaleDateString('id-ID', { weekday: 'short' })

  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <div className="flex items-center gap-2 border-b border-hairline bg-black/[0.02] px-page py-1.5 dark:border-hairline-dark dark:bg-white/[0.03]">
      <span className="text-card-title font-semibold tabular-nums">{date}</span>
      <span className="rounded-[6px] bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-subtitle dark:bg-white/10 dark:text-subtitle-dark">
        {weekday}
      </span>

      <span className="ml-auto flex items-center gap-3">
        {day.income > 0 && (
          <span className="amount text-caption font-semibold text-income dark:text-emerald-400">
            {money(day.income)}
          </span>
        )}
        {day.expense > 0 && (
          <span className="amount text-caption font-semibold text-expense dark:text-red-400">
            {money(day.expense)}
          </span>
        )}
      </span>
    </div>
  )
}
