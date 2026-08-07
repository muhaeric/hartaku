import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'
import { Card } from '../ui/Card.jsx'

/**
 * Month totals in one card rather than three. Transfers are excluded - they move
 * money, they do not create it.
 */
export default function SummaryCards ({ summary }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency, { compact: true })

  return (
    <Card aria-label="Ringkasan bulan ini">
      <div className="grid grid-cols-3 gap-3">
        <Figure label="Masuk" value={money(summary.income)} dotClass="bg-income" />
        <Figure label="Keluar" value={money(summary.expense)} dotClass="bg-expense" />
        <Figure
          label="Selisih"
          value={money(summary.net)}
          dotClass="bg-brand"
          tone={summary.net < 0 ? 'text-expense' : ''}
        />
      </div>

      <p className="mt-2.5 border-t border-hairline pt-2 text-caption text-subtitle">
        {summary.count} transaksi
        {summary.transfers > 0 && ` · ${summary.transfers} transfer`}
      </p>
    </Card>
  )
}

function Figure ({ label, value, dotClass, tone = '' }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-caption text-subtitle">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </p>
      <p className={`mt-0.5 text-amount font-semibold amount ${tone}`}>{value}</p>
    </div>
  )
}
