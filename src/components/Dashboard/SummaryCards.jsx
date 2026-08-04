import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * One hero figure (net balance) plus two stat tiles. Values stay in text ink;
 * the small coloured dot beside each label carries the income/expense polarity,
 * so the meaning never rests on colour alone.
 */
export default function SummaryCards ({ summary }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency)
  const negative = summary.net < 0

  return (
    <section aria-label="Ringkasan bulan ini" className="space-y-3">
      <div className="card">
        <p className="text-sm text-slate-500 dark:text-slate-400">Saldo bersih</p>
        <p
          className={`mt-1 text-3xl font-semibold tracking-tight sm:text-4xl ${
            negative ? 'text-expense dark:text-red-400' : 'text-slate-900 dark:text-slate-50'
          }`}
        >
          {money(summary.net)}
        </p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {summary.count} transaksi bulan ini
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Pemasukan" value={money(summary.income)} dotClass="bg-income" />
        <Tile label="Pengeluaran" value={money(summary.expense)} dotClass="bg-expense" />
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
