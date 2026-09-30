/**
 * Whether this browser still owes someone the first-run walkthrough.
 *
 * Kept per device rather than in the spreadsheet: it is about what this person
 * has seen here, and a second device with the same records does not need the
 * tour either - which is what the "already has transactions" check is for.
 *
 * `replay` is asked for from Settings. It forces the walkthrough back even
 * though the records are no longer empty, which is exactly the case the
 * automatic check would otherwise skip.
 */
const KEY = 'hartaku.onboarding'
const EVENT = 'hartaku:onboarding'

export const ONBOARDING = {
  pending: 'pending',
  replay: 'replay',
  done: 'done'
}

export function normalizeOnboarding (value) {
  return value === ONBOARDING.done || value === ONBOARDING.replay ? value : ONBOARDING.pending
}

export function readOnboarding () {
  try {
    return normalizeOnboarding(localStorage.getItem(KEY))
  } catch {
    return ONBOARDING.pending
  }
}

export function writeOnboarding (value) {
  const next = normalizeOnboarding(value)
  try {
    if (next === ONBOARDING.pending) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // Storage blocked: the walkthrough may show again next visit, nothing worse.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  return next
}

/** Lets the gate hear a replay requested from another screen. */
export function subscribeOnboarding (listener) {
  const handler = (event) => listener(normalizeOnboarding(event.detail))
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

/**
 * The gate's decision, pulled out so it can be tested without React.
 *
 * - `wait`: data is still arriving, so "no transactions" means nothing yet.
 * - `skip`: someone with records already - mark them done, never show it.
 * - `show` / `hide`: the plain answer.
 */
export function onboardingDecision ({ status, ready, transactionCount }) {
  if (status === ONBOARDING.done) return 'hide'
  if (status === ONBOARDING.replay) return ready ? 'show' : 'wait'
  if (!ready) return 'wait'
  return transactionCount > 0 ? 'skip' : 'show'
}
