import { requireMethod } from './_lib/http.js'
import { FEED_BASE, FEED_SOURCES, buildQuote } from './_lib/goldQuote.js'

/**
 * Proxies the public gold price feed. Going through the server rather than
 * calling it from the browser sidesteps CORS and lets the response be cached
 * once for every visitor.
 *
 * Every dealer is fetched at once and a failing one only drops out: the brands
 * it fed fall back to the others, or to the client's last good copy.
 */
export default async function handler (req, res) {
  if (!requireMethod(req, res, 'GET')) return

  const results = await Promise.allSettled(FEED_SOURCES.map(fetchSource))
  const feeds = Object.fromEntries(
    FEED_SOURCES.map((source, index) => [
      source,
      results[index].status === 'fulfilled' ? results[index].value : null
    ])
  )

  if (!Object.values(feeds).some(Boolean)) {
    const reason = results.find((result) => result.status === 'rejected')?.reason
    return res.status(502).json({
      error: 'gold_price_unavailable',
      message: `Harga emas tidak bisa diambil: ${reason?.message || 'sumber tidak membalas'}`
    })
  }

  const quote = buildQuote(feeds)
  if (!quote) {
    return res.status(502).json({
      error: 'gold_price_unreadable',
      message: 'Sumber harga emas membalas dalam bentuk yang tidak dikenali.'
    })
  }

  // Prices move once a day; half an hour of caching is plenty.
  res.setHeader('cache-control', 'public, s-maxage=1800, stale-while-revalidate=86400')
  res.status(200).json(quote)
}

async function fetchSource (source) {
  const response = await fetch(`${FEED_BASE}/${source}`, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(10_000)
  })
  if (!response.ok) throw new Error(`sumber harga membalas ${response.status}`)

  const payload = await response.json()
  if (!Array.isArray(payload?.data)) throw new Error('sumber harga membalas tanpa data')
  return payload.data
}
