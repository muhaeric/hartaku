import { useEffect, useMemo, useState } from 'react'
import { monthKeyOf, monthLabel, shiftMonth, todayIso } from '../../lib/dates.js'
import Sheet from './Sheet.jsx'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.jsx'

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

/**
 * App-owned date control. The visible field is a regular button, avoiding the
 * intrinsic width and text alignment that Safari applies to input[type=date].
 * The calendar lives in the same bottom-sheet pattern as the other pickers.
 */
export default function DatePicker ({
  id,
  value,
  max = '',
  invalid = false,
  onChange,
  label = 'Pilih tanggal',
  placeholder = 'Pilih tanggal…',
  className = ''
}) {
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(monthKeyOf(value || todayIso()))

  useEffect(() => {
    if (open) setVisibleMonth(monthKeyOf(value || todayIso()))
  }, [open, value])

  const cells = useMemo(() => calendarCells(visibleMonth), [visibleMonth])
  const maxMonth = monthKeyOf(max)
  const canGoNext = !maxMonth || shiftMonth(visibleMonth, 1) <= maxMonth

  const select = (date) => {
    if (max && date > max) return
    onChange(date)
    setOpen(false)
  }

  return (
    <>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`field relative flex items-center justify-center overflow-hidden px-2.5 py-0 text-center ${
          invalid ? 'field-error' : ''
        } ${className}`}
      >
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-7">
          <span className={`block max-w-full truncate whitespace-nowrap ${value ? 'text-ink' : 'text-subtitle/70'}`}>
            {formatDate(value) || placeholder}
          </span>
        </span>
        <CalendarIcon className="absolute right-2.5 h-4 w-4 text-subtitle" />
      </button>

      <Sheet open={open} title={label} onClose={() => setOpen(false)}>
        <div className="space-y-gap-normal">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
              className="tap flex items-center justify-center rounded-control text-subtitle transition hover:bg-tint/5"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <p className="text-body font-semibold capitalize">{monthLabel(visibleMonth)}</p>

            <button
              type="button"
              aria-label="Bulan berikutnya"
              disabled={!canGoNext}
              onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
              className="tap flex items-center justify-center rounded-control text-subtitle transition hover:bg-tint/5 disabled:opacity-30"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-medium leading-4 text-subtitle">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              if (!date) return <span key={`blank-${index}`} className="h-9" />

              const selected = date === value
              const today = date === todayIso()
              const disabled = Boolean(max && date > max)

              return (
                <button
                  key={date}
                  type="button"
                  disabled={disabled}
                  aria-label={formatDateLong(date)}
                  aria-pressed={selected}
                  onClick={() => select(date)}
                  className={`h-9 rounded-control text-caption font-medium transition disabled:opacity-25 ${
                    selected
                      ? 'bg-brand text-brand-fg'
                      : today
                        ? 'ring-1 ring-inset ring-brand text-brand'
                        : 'text-ink hover:bg-tint/5'
                  }`}
                >
                  {Number(date.slice(-2))}
                </button>
              )
            })}
          </div>

          {(!max || todayIso() <= max) && value !== todayIso() && (
            <button
              type="button"
              onClick={() => select(todayIso())}
              className="w-full rounded-control py-2 text-caption font-semibold text-brand transition hover:bg-brand-soft"
            >
              Pilih hari ini
            </button>
          )}
        </div>
      </Sheet>
    </>
  )
}

function calendarCells (monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const days = new Date(year, month, 0).getDate()
  const result = Array(offset).fill(null)

  for (let day = 1; day <= days; day += 1) {
    result.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  while (result.length % 7) result.push(null)

  return result
}

function formatDate (isoDate) {
  const date = fromIso(isoDate)
  return date?.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) || ''
}

function formatDateLong (isoDate) {
  const date = fromIso(isoDate)
  return date?.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) || isoDate
}

function fromIso (isoDate) {
  const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(date.getTime()) ? null : date
}
