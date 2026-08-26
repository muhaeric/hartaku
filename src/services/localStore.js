/**
 * The device-local database: one JSON document in IndexedDB holding every
 * transaction, category, account, gold lot and monthly budget.
 *
 * One document rather than a store per record type, because the app already
 * reads everything into memory on open and writes back through the same context
 * - a normalised schema with indexes would buy query power nothing here asks
 * for, and cost the ability to make a change atomic across two record types.
 *
 * IndexedDB rather than localStorage: localStorage caps at about 5MB across the
 * whole origin, and the settings and the display cache already live there. A few
 * thousand transactions would fit; the point at which it stops fitting is the
 * point at which someone has years of records to lose.
 *
 * There is deliberately no localStorage fallback. If IndexedDB is unavailable -
 * some private-browsing modes - this fails loudly at the door, because the one
 * unacceptable outcome is an app that accepts entries all evening and drops
 * them on quota.
 */

const DB_NAME = 'hartaku'
const DB_VERSION = 1
const STORE = 'workbook'
const KEY = 'default'

export const EMPTY_DOC = {
  version: 2,
  transactions: [],
  categories: [],
  accounts: [],
  goldLots: [],
  budgets: []
}

export class LocalStoreError extends Error {
  constructor (message) {
    super(message)
    this.name = 'LocalStoreError'
    this.code = 'local_store_unavailable'
  }
}

let connection = null

function open () {
  if (connection) return connection

  connection = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new LocalStoreError('Browser ini tidak mengizinkan penyimpanan lokal.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(
        new LocalStoreError(
          'Penyimpanan lokal tidak bisa dibuka. Kalau kamu memakai mode penyamaran, ' +
            'coba jendela biasa.'
        )
      )
    request.onblocked = () =>
      reject(new LocalStoreError('Penyimpanan lokal sedang dipakai tab lain.'))
  }).catch((err) => {
    // A failed connection must not be cached, or one bad moment poisons the
    // whole session.
    connection = null
    throw err
  })

  return connection
}

function request (mode, run) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const result = run(tx.objectStore(STORE))

        tx.oncomplete = () => resolve(result.result)
        tx.onerror = () => reject(new LocalStoreError('Penyimpanan lokal menolak permintaan.'))
        tx.onabort = () =>
          reject(
            new LocalStoreError(
              tx.error?.name === 'QuotaExceededError'
                ? 'Penyimpanan device sudah penuh. Cadangkan datanya, lalu kosongkan ruang.'
                : 'Penulisan ke penyimpanan lokal dibatalkan.'
            )
          )
      })
  )
}

export async function readDoc () {
  const stored = await request('readonly', (store) => store.get(KEY))
  if (!stored) return null

  return { ...EMPTY_DOC, ...stored }
}

export async function writeDoc (doc) {
  await request('readwrite', (store) =>
    store.put({ ...doc, updatedAt: new Date().toISOString() }, KEY)
  )
  return doc
}

export async function clearDoc () {
  await request('readwrite', (store) => store.delete(KEY))
}

/**
 * Every mutation is read-modify-write over the whole document, so two of them
 * running at once would let the second overwrite the first with a copy it read
 * before the change landed. They queue instead. The chain never breaks on a
 * rejection: a failed write must not stop the next one from being attempted.
 */
let queue = Promise.resolve()

export function mutate (change) {
  const run = queue.then(async () => {
    const doc = (await readDoc()) || { ...EMPTY_DOC }
    const { doc: next, result } = await change(doc)
    if (next) await writeDoc(next)
    return result
  })

  queue = run.catch(() => {})
  return run
}

/**
 * Asks the browser not to evict this origin's storage under pressure. Best
 * effort by design - Chrome grants it on engagement, Safari mostly does not -
 * so the honest backstop is still the backup file, not this call.
 */
export async function requestPersistence () {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true

    return await navigator.storage.persist()
  } catch {
    return false
  }
}
