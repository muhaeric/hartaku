import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'
import { Card } from '../ui/Card.jsx'

/**
 * Income, expense and their difference for whatever is currently in the list.
 * It follows the filters rather than the whole month: a total that ignores the
 * filter you just applied is a total for a question nobody asked.
 */
export default function PeriodSummary ({ summary, filtered }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <Card className="py-2.5">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Figure label="Masuk" value={money(summary.income)} tone="text-income dark:text-emerald-400" />
        <Figure label="Keluar" value={money(summary.expense)} tone="text-expense dark:text-red-400" />
        <Figure
          label="Selisih"
          value={money(summary.net)}
          tone={summary.net < 0 ? 'text-expense dark:text-red-400' : ''}
        />
      </div>

      {filtered && (
        <p className="mt-1.5 border-t border-hairline pt-1.5 text-center text-caption text-subtitle dark:border-hairline-dark dark:text-subtitle-dark">
          Mengikuti filter yang aktif
        </p>
      )}
    </Card>
  )
}

function Figure ({ label, value, tone = '' }) {
  return (
    <div className="min-w-0">
      <p className="text-caption text-subtitle dark:text-subtitle-dark">{label}</p>
      <p className={`mt-0.5 truncate text-body font-semibold amount ${tone}`}>{value}</p>
    </div>
  )
}
