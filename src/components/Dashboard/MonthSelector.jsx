import { monthLabel, shiftMonth } from '../../lib/dates.js'
import { ChevronLeftIcon, ChevronRightIcon } from '../ui/icons.jsx'

export default function MonthSelector ({ value, options, onChange }) {
  const index = options.indexOf(value)
  // Options run newest-first, so "older" is the next index.
  const older = index === -1 ? null : options[index + 1] || null
  const newer = index <= 0 ? null : options[index - 1]

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(older || shiftMonth(value, -1))}
        aria-label="Bulan sebelumnya"
        className="tap flex items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronLeftIcon />
      </button>

      <label className="sr-only" htmlFor="month-select">
        Pilih bulan
      </label>
      <select
        id="month-select"
        className="field flex-1 text-center font-semibold"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((monthKey) => (
          <option key={monthKey} value={monthKey}>
            {monthLabel(monthKey)}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange(newer || shiftMonth(value, 1))}
        aria-label="Bulan berikutnya"
        className="tap flex items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronRightIcon />
      </button>
    </div>
  )
}
