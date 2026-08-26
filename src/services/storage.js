import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from '../lib/constants.js'
import { newId } from '../lib/id.js'
import { EMPTY_DOC, readDoc, requestPersistence, writeDoc } from './localStore.js'

/**
 * Where this browser keeps the books: a Google spreadsheet, or the device.
 *
 * The choice is per browser rather than per account, because in local mode
 * there is no account to hang it on. It is remembered so the app opens where it
 * was left; without that, a local user would be shown the sign-in wall every
 * morning and reasonably conclude their data was gone.
 */

export const MODE = { google: 'google', local: 'local' }

const KEY = 'hartaku.storageMode'

export function readStorageMode () {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === MODE.local || stored === MODE.google ? stored : null
  } catch {
    return null
  }
}

export function writeStorageMode (mode) {
  try {
    if (mode) localStorage.setItem(KEY, mode)
    else localStorage.removeItem(KEY)
  } catch {
    // Private mode: the app still works, it just asks again next visit.
  }
}

/**
 * The local counterpart of `ensureWorkbook`. No id, no URL, no sheets to
 * repair - just the promise that the document exists and has the starter
 * accounts and categories in it, so a first-time local user lands on a usable
 * app rather than on four empty screens.
 */
export async function ensureLocalWorkbook () {
  const existing = await readDoc()

  if (!existing) {
    await writeDoc({
      ...EMPTY_DOC,
      createdAt: new Date().toISOString(),
      categories: DEFAULT_CATEGORIES.map((category, index) => ({
        ...category,
        id: newId(),
        description: '',
        sortOrder: index,
        archived: false
      })),
      accounts: DEFAULT_ACCOUNTS.map((account, index) => ({
        ...account,
        id: newId(),
        description: '',
        sortOrder: index,
        archived: false
      }))
    })
  }

  // Asked for on every open rather than once: browsers grant it on engagement,
  // so the first attempt is the one most likely to be refused.
  requestPersistence()

  return {
    local: true,
    spreadsheetId: null,
    title: 'Penyimpanan device',
    url: null,
    sheetIds: {}
  }
}

/**
 * Overwrites the local document with a restored backup. A merge would be the
 * friendlier-sounding option and the wrong one: two books with overlapping ids
 * and no shared history have no honest reconciliation, and "restore" should
 * mean what it says.
 */
export async function restoreLocalSnapshot (snapshot) {
  await writeDoc({
    ...EMPTY_DOC,
    createdAt: new Date().toISOString(),
    transactions: snapshot.transactions || [],
    categories: snapshot.categories || [],
    accounts: snapshot.accounts || [],
    goldLots: snapshot.goldLots || [],
    budgets: snapshot.budgets || []
  })
}

/** What is actually in the local document - used by backup and by migration. */
export async function localSnapshot () {
  const doc = await readDoc()
  if (!doc) return null

  return {
    transactions: doc.transactions || [],
    categories: doc.categories || [],
    accounts: doc.accounts || [],
    goldLots: doc.goldLots || [],
    budgets: doc.budgets || [],
    updatedAt: doc.updatedAt || null
  }
}

/**
 * Nothing to carry over. Deliberately generous about what counts as something:
 * a book with no transactions but hand-made categories is still work somebody
 * did, and the migration screen shows the counts anyway, so the decision stays
 * with the person who knows what those rows are worth.
 */
export function isEmptySnapshot (snapshot) {
  if (!snapshot) return true

  return (
    !snapshot.transactions.length &&
    !snapshot.goldLots.length &&
    !snapshot.budgets.length &&
    !snapshot.categories.length &&
    !snapshot.accounts.length
  )
}
