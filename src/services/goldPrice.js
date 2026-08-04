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

export async function fetchGoldPrice () {
  const response = await fetch('/api/gold-price', { credentials: 'omit' })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload.message || 'Harga emas tidak bisa diambil.')
    error.code = payload.error
    throw error
  }

  cacheQuote(payload)
  return payload
}
