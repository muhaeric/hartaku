/**
 * Turns the community price feed into one buyback figure per gold brand.
 *
 * Buyback depends on whose bar it is far more than on the day: on the same
 * morning Aneka Logam paid ~Rp2,46 jt/gr for Antam while Hartadinata paid
 * Rp2,346 jt for its own EmasKu. So each brand is read from the dealers that
 * actually quote it, and every number has to survive validation before it is
 * trusted - the feed is a scraper, and on any given day a few of its sources
 * return zeros, swapped columns or prices from a different unit.
 *
 * The brand keys must match `GOLD_REFERENCE` in src/lib/gold.js.
 */

export const FEED_BASE = 'https://logam-mulia-api.iamutaki.workers.dev/api/prices'

/** `match` is tested against the row's materialType. */
export const BRAND_FEEDS = {
  antam: [
    { source: 'anekalogam', match: /antam/i },
    { source: 'indogold', match: /^antam$/i },
    { source: 'galeri24', match: /^antam$/i },
    { source: 'hargaemas-com', match: /^emas antam$/i },
    { source: 'hargaemas-net', match: /antam/i }
  ],
  ubs: [
    { source: 'galeri24', match: /^ubs$/i },
    { source: 'indogold', match: /^ubs$/i }
  ],
  galeri24: [{ source: 'galeri24', match: /^galeri 24$/i }],
  emasku: [{ source: 'emasku', match: /^(gold|prime)$/i }],
  indogold: [{ source: 'indogold', match: /^indogold$/i }],
  pegadaian: [{ source: 'pegadaian', match: /./ }]
}

export const FEED_SOURCES = [
  ...new Set(Object.values(BRAND_FEEDS).flat().map((feed) => feed.source))
]

/** A dealer that buys back below 80% of its own selling price is not quoting what we think. */
const MAX_SPREAD = 0.2
/** How far one brand may sit from the rest of the market before it is treated as a bad read. */
const MAX_DEVIATION = 0.15

const GRAM_UNITS = new Set(['gr', 'gram', 'g'])

/**
 * Per-gram buyback and sell for one source's rows of one brand, or null.
 *
 * Bars of one gram and up are preferred: below that the spread widens and
 * would drag the figure down. A source that only quotes smaller units - the
 * Pegadaian savings account is priced per 0.01 gram - is still used. A row
 * whose buyback is zero (the feed's way of saying "not today") is skipped, so
 * a missing 1 gram row falls back to the other weights of the same brand.
 */
export function readSource (rows, match) {
  const valid = (rows || []).filter((row) => {
    const weight = Number(row?.weight)
    const buyback = Number(row?.buybackPrice)
    const sell = Number(row?.sellPrice)

    if (row?.material !== 'gold' || !GRAM_UNITS.has(row.weightUnit)) return false
    if (!match.test(String(row.materialType || ''))) return false
    if (!(weight > 0) || !(buyback > 0)) return false
    // With a selling price beside it, a buyback has to be below it and not
    // implausibly far below it. Rows without one are judged against the market later.
    if (sell > 0 && (buyback >= sell || buyback < sell * (1 - MAX_SPREAD))) return false
    return true
  })
  if (!valid.length) return null

  const wholeGram = valid.filter((row) => Number(row.weight) >= 1)
  const used = wholeGram.length ? wholeGram : valid

  const smallest = Math.min(...used.map((row) => Number(row.weight)))
  // The dearest row at the smallest weight is the retail price; the feed also
  // carries big bars mislabelled as one gram, which are always cheaper.
  const retail = used
    .filter((row) => Number(row.weight) === smallest && Number(row.sellPrice) > 0)
    .sort((a, b) => b.sellPrice - a.sellPrice)[0]

  return {
    buybackPerGram: median(used.map((row) => row.buybackPrice / row.weight)),
    sellPerGram: retail ? retail.sellPrice / retail.weight : null,
    recordedDate: used[0].recordedDate || null,
    displayName: used[0].displayName || used[0].source || null
  }
}

/**
 * `feeds` maps a source name to its rows (or null when it failed). Returns
 * `{ brands, buybackPerGram, sellPerGram, ... }`, or null when not a single
 * brand could be read.
 *
 * `buybackPerGram` at the top is the market reference: the median across
 * brands. It values jewellery (melted down, the bar it came from no longer
 * matters) and any bar whose brand is not known.
 */
export function buildQuote (feeds, now = new Date()) {
  const brands = {}

  for (const [brand, sources] of Object.entries(BRAND_FEEDS)) {
    const reads = sources
      .map(({ source, match }) => readSource(feeds[source], match))
      .filter(Boolean)
    if (!reads.length) continue

    const sells = reads.map((read) => read.sellPerGram).filter((value) => value > 0)
    brands[brand] = {
      buybackPerGram: median(reads.map((read) => read.buybackPerGram)),
      sellPerGram: sells.length ? median(sells) : null,
      sources: reads.map((read) => read.displayName).filter(Boolean),
      recordedDate: reads.map((read) => read.recordedDate).filter(Boolean).sort().at(-1) || null
    }
  }

  // A brand far from everyone else is far more likely a broken scrape than a
  // dealer paying 15% over the market. Needs three brands to tell which is odd.
  const names = Object.keys(brands)
  if (names.length >= 3) {
    const market = median(names.map((name) => brands[name].buybackPerGram))
    for (const name of names) {
      if (Math.abs(brands[name].buybackPerGram / market - 1) > MAX_DEVIATION) delete brands[name]
    }
  }

  const kept = Object.values(brands)
  if (!kept.length) return null

  for (const entry of kept) {
    entry.buybackPerGram = Math.round(entry.buybackPerGram)
    if (entry.sellPerGram) entry.sellPerGram = Math.round(entry.sellPerGram)
  }

  const headline = brands.antam || kept[0]

  return {
    buybackPerGram: Math.round(median(kept.map((entry) => entry.buybackPerGram))),
    sellPerGram: headline.sellPerGram,
    brands,
    recordedDate: kept.map((entry) => entry.recordedDate).filter(Boolean).sort().at(-1) || null,
    fetchedAt: now.toISOString()
  }
}

export function median (values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}
