import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../context/SettingsContext.jsx'
import { isImageIcon } from '../../lib/accountIcon.js'
import { formatCurrency } from '../../lib/format.js'

/** Fallback for a slice with no record behind it, like "Tanpa kategori". */
const FALLBACK_COLOR = '#94a3b8'

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
 * Every row that spent money gets its own slice. The five largest lines are
 * visible first and the rest remain available behind an explicit expansion;
 * none are folded into a vague "Lainnya" remainder. Past the palette's eight
 * hues the colours repeat, so the dot is a locator for the ring rather than a
 * key - every slice is still named when its row is visible.
 *
 * `linkFor` turns a row into a link when the caller has somewhere for it to go;
 * without it the row stays a button that only highlights its slice.
 */
export default function TopExpenses ({
  breakdown,
  categories,
  unit = 'kategori',
  linkFor,
  totalLabel = 'Total',
  emptyMessage = 'Belum ada pengeluaran di bulan ini.',
  limit = 5,
  resetSignal = 0
}) {
  const { settings } = useSettings()
  const [active, setActive] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
    setActive(null)
  }, [resetSignal])

  const money = (value, compact = false) => formatCurrency(value, settings.currency, { compact })

  const { slices, total } = useMemo(() => {
    // Anything with a name, a colour and an icon works here - the ring does not
    // care whether it is slicing categories or accounts, only that each slice
    // owns exactly one whole of the total.
    const byName = new Map(categories.map((category) => [category.name, category]))
    const sum = breakdown.reduce((carry, row) => carry + row.total, 0)

    const head = breakdown.map((row) => {
      const item = byName.get(row.name)

      return {
        name: row.name,
        total: row.total,
        color: item?.color || FALLBACK_COLOR,
        /*
         * An account's icon can be an uploaded picture rather than an emoji,
         * and both live in the same field. Printed into a text label a data URL
         * does not fail loudly - it renders as several hundred characters of
         * base64 and pushes the name out of its own row. The colour dot beside
         * it already identifies the slice, so a picture simply has no glyph
         * here.
         */
        icon: isImageIcon(item?.icon) ? '' : item?.icon || ''
      }
    })

    return { slices: head, total: sum }
  }, [breakdown, categories])

  if (!slices.length) {
    return (
      <p className="px-page py-4 text-caption text-subtitle">
        {emptyMessage}
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
  const shown = expanded ? slices : slices.slice(0, limit)
  const hidden = Math.max(0, slices.length - limit)

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
            {focused ? focused.name : totalLabel}
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
        {shown.map((slice, index) => {
          const to = linkFor?.(slice.name) || null

          const highlight = {
            onMouseEnter: () => setActive(index),
            onMouseLeave: () => setActive(null),
            onFocus: () => setActive(index),
            onBlur: () => setActive(null)
          }

          const body = (
            <>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-tint/15"
                style={{ backgroundColor: slice.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-caption">
                {slice.icon ? `${slice.icon} ` : ''}
                {slice.name}
              </span>
              <span className="amount w-10 shrink-0 text-right text-caption text-subtitle">
                {percentLabel(slice.total)}
              </span>
              <span className="amount shrink-0 text-caption font-medium">
                {money(slice.total)}
              </span>
            </>
          )

          const shared =
            'flex w-full items-center gap-2 rounded-[10px] px-1 py-1 text-left transition hover:bg-tint/[0.04]'

          return (
            <li key={slice.name}>
              {to ? (
                <Link to={to} className={shared} {...highlight}>
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  className={shared}
                  {...highlight}
                  onClick={() => setActive((current) => (current === index ? null : index))}
                >
                  {body}
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((value) => !value)
            setActive(null)
          }}
          className="mt-2 w-full rounded-[10px] py-1.5 text-center text-caption font-semibold text-brand transition hover:bg-brand-soft"
        >
          {expanded ? 'Tampilkan lebih sedikit' : `Lihat ${hidden} ${unit} lainnya`}
        </button>
      )}
    </div>
  )
}
