import { useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { formatCurrency } from '../../lib/format.js'

/** Neutral slot for the folded tail - it is a remainder, not a category. */
const REST_COLOR = '#94a3b8'
const REST_LABEL = 'Lainnya'

const SIZE = 160
const RADIUS = 62
const THICKNESS = 18
/* White doing the separating, so two categories that happen to share a colour
   still read as two slices without a stroke drawn around either. */
const GAP = 2

const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/**
 * Where the month's money went, as part-to-whole.
 *
 * The tail is folded into one "Lainnya" slice rather than drawn: past six
 * segments the arcs get too thin to compare and the colours start repeating.
 * Every slice is listed underneath with its share and its amount, so nothing
 * here is reachable only by hovering - the ring is the glance, the list is the
 * answer.
 */
export default function TopExpenses ({ breakdown, categories, limit = 5, unit = 'kategori' }) {
  const { settings } = useSettings()
  const [active, setActive] = useState(null)

  const money = (value, compact = false) => formatCurrency(value, settings.currency, { compact })

  const { slices, total } = useMemo(() => {
    // Anything with a name, a colour and an icon works here - the ring does not
    // care whether it is slicing categories or accounts, only that each slice
    // owns exactly one whole of the total.
    const byName = new Map(categories.map((category) => [category.name, category]))
    const sum = breakdown.reduce((carry, row) => carry + row.total, 0)

    const head = breakdown.slice(0, limit).map((row) => ({
      name: row.name,
      total: row.total,
      color: byName.get(row.name)?.color || REST_COLOR,
      icon: byName.get(row.name)?.icon || ''
    }))

    const restTotal = breakdown.slice(limit).reduce((carry, row) => carry + row.total, 0)
    if (restTotal > 0) {
      head.push({
        name: REST_LABEL,
        total: restTotal,
        color: REST_COLOR,
        icon: '',
        count: breakdown.length - limit
      })
    }

    return { slices: head, total: sum }
  }, [breakdown, categories, limit])

  if (!slices.length) {
    return (
      <p className="px-page py-4 text-caption text-subtitle">
        Belum ada pengeluaran di bulan ini.
      </p>
    )
  }

  const share = (value) => (total ? (value / total) * 100 : 0)
  const percentLabel = (value) => {
    const percent = share(value)
    return percent > 0 && percent < 1 ? '<1%' : `${Math.round(percent)}%`
  }

  // One category filling the ring needs no gap - a gap there is just a notch.
  const gap = slices.length > 1 ? GAP : 0
  let offset = 0

  const arcs = slices.map((slice) => {
    const length = Math.max(1, (share(slice.total) / 100) * CIRCUMFERENCE - gap)
    const arc = { ...slice, length, offset }
    offset += (share(slice.total) / 100) * CIRCUMFERENCE
    return arc
  })

  const focused = active === null ? null : slices[active]

  return (
    <div className="px-page py-3">
      <div className="relative mx-auto w-[160px]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full"
          role="img"
          aria-label={`Pengeluaran per ${unit}: ${slices
            .map((slice) => `${slice.name} ${percentLabel(slice.total)}`)
            .join(', ')}`}
        >
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map((arc, index) => (
              <circle
                key={arc.name}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={THICKNESS}
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                strokeDashoffset={-arc.offset}
                className="transition-opacity"
                opacity={active === null || active === index ? 1 : 0.3}
                /* The gaps in the dash pattern are unpainted, so only the drawn
                   arc takes the pointer - the slice is its own hit area. */
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
              />
            ))}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <span className="w-full truncate text-[11px] leading-4 text-subtitle">
            {focused ? focused.name : 'Total'}
          </span>
          <span className="text-card-title font-semibold">
            {money(focused ? focused.total : total, true)}
          </span>
          {focused && (
            <span className="text-[11px] leading-4 text-subtitle">
              {percentLabel(focused.total)}
            </span>
          )}
        </div>
      </div>

      <ul className="mt-3 space-y-0.5">
        {slices.map((slice, index) => (
          <li key={slice.name}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-[10px] px-1 py-1 text-left transition hover:bg-tint/[0.04]"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((current) => (current === index ? null : index))}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-tint/15"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-caption">
                {slice.icon ? `${slice.icon} ` : ''}
                {slice.name}
                {slice.count ? (
                  <span className="text-subtitle">
                    {' '}
                    · {slice.count} {unit}
                  </span>
                ) : null}
              </span>
              <span className="amount w-10 shrink-0 text-right text-caption text-subtitle">
                {percentLabel(slice.total)}
              </span>
              <span className="amount shrink-0 text-caption font-medium">
                {money(slice.total)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
