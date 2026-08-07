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
    <div className="flex items-center gap-1.5 border-b border-hairline bg-tint/[0.03] px-page py-1">
      <span className="text-body font-semibold tabular-nums">{date}</span>
      <span className="rounded-[5px] bg-tint/[0.08] px-1 py-px text-[10px] font-medium uppercase tracking-wide text-subtitle">
        {weekday}
      </span>

      <span className="ml-auto flex items-center gap-2.5">
        {day.income > 0 && (
          <span className="amount text-[11px] font-medium text-income">
            {money(day.income)}
          </span>
        )}
        {day.expense > 0 && (
          <span className="amount text-[11px] font-medium text-expense">
            {money(day.expense)}
          </span>
        )}
      </span>
    </div>
  )
}
