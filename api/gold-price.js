import { requireMethod } from './_lib/http.js'

const SOURCE_URL = 'https://logam-mulia-api.iamutaki.workers.dev/api/prices/anekalogam'

/**
 * Proxies the public gold price feed. Going through the server rather than
 * calling it from the browser sidesteps CORS and lets the response be cached
 * once for every visitor.
 */
export default async function handler (req, res) {
  if (!requireMethod(req, res, 'GET')) return

  let payload
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) throw new Error(`sumber harga membalas ${response.status}`)
    payload = await response.json()
  } catch (err) {
    return res.status(502).json({
      error: 'gold_price_unavailable',
      message: `Harga emas tidak bisa diambil: ${err.message}`
    })
  }

  const quote = derivePerGram(payload?.data)
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

/**
 * Buyback per gram is near-identical across weights, so the median is a stable
 * read even if one row is malformed. Sub-gram bars are excluded - their spread
 * is far wider and would drag the figure down.
 */
function derivePerGram (items) {
  if (!Array.isArray(items)) return null

  const usable = items.filter(
    (item) =>
      item?.material === 'gold' &&
      item.weightUnit === 'gr' &&
      Number(item.weight) >= 1 &&
      Number(item.buybackPrice) > 0
  )
  if (!usable.length) return null

  const buybackPerGram = median(usable.map((item) => item.buybackPrice / item.weight))

  /*
   * The headline "beli hari ini" figure is the retail 1 gram bar. Picking the
   * dearest one-gram row rather than the first is deliberate: the feed also
   * carries large-bar rows mislabelled as weight 1 (a 100 gram bar quoted per
   * gram), and those are always cheaper per gram than true retail.
   */
  const oneGram =
    usable
      .filter((item) => Number(item.weight) === 1 && Number(item.sellPrice) > 0)
      .sort((a, b) => b.sellPrice - a.sellPrice)[0] || usable[0]

  return {
    buybackPerGram: Math.round(buybackPerGram),
    sellPerGram: Math.round(oneGram.sellPrice / oneGram.weight),
    materialType: oneGram.materialType || null,
    source: oneGram.displayName || oneGram.source || 'anekalogam',
    sourceUrl: oneGram.urlHomepage || null,
    recordedDate: oneGram.recordedDate || null,
    fetchedAt: new Date().toISOString()
  }
}

function median (values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}
