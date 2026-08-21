/**
 * One ordering for every picker in the app: A-Z, the only order a visitor can
 * predict without opening the manager that owns the list.
 *
 * Indonesian collation with `sensitivity: 'base'` so case and accents do not
 * split a list, and `numeric` so "Akun 2" lands before "Akun 10". Sorting is
 * always done on a copy, so alphabetical presentation never rewrites the
 * stored `sort_order` values.
 *
 * The one list this deliberately leaves alone is the month picker: months read
 * chronologically, and "Agu" before "Apr" would be nonsense.
 */

export function compareLabels (a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'id-ID', {
    sensitivity: 'base',
    numeric: true
  })
}

/**
 * Sorts by whatever text the option shows. `getLabel` defaults to `.label`,
 * which covers the `{ value, label }` shape the select helpers take.
 */
export function sortByLabel (items, getLabel = (item) => item.label) {
  return [...items].sort((a, b) => compareLabels(getLabel(a), getLabel(b)))
}

/**
 * Same, but any option carrying an empty value - "Pilih…", "Semua akun",
 * "Tidak ada" - stays pinned at the top. Those are not choices to be found
 * alphabetically; they are the way out of the list.
 */
export function sortOptions (options, getLabel = (item) => item.label) {
  const placeholders = options.filter((option) => !option.value)
  const rest = options.filter((option) => option.value)
  return [...placeholders, ...sortByLabel(rest, getLabel)]
}
