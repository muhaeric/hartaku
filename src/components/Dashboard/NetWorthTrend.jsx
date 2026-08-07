import { useMemo, useState } from 'react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { PERIODS } from '../../lib/dates.js'
import { formatCurrency, formatPercent } from '../../lib/format.js'
import { netWorthHistory } from '../../lib/summary.js'
import SegmentedControl from '../ui/SegmentedControl.jsx'

/** Enough points to show a shape, few enough that each is still tappable. */
const POINTS = { week: 12, month: 12, year: 8 }

const PERIOD_OPTIONS = Object.entries(PERIODS).map(([value, period]) => ({
  value,
  label: period.label
}))

const WIDTH = 320
const HEIGHT = 96
const PAD_X = 6
const PAD_Y = 10

/**
 * How the total got to where it is.
 *
 * A single series, so no legend - the heading it sits under names it. The scale
 * is not zero-based (a net worth chart pinned to zero is a flat line), which is
 * why this draws a line rather than a filled area: a fill from a non-zero floor
 * reads as a quantity when it is only a shape.
 */
export default function NetWorthTrend ({ accounts, transactions, goldLots, holdsGold }) {
  const { settings } = useSettings()
  const [period, setPeriod] = useState('month')
  const [active, setActive] = useState(null)
  const [showTable, setShowTable] = useState(false)

  const series = useMemo(
    () => netWorthHistory(accounts, transactions, goldLots, period, POINTS[period]),
    [accounts, transactions, goldLots, period]
  )

  const money = (value, compact = false) => formatCurrency(value, settings.currency, { compact })
  const bucket = PERIODS[period]

  const geometry = useMemo(() => {
    if (series.length < 2) return null

    const totals = series.map((point) => point.total)
    const min = Math.min(...totals)
    const max = Math.max(...totals)
    const span = max - min || Math.abs(max) || 1

    return series.map((point, index) => ({
      x: PAD_X + (index / (series.length - 1)) * (WIDTH - PAD_X * 2),
      y: HEIGHT - PAD_Y - ((point.total - min) / span) * (HEIGHT - PAD_Y * 2)
    }))
  }, [series])

  if (!series.length) return null

  const index = active === null ? series.length - 1 : Math.min(active, series.length - 1)
  const point = series[index]
  const first = series[0]
  const change = point.total - first.total
  const changePct = first.total > 0 ? (change / first.total) * 100 : null

  const pick = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    setActive(Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1)))))
  }

  const step = (delta) =>
    setActive(Math.max(0, Math.min(series.length - 1, index + delta)))

  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <p className="text-caption font-medium text-subtitle">
        Pertumbuhan aset
      </p>

      {/* Full width on its own row: squeezed beside the label, "Minggu" clips. */}
      <SegmentedControl
        label="Rentang riwayat"
        className="mt-1.5"
        value={period}
        options={PERIOD_OPTIONS}
        onChange={(next) => {
          setPeriod(next)
          setActive(null)
        }}
      />

      {geometry ? (
        <>
          {/* Positioning context for the tooltip, which is HTML rather than SVG
              text so it can use the theme's surface tokens and never render at
              the chart's stretched aspect ratio. */}
          <div className="relative">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="mt-2 w-full select-none"
              role="img"
              aria-label={`Riwayat total aset per ${bucket.label.toLowerCase()}, ${bucket.title(
                first.key
              )} sampai ${bucket.title(series[series.length - 1].key)}`}
              tabIndex={0}
              onPointerDown={pick}
              onPointerMove={(event) => event.buttons && pick(event)}
              onMouseMove={pick}
              onMouseLeave={() => setActive(null)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') step(-1)
                else if (event.key === 'ArrowRight') step(1)
                else return
                event.preventDefault()
              }}
            >
              {/* Hairlines at the top and bottom of the range, one step off the
                  surface - enough to read the slope against, no more. */}
              <line
                x1="0"
                x2={WIDTH}
                y1={PAD_Y}
                y2={PAD_Y}
                strokeWidth="1"
                className="stroke-hairline"
              />
              <line
                x1="0"
                x2={WIDTH}
                y1={HEIGHT - PAD_Y}
                y2={HEIGHT - PAD_Y}
                strokeWidth="1"
                className="stroke-hairline"
              />

              {/* Only while something is being read: a crosshair sitting on the
                  last point by default reads as a marker that means something. */}
              {active !== null && (
                <line
                  x1={geometry[index].x}
                  x2={geometry[index].x}
                  y1={PAD_Y - 4}
                  y2={HEIGHT - PAD_Y + 4}
                  strokeWidth="1"
                  className="stroke-hairline"
                />
              )}

              <polyline
                points={geometry.map((spot) => `${spot.x},${spot.y}`).join(' ')}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="stroke-brand"
              />

              <circle
                cx={geometry[index].x}
                cy={geometry[index].y}
                r="4"
                strokeWidth="2"
                className="fill-brand stroke-surface"
              />
            </svg>

            {/* Clamped to 12-88% of the width so the ends of the range still put
                a whole box on screen rather than half of one past the edge, and
                inert so it cannot swallow the drag it is reporting on. */}
            {active !== null && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-control border border-hairline bg-surface px-2 py-1 shadow-lg"
                style={{
                  left: `${Math.min(88, Math.max(12, (geometry[index].x / WIDTH) * 100))}%`,
                  top: `${(geometry[index].y / HEIGHT) * 100}%`,
                  marginTop: '-10px'
                }}
              >
                <p className="whitespace-nowrap text-[11px] leading-4 text-subtitle">
                  {bucket.title(point.key)}
                </p>
                <p className="amount whitespace-nowrap text-caption font-semibold">
                  {money(point.total)}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between gap-3 text-[11px] leading-4 text-subtitle">
            <span>{bucket.tick(first.key)}</span>
            <span>{bucket.tick(series[series.length - 1].key)}</span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-caption text-subtitle">
          Riwayatnya baru satu periode — datanya belum cukup untuk digambar.
        </p>
      )}

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] leading-4 text-subtitle">
            {bucket.title(point.key)}
          </p>
          <p className="amount text-amount font-semibold">{money(point.total)}</p>
        </div>

        {series.length > 1 && index > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-[11px] leading-4 text-subtitle">
              sejak {bucket.tick(first.key)}
            </p>
            <p
              className={`amount text-caption font-semibold ${
                change >= 0 ? 'text-income' : 'text-expense'
              }`}
            >
              {change >= 0 ? '+' : '−'}
              {money(Math.abs(change), true)}
              {changePct === null ? '' : ` (${formatPercent(changePct)})`}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowTable((value) => !value)}
        className="mt-2 text-caption font-semibold text-brand"
      >
        {showTable ? 'Sembunyikan angkanya' : 'Lihat angkanya'}
      </button>

      {showTable && (
        <ul className="mt-1.5 divide-hairline rounded-control border border-hairline">
          {[...series].reverse().map((row) => (
            <li key={row.key} className="px-2.5 py-1.5 text-caption">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-subtitle">{bucket.title(row.key)}</span>
                <span className="amount shrink-0 font-medium">{money(row.total)}</span>
              </div>

              {/*
                The step against the period before is not the same number as
                income minus spending to its right: a transfer into an account
                that has since been deleted moves the total while being neither.
                They are labelled apart so that neither has to lie.
              */}
              <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px] leading-4">
                <span
                  className={`amount shrink-0 font-semibold ${
                    row.change === null
                      ? 'text-subtitle'
                      : row.change >= 0
                        ? 'text-income'
                        : 'text-expense'
                  }`}
                >
                  {formatPercent(row.changePct)}
                </span>

                <span className="amount min-w-0 truncate text-right text-subtitle">
                  <span className="text-income">{money(row.income, true)}</span> masuk ·{' '}
                  <span className="text-expense">{money(row.expense, true)}</span> keluar ·{' '}
                  {row.net >= 0 ? '+' : '−'}
                  {money(Math.abs(row.net), true)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {holdsGold && (
        <p className="hint">
          Emas dihitung sebesar modalnya di grafik ini — harga hari ini tidak berlaku surut untuk
          bulan-bulan lalu, jadi angka terakhirnya lebih rendah dari total di atas sebesar
          keuntungan emas yang belum direalisasi.
        </p>
      )}
    </div>
  )
}
