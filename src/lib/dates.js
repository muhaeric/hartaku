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

/**
 * Months to offer in the selector: everything that has data, plus the last 12
 * months and the next 3 so future-dated planning still works.
 */
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
