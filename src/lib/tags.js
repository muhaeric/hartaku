import { LIMITS } from './constants.js'

/**
 * Free-form labels on a transaction, stored in one comma-separated cell.
 *
 * A cell rather than a sheet of its own: tags are read on every row of every
 * list, and a join across two sheets on a client that already pays a network
 * round trip per fetch would cost more than the feature is worth. The trade is
 * that a tag has no identity - renaming one means rewriting the rows that carry
 * it, the same way category renames already work.
 *
 * Comparison is case-insensitive but the first spelling seen is the one kept:
 * typing "Kantor" after "kantor" should not quietly create a second tag, and
 * should not restyle the first one either.
 */

export function normalizeTag (raw) {
  return String(raw ?? '')
    .replace(/[,\n\r]/g, ' ')
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITS.tagName)
}

/** Cleans, de-duplicates and caps a list of tags, preserving the given order. */
export function normalizeTags (tags) {
  const seen = new Set()
  const result = []

  for (const tag of Array.isArray(tags) ? tags : []) {
    const clean = normalizeTag(tag)
    if (!clean) continue

    const key = clean.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    result.push(clean)
    if (result.length >= LIMITS.tagsPerTransaction) break
  }

  return result
}

/** Reads the stored cell. Accepts an array too, so cached state round-trips. */
export function parseTags (value) {
  if (Array.isArray(value)) return normalizeTags(value)
  return normalizeTags(String(value ?? '').split(','))
}

export function formatTags (tags) {
  return normalizeTags(tags).join(', ')
}

/** Union of two sets, existing spellings winning. */
export function mergeTags (current, incoming) {
  return normalizeTags([...parseTags(current), ...parseTags(incoming)])
}

export function sameTags (a, b) {
  return formatTags(a).toLowerCase() === formatTags(b).toLowerCase()
}

/**
 * Every tag in use with how many rows carry it, most-used first, so the
 * suggestion strip surfaces the handful someone actually reaches for rather
 * than an alphabetical wall. The count is what the manager lists, and it is
 * also the warning before a delete.
 */
export function tagUsage (transactions) {
  const counts = new Map()

  for (const transaction of transactions) {
    for (const tag of parseTags(transaction.tags)) {
      const key = tag.toLowerCase()
      const entry = counts.get(key)
      if (entry) entry.count += 1
      else counts.set(key, { tag, count: 1 })
    }
  }

  return [...counts.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function collectTags (transactions) {
  return tagUsage(transactions).map((entry) => entry.tag)
}

/** Case-insensitive membership, matching how the rest of this module compares. */
export function hasTag (tags, tag) {
  const key = normalizeTag(tag).toLowerCase()
  if (!key) return false
  return parseTags(tags).some((item) => item.toLowerCase() === key)
}

/**
 * True when the row carries every one of `wanted`.
 *
 * Narrowing rather than widening: picking a second tag asks "and also this",
 * which is what makes a pair like `#kantor` + `#reimburse` useful. It differs
 * from the category chips in the same filter bar, which widen - but a category
 * is one value per row, so widening is the only thing they could mean.
 */
export function hasAllTags (tags, wanted) {
  if (!wanted.length) return true
  const carried = new Set(parseTags(tags).map((tag) => tag.toLowerCase()))
  return wanted.every((tag) => carried.has(normalizeTag(tag).toLowerCase()))
}
