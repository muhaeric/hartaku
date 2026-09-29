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
