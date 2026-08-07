/** Month keys are `YYYY-MM`; transaction dates are `YYYY-MM-DD`. */

export function todayIso () {
  const now = new Date()
  return toIso(now)
}

export function toIso (date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthKeyOf (isoDate) {
  return String(isoDate || '').slice(0, 7)
}

export function currentMonthKey () {
  return monthKeyOf(todayIso())
}

export function shiftMonth (monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel (monthKey, locale = 'id-ID') {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

/** "Agu 2026" - for controls narrow enough that "September" would be clipped. */
export function monthLabelShort (monthKey, locale = 'id-ID') {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Months to offer in the selector: everything that has data, plus the last 12
 * months and the next 3 so future-dated planning still works.
 */
/**
 * Stands in for a month key when the period filter is off entirely.
 *
 * A sentinel rather than an empty string: month keys are compared with `<` and
 * `>` all over this file, and '' sorts below every real key, so an empty value
 * would quietly look like the oldest month ever recorded rather than like no
 * month at all. 'all' sorts above them, and reads as itself in a debugger.
 */
export const ALL_MONTHS = 'all'

export function buildMonthOptions (monthKeysWithData = []) {
  const keys = new Set(monthKeysWithData.filter(Boolean))
  const anchor = currentMonthKey()

  for (let offset = -12; offset <= 3; offset += 1) {
    keys.add(shiftMonth(anchor, offset))
  }

  return [...keys].sort().reverse()
}

export function isFutureDate (isoDate) {
  return Boolean(isoDate) && isoDate > todayIso()
}

export function shiftDays (isoDate, delta) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return toIso(new Date(year, month - 1, day + delta))
}

/** Monday-based, matching how the week is counted in Indonesia. */
export function startOfWeek (isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return toIso(new Date(year, month - 1, day - ((date.getDay() + 6) % 7)))
}

/**
 * The three ways a history can be bucketed, each described once so the chart
 * that draws them holds no calendar logic of its own.
 *
 * Keys are sortable strings in every period - `YYYY-MM-DD` for the Monday that
 * starts a week, `YYYY-MM`, `YYYY` - so a plain string compare is also a
 * chronological one.
 */
export const PERIODS = {
  week: {
    label: 'Minggu',
    keyOf: (isoDate) => startOfWeek(isoDate),
    next: (key) => shiftDays(key, 7),
    tick: (key) => shortDate(key),
    title: (key) => `Pekan ${shortDate(key)} ${key.slice(0, 4)}`
  },
  month: {
    label: 'Bulan',
    keyOf: (isoDate) => isoDate.slice(0, 7),
    next: (key) => shiftMonth(key, 1),
    tick: (key) => shortMonth(key),
    title: (key) => monthLabel(key)
  },
  year: {
    label: 'Tahun',
    keyOf: (isoDate) => isoDate.slice(0, 4),
    next: (key) => String(Number(key) + 1),
    tick: (key) => key,
    title: (key) => key
  }
}

function shortDate (isoDate, locale = 'id-ID') {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short'
  })
}

/** Carries the year: a monthly axis spans one, so "Agu" alone is ambiguous. */
function shortMonth (monthKey, locale = 'id-ID') {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'short',
    year: '2-digit'
  })
}
