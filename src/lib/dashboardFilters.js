/**
 * Category chips last active in the Dashboard's expense breakdown.
 *
 * This is recent UI state, not a setting: remembering it makes leaving the
 * Dashboard and coming back resume the same view without adding another
 * preference to the settings screen.
 */
const KEY = 'hartaku.dashboardExpenseCategories'

export function normalizeDashboardCategories (categories) {
  if (!Array.isArray(categories)) return []
  return [...new Set(categories.filter((name) => typeof name === 'string' && name))]
}

export function readDashboardCategories () {
  try {
    return normalizeDashboardCategories(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return []
  }
}

export function writeDashboardCategories (categories) {
  try {
    const normalized = normalizeDashboardCategories(categories)
    if (normalized.length) localStorage.setItem(KEY, JSON.stringify(normalized))
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked or full - the filter still works for the current mount.
  }
}
