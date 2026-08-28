import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/**
 * Spending per tag, as ranked bars rather than a ring.
 *
 * Categories partition the month - every expense carries exactly one, so the
 * slices of a ring genuinely add up to the whole and part-to-whole is honest.
 * Tags do not partition anything: a transaction carries up to eight and counts
 * in full under every one of them, so these rows can total more than the month
 * actually spent. A pie here would be a straightforward lie about what the
 * numbers mean, so the bars are scaled against the largest tag - a ranking,
 * which is what this is - and the footnote states the overlap outright rather
 * than leaving it to be discovered by someone adding the column up.
 */
export default function TagSpending ({ breakdown, limit = 5, resetSignal = 0 }) {
  const { settings } = useSettings()
  const [expanded, setExpanded] = useState(false)
  const money = (value) => formatCurrency(value, settings.currency)

  useEffect(() => setExpanded(false), [resetSignal])

  const { rows, tagged, untagged } = breakdown
  const shown = expanded ? rows : rows.slice(0, limit)
  const hidden = Math.max(0, rows.length - limit)

  if (!rows.length) {
    return (
      <p className="px-page py-4 text-caption text-subtitle">
        {untagged > 0
          ? 'Belum ada pengeluaran bertag di bulan ini. Tambahkan tag di form transaksi untuk melihat rinciannya di sini.'
          : 'Belum ada pengeluaran di bulan ini.'}
      </p>
    )
  }

  const largest = shown[0].total

  return (
    <div className="px-page py-3">
      <ul className="space-y-2">
        {shown.map((row) => (
          <li key={row.name}>
            <Link
              to={`/transactions?tag=${encodeURIComponent(row.name)}`}
              className="-mx-1 block rounded-[10px] px-1 py-1 transition hover:bg-tint/[0.04]"
            >
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-caption">#{row.name}</span>
                <span className="amount shrink-0 text-caption font-medium">{money(row.total)}</span>
              </div>
              {/* Scaled against the biggest tag, not against the month: these do
                  not sum to a whole, so a share of one would be meaningless. */}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-tint/[0.08]">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(2, (row.total / largest) * 100)}%` }}
                />
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 w-full rounded-[10px] py-1.5 text-center text-caption font-semibold text-brand transition hover:bg-brand-soft"
        >
          {expanded ? 'Tampilkan lebih sedikit' : `Lihat ${hidden} tag lainnya`}
        </button>
      )}

      <p className="hint">
        {!expanded && hidden > 0 && `${hidden} tag lain belum ditampilkan. `}
        {money(tagged)} pengeluaran bertag
        {untagged > 0 && `, ${money(untagged)} tanpa tag`}. Satu transaksi bisa punya beberapa
        tag, jadi angka di atas bisa berjumlah lebih besar daripada totalnya.
      </p>
    </div>
  )
}
