/**
 * Gold comes in two shapes: bullion (logam mulia), always 24 karat, and
 * jewellery, whose karat varies from piece to piece. The price feed quotes
 * 24 karat bullion, so every lot is valued by the pure gold it contains -
 * grams × karat / 24 - and a 17K ring weighing 5 grams counts as ~3.5 grams
 * of the metal the quote is for.
 */

export const GOLD_KIND = {
  bar: 'bar',
  jewelry: 'jewelry'
}

export const GOLD_KIND_OPTIONS = [
  { value: GOLD_KIND.bar, label: 'Logam mulia' },
  { value: GOLD_KIND.jewelry, label: 'Perhiasan' }
]

export const PURE_KARAT = 24

/** The karats Indonesian jewellers actually stamp, dearest first. */
export const KARAT_PRESETS = [24, 22, 20, 18, 17, 16, 10, 9, 8]

export function isValidKarat (karat) {
  return Number.isFinite(karat) && karat > 0 && karat <= PURE_KARAT
}

/**
 * Fills the fields older rows never had. A lot saved before jewellery existed
 * was bullion, and bullion is 24 karat whatever the cell says - so only a
 * jewellery lot's karat is read, and an unreadable one falls back to pure.
 */
export function normalizeGoldLot (lot) {
  const kind = lot.kind === GOLD_KIND.jewelry ? GOLD_KIND.jewelry : GOLD_KIND.bar
  const karat = Number(lot.karat)

  return {
    ...lot,
    kind,
    karat: kind === GOLD_KIND.jewelry && isValidKarat(karat) ? karat : PURE_KARAT
  }
}

/** Share of the weight that is gold: 1 for 24K, 0.75 for 18K. */
export function goldPurity (lot) {
  return normalizeGoldLot(lot).karat / PURE_KARAT
}

/** Grams of pure gold in the lot - what the 24K quote is multiplied by. */
export function fineGrams (lot) {
  return (Number(lot.grams) || 0) * goldPurity(lot)
}

export function isJewelry (lot) {
  return lot.kind === GOLD_KIND.jewelry
}

export function formatKarat (karat) {
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(karat)}K`
}

/** "75%" for 18K, "70,8%" for 17K - the figure jewellers quote as kadar. */
export function formatPurity (karat) {
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(
    (karat / PURE_KARAT) * 100
  )}%`
}

/**
 * Which buyback price the whole pile is valued at. Buyback depends on whose
 * bar it is far more than on the day - the same morning one dealer paid
 * Rp110rb/gr more for Antam than Hartadinata paid for its own EmasKu - so the
 * owner picks the brand they would actually sell, or types their shop's price.
 *
 * `market` is the median across brands, the default when nothing is known.
 * Brand keys must match `BRAND_FEEDS` in api/_lib/goldQuote.js.
 */
export const GOLD_REFERENCE = {
  market: 'market',
  antam: 'antam',
  ubs: 'ubs',
  galeri24: 'galeri24',
  emasku: 'emasku',
  indogold: 'indogold',
  pegadaian: 'pegadaian',
  manual: 'manual'
}

/** `label` stays short enough for one line beside a price; `hint` says whose it is. */
export const GOLD_REFERENCE_OPTIONS = [
  { value: GOLD_REFERENCE.market, label: 'Rata-rata pasar' },
  { value: GOLD_REFERENCE.antam, label: 'Antam' },
  { value: GOLD_REFERENCE.ubs, label: 'UBS' },
  { value: GOLD_REFERENCE.galeri24, label: 'Galeri 24', hint: 'Pegadaian' },
  { value: GOLD_REFERENCE.emasku, label: 'EmasKu', hint: 'Hartadinata' },
  { value: GOLD_REFERENCE.indogold, label: 'IndoGold' },
  { value: GOLD_REFERENCE.pegadaian, label: 'Pegadaian', hint: 'Tabungan Emas' },
  { value: GOLD_REFERENCE.manual, label: 'Harga sendiri' }
]

export function goldReferenceLabel (reference) {
  return (
    GOLD_REFERENCE_OPTIONS.find((option) => option.value === reference)?.label ||
    GOLD_REFERENCE_OPTIONS[0].label
  )
}

/**
 * A typed 24K buyback this far off the market is almost always a slipped or
 * missing zero, not a generous shop.
 */
export const MANUAL_PRICE_RANGE = { min: 0.5, max: 1.5 }

/** Null when fine, else why the typed price was refused. */
export function manualPriceProblem (price, marketPerGram) {
  if (!Number.isFinite(price)) return 'Harga harus berupa angka.'
  if (price <= 0) return 'Harga harus lebih besar dari 0.'
  if (marketPerGram > 0 && price > marketPerGram * MANUAL_PRICE_RANGE.max) return 'too_high'
  if (marketPerGram > 0 && price < marketPerGram * MANUAL_PRICE_RANGE.min) return 'too_low'
  return null
}

/**
 * The 24K buyback per gram to value gold at, for the chosen reference:
 * `{ perGram, reference, basis, stale, sources, recordedDate }`, or null when
 * nothing can price it.
 *
 * - `manual`   - the owner's own price; needs no feed at all.
 * - `brand`    - the median of the dealers quoting that brand.
 * - `market`   - the median across brands.
 * - `fallback` - the chosen brand is missing today (or no own price was typed
 *                yet), so the market price stands in, and the screen says so.
 */
export function resolveBuyback (quote, reference = GOLD_REFERENCE.market, manualPrice = 0) {
  const own = Number(manualPrice)
  if (reference === GOLD_REFERENCE.manual && own > 0) {
    return { perGram: own, reference, basis: 'manual', stale: false, sources: [], recordedDate: null }
  }

  const entry = reference !== GOLD_REFERENCE.market ? quote?.brands?.[reference] : null
  if (entry?.buybackPerGram > 0) {
    return {
      perGram: entry.buybackPerGram,
      reference,
      basis: 'brand',
      stale: Boolean(entry.stale),
      sources: entry.sources || [],
      recordedDate: entry.recordedDate || null
    }
  }

  if (!(quote?.buybackPerGram > 0)) return null
  return {
    perGram: quote.buybackPerGram,
    reference,
    basis: reference === GOLD_REFERENCE.market ? 'market' : 'fallback',
    stale: false,
    sources: [],
    recordedDate: quote.recordedDate || null
  }
}
