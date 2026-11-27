const CACHE_KEY = 'hartaku.goldPrice'

/**
 * Last successful quote, kept so the portfolio still shows a value when the
 * upstream feed is down. Always paired with `fetchedAt` in the UI so a stale
 * number is never passed off as today's.
 */
export function readCachedQuote () {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function cacheQuote (quote) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(quote))
  } catch {
    // Storage blocked - the quote just will not survive a reload.
  }
}

/** A brand's last good price stands in for this long when the feed drops it. */
const CARRY_DAYS = 7

/**
 * The feed loses a dealer now and then. Rather than jump that brand to the
 * market price for a day, its last good figure is kept - marked `stale` so the
 * screen can say so - until it is a week old.
 */
function carryMissingBrands (fresh, cached) {
  if (!cached?.brands) return fresh

  const cutoff = new Date(fresh.fetchedAt || Date.now())
  cutoff.setDate(cutoff.getDate() - CARRY_DAYS)
  const oldest = cutoff.toISOString().slice(0, 10)

  const brands = { ...fresh.brands }
  for (const [brand, entry] of Object.entries(cached.brands)) {
    if (brands[brand] || !entry?.recordedDate || entry.recordedDate < oldest) continue
    brands[brand] = { ...entry, stale: true }
  }
  return { ...fresh, brands }
}

export async function fetchGoldPrice () {
  const response = await fetch('/api/gold-price', { credentials: 'omit' })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.message || 'Harga emas tidak bisa diambil.')
    error.code = payload.error
    throw error
  }

  const quote = carryMissingBrands(payload, readCachedQuote())
  cacheQuote(quote)
  return quote
}
