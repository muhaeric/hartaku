/**
 * Last known copy of the workbook contents, so opening the app paints real
 * numbers immediately instead of a skeleton while Sheets is fetched.
 *
 * The cache is a display convenience, never the source of truth: every open
 * still refetches in the background and overwrites this.
 */

const KEY = 'hartaku.cache.v1'

// localStorage is ~5MB; a bloated cache is worse than none, so it is dropped
// rather than risking a quota error that breaks the settings write too.
const MAX_BYTES = 2_000_000

export function readCache () {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null

    const cached = JSON.parse(raw)
    if (!cached?.workbook?.spreadsheetId) return null

    return {
      workbook: cached.workbook,
      transactions: cached.transactions || [],
      categories: cached.categories || [],
      accounts: cached.accounts || [],
      goldLots: cached.goldLots || [],
      budgets: cached.budgets || [],
      savedAt: cached.savedAt || null
    }
  } catch {
    return null
  }
}

export function writeCache (state) {
  if (!state?.workbook?.spreadsheetId) return

  try {
    const payload = JSON.stringify({
      workbook: state.workbook,
      transactions: state.transactions,
      categories: state.categories,
      accounts: state.accounts,
      goldLots: state.goldLots,
      budgets: state.budgets,
      savedAt: new Date().toISOString()
    })

    if (payload.length > MAX_BYTES) {
      localStorage.removeItem(KEY)
      return
    }

    localStorage.setItem(KEY, payload)
  } catch {
    // Quota or private mode - the app works, it just opens cold next time.
  }
}

export function clearCache () {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to do.
  }
}
