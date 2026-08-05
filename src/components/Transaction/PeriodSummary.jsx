import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * Income, expense and their difference for whatever is currently in the list.
 * It follows the filters rather than the whole month: a total that ignores the
 * filter you just applied is a total for a question nobody asked. The filters
 * are right above it and say so themselves, so the strip carries no caption.
 *
 * Figures sit at caption size because three of them share one 375px row; at
 * body size the widest was truncating, and a clipped amount is worse than a
 * small one.
 */
export default function PeriodSummary ({ summary }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <div className="rounded-card border border-hairline bg-surface px-3 py-2 dark:border-hairline-dark dark:bg-surface-dark">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Figure
          label="Masuk"
          value={money(summary.income)}
          tone="text-income dark:text-emerald-400"
        />
        <Figure
          label="Keluar"
          value={money(summary.expense)}
          tone="text-expense dark:text-red-400"
        />
        <Figure
          label="Selisih"
          value={money(summary.net)}
          tone={summary.net < 0 ? 'text-expense dark:text-red-400' : ''}
        />
      </div>
    </div>
  )
}

function Figure ({ label, value, tone = '' }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] leading-4 text-subtitle dark:text-subtitle-dark">{label}</p>
      <p className={`mt-0.5 truncate text-caption font-semibold amount ${tone}`}>{value}</p>
    </div>
  )
}
