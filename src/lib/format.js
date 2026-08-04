import { CURRENCIES, GRAM_DECIMALS } from './constants.js'

export function formatGrams (grams) {
  return `${new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: GRAM_DECIMALS
  }).format(Number(grams) || 0)} gr`
}

export function formatPercent (value) {
  if (value === null || !Number.isFinite(value)) return '—'

  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Math.abs(value))

  return `${value >= 0 ? '+' : '−'}${formatted}%`
}

function currencyConfig (code) {
  return CURRENCIES.find((item) => item.code === code) || CURRENCIES[0]
}

export function formatCurrency (amount, currencyCode = 'IDR', { compact = false } = {}) {
  const config = currencyConfig(currencyCode)
  const value = Number(amount) || 0

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
    notation: compact ? 'compact' : 'standard'
  }).format(value)
}

export function formatAmountInput (raw, currencyCode = 'IDR') {
  const config = currencyConfig(currencyCode)
  const value = Number(raw)
  if (!Number.isFinite(value)) return ''

  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: config.fractionDigits
  }).format(value)
}

/** Accepts "50.000", "50,000", "50000.50" and returns a number (NaN if unusable). */
export function parseAmount (input) {
  if (typeof input === 'number') return input

  const cleaned = String(input ?? '').trim().replace(/[^\d.,-]/g, '')
  if (!cleaned) return NaN

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const decimalSep = lastComma > lastDot ? ',' : lastDot > lastComma ? '.' : ''

  let normalized = cleaned
  if (decimalSep) {
    const thousandSep = decimalSep === ',' ? '.' : ','
    normalized = cleaned.split(thousandSep).join('')
    // Only treat the separator as decimal when it leaves 1-2 digits behind it.
    const tail = normalized.slice(normalized.lastIndexOf(decimalSep) + 1)
    normalized =
      tail.length > 0 && tail.length <= 2
        ? normalized.replace(decimalSep, '.')
        : normalized.split(decimalSep).join('')
  }

  return Number(normalized)
}

export function formatDate (isoDate, dateFormat = 'DD/MM/YYYY') {
  if (!isoDate) return ''

  const [year, month, day] = String(isoDate).split('-')
  if (!year || !month || !day) return isoDate

  if (dateFormat === 'MM/DD/YYYY') return `${month}/${day}/${year}`
  if (dateFormat === 'YYYY-MM-DD') return `${year}-${month}-${day}`
  return `${day}/${month}/${year}`
}

/** "Hari ini" / "Kemarin" read faster than a date, and are shorter. */
export function relativeDayLabel (isoDate, dateFormat = 'DD/MM/YYYY') {
  if (!isoDate) return ''

  const today = new Date()
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  if (isoDate === todayIso) return 'Hari ini'

  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(yesterday.getDate()).padStart(2, '0')}`

  if (isoDate === yesterdayIso) return 'Kemarin'

  return formatDate(isoDate, dateFormat)
}

export function formatDayLabel (isoDate, locale = 'id-ID') {
  if (!isoDate) return ''

  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  })
}
