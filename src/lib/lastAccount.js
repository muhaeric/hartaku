/**
 * The account filter last chosen on the transaction list.
 *
 * Deliberately not a setting: it is a trace of what the user was just doing,
 * not a preference they chose, and it changes far too often to belong on the
 * settings screen. Kept here rather than in React state because the two screens
 * that care about it - the list and the entry form - never share a mount.
 */
const KEY = 'hartaku.lastAccount'

export function readLastAccount () {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function writeLastAccount (name) {
  try {
    if (name) localStorage.setItem(KEY, name)
    else localStorage.removeItem(KEY)
  } catch {
    // Storage blocked or full - the filter simply will not be remembered.
  }
}
