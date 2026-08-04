import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * Ranked magnitude of one measure, so the bars use a single hue rather than a
 * colour per category. Identity is carried by the category swatch and its
 * always-visible label; every bar is directly labelled with its value.
 */
export default function TopExpenses ({ breakdown, categories, limit = 5 }) {
  const { settings } = useSettings()
  const rows = breakdown.slice(0, limit)

  if (!rows.length) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Belum ada pengeluaran di bulan ini.
      </p>
    )
  }

  const max = rows[0].total
  const total = breakdown.reduce((sum, row) => sum + row.total, 0)
  const byName = new Map(categories.map((category) => [category.name, category]))

  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const category = byName.get(row.name)
        const share = total ? Math.round((row.total / total) * 100) : 0

        return (
          <li key={row.name} title={`${row.name}: ${share}% dari total pengeluaran`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-slate-900/10 dark:ring-white/20"
                  style={{ backgroundColor: category?.color || '#94a3b8' }}
                  aria-hidden="true"
                />
                <span className="truncate">
                  {category?.icon ? `${category.icon} ` : ''}
                  {row.name}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatCurrency(row.total, settings.currency)}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${Math.max(2, (row.total / max) * 100)}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
