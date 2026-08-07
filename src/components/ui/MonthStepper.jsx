import { useId, useMemo } from 'react'
import { ALL_MONTHS, monthLabel, monthLabelShort, shiftMonth } from '../../lib/dates.js'
import { ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'

const ALL_LABEL = 'Semua periode'

/**
 * Month picker built around the move people actually make - one month back, one
 * month forward. Reaching for a dropdown to answer "and last month?" is three
 * taps and a scan of a 16-item list; here it is one tap.
 *
 * The label in the middle is still the native select, invisible on top of the
 * text, so jumping a year back stays possible without a second control.
 *
 * "Semua periode" lives in that select rather than beside the control, because
 * it answers the same question the months do - which slice of time is this - and
 * a separate toggle would let it disagree with them. While it is chosen the
 * arrows go quiet: there is no month either side of every month, and stepping
 * from it would have to invent a starting point.
 */
export default function MonthStepper ({ value, options, onChange, className = '' }) {
  const id = useId()
  const all = value === ALL_MONTHS

  // The current month is always offered, even if it fell outside the window the
  // caller built - otherwise stepping into it would blank the native select.
  const months = useMemo(
    () => [...new Set([...options, ...(value === ALL_MONTHS ? [] : [value])])].sort().reverse(),
    [options, value]
  )

  const oldest = months[months.length - 1]
  const newest = months[0]

  const previous = all ? null : shiftMonth(value, -1)
  const next = all ? null : shiftMonth(value, 1)

  return (
    <div
      className={`flex h-9 items-center rounded-control border border-hairline bg-surface ${className}`}
    >
      <Step
        label="Bulan sebelumnya"
        disabled={all || previous < oldest}
        onClick={() => onChange(previous)}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Step>

      <div className="relative min-w-0 flex-1">
        {/* Abbreviated so "September" cannot be clipped between the arrows;
            the open picker still spells every month out in full. */}
        <span className="block truncate text-center text-body font-medium">
          {all ? ALL_LABEL : monthLabelShort(value)}
        </span>
        <label className="sr-only" htmlFor={id}>
          Pilih periode
        </label>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          <option value={ALL_MONTHS}>{ALL_LABEL}</option>
          {months.map((monthKey) => (
            <option key={monthKey} value={monthKey}>
              {monthLabel(monthKey)}
            </option>
          ))}
        </select>
      </div>

      <Step
        label="Bulan berikutnya"
        disabled={all || next > newest}
        onClick={() => onChange(next)}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Step>
    </div>
  )
}

function Step ({ label, disabled, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-full w-9 shrink-0 items-center justify-center rounded-control text-subtitle transition disabled:opacity-30 enabled:hover:text-ink"
    >
      {children}
    </button>
  )
}
