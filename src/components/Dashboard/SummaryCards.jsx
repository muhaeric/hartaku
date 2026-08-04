import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * Month totals. Values stay in text ink; the small coloured dot beside each
 * label carries the income/expense polarity, so meaning never rests on colour
 * alone. Transfers are excluded - they move money, they do not create it.
 */
export default function SummaryCards ({ summary }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency)

  return (
    <section aria-label="Ringkasan bulan ini" className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Tile label="Pemasukan" value={money(summary.income)} dotClass="bg-income" />
        <Tile label="Pengeluaran" value={money(summary.expense)} dotClass="bg-expense" />
      </div>

      <div className="card">
        <p className="text-sm text-slate-500 dark:text-slate-400">Selisih bulan ini</p>
        <p
          className={`mt-1 text-2xl font-semibold tracking-tight ${
            summary.net < 0 ? 'text-expense dark:text-red-400' : ''
          }`}
        >
          {money(summary.net)}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {summary.count} transaksi
          {summary.transfers > 0 && ` · ${summary.transfers} di antaranya transfer`}
        </p>
      </div>
    </section>
  )
}

function Tile ({ label, value, dotClass }) {
  return (
    <div className="card">
      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
