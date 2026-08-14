import { useSettings } from '../../context/SettingsContext.jsx'
import { monthLabel } from '../../lib/dates.js'
import { formatCompactNumber, formatCurrency } from '../../lib/format.js'

const WIDTH = 320
const HEIGHT = 132
/** Room for a value label above the tallest point and month names below. */
const PAD_TOP = 20
const PAD_BOTTOM = 26
/** Half a label's width, so the first and last ones do not run off the edge. */
const PAD_X = 28

/**
 * One category across the months either side of the one being read.
 *
 * Zero-based, unlike the net worth chart: this is a quantity, so a floor that
 * floats would make a quiet month look like a cheap one only by comparison.
 * Every point is labelled rather than waiting for a hover, because the question
 * this answers - "is this month unusual for me?" - is a comparison, and a
 * comparison needs the numbers side by side.
 *
 * Tapping a point moves the whole page to that month; the chart is the month
 * picker as much as it is the picture.
 */
export default function CategoryTrend ({ series, selected, color, onSelect }) {
  const { settings } = useSettings()
  const money = (value) => formatCurrency(value, settings.currency)
  const short = (value) => formatCompactNumber(value, settings.currency)

  const peak = Math.max(...series.map((point) => point.total), 0)
  const span = peak || 1

  const points = series.map((point, index) => ({
    ...point,
    x:
      series.length === 1
        ? WIDTH / 2
        : PAD_X + (index / (series.length - 1)) * (WIDTH - PAD_X * 2),
    y: HEIGHT - PAD_BOTTOM - (point.total / span) * (HEIGHT - PAD_TOP - PAD_BOTTOM)
  }))

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full select-none"
      role="img"
      aria-label={`Pengeluaran per bulan: ${series
        .map((point) => `${monthLabel(point.key)} ${money(point.total)}`)
        .join(', ')}`}
    >
      {/* The floor is drawn, the ceiling is not: zero is a real line here. */}
      <line
        x1="0"
        x2={WIDTH}
        y1={HEIGHT - PAD_BOTTOM}
        y2={HEIGHT - PAD_BOTTOM}
        strokeWidth="1"
        className="stroke-hairline"
      />

      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((point) => {
        const active = point.key === selected

        return (
          <g key={point.key}>
            <text
              x={point.x}
              y={point.y - 8}
              textAnchor="middle"
              className={`text-[9px] ${active ? 'fill-ink font-semibold' : 'fill-subtitle'}`}
            >
              {short(point.total)}
            </text>

            <circle
              cx={point.x}
              cy={point.y}
              r={active ? 5 : 3.5}
              fill={active ? color : 'rgb(var(--surface))'}
              stroke={color}
              strokeWidth="2"
            />

            <text
              x={point.x}
              y={HEIGHT - 8}
              textAnchor="middle"
              className={`text-[10px] ${active ? 'fill-ink font-semibold' : 'fill-subtitle'}`}
            >
              {monthLabel(point.key).slice(0, 3)}
            </text>

            {/* The tap target is a column, not the 5px dot it moves to. */}
            <rect
              x={point.x - (WIDTH - PAD_X * 2) / (series.length * 2)}
              y="0"
              width={(WIDTH - PAD_X * 2) / series.length}
              height={HEIGHT}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSelect(point.key)}
            >
              <title>{`${monthLabel(point.key)} · ${money(point.total)}`}</title>
            </rect>
          </g>
        )
      })}
    </svg>
  )
}
