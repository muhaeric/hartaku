import {
  ACCOUNT_HEADERS,
  CATEGORY_HEADERS,
  GOLD_HEADERS,
  SHEET,
  TRANSACTION_HEADERS
} from '../lib/constants.js'
import { newId } from '../lib/id.js'
import {
  formatTags,
  mergeTags,
  normalizeTag,
  normalizeTags,
  parseTags,
  sameTags
} from '../lib/tags.js'
import {
  appendValues,
  batchUpdateValues,
  deleteRows,
  getValues,
  updateValues
} from './sheets.js'

const TX_RANGE = `${SHEET.transactions}!A2:K`
const CAT_RANGE = `${SHEET.categories}!A2:H`
const ACC_RANGE = `${SHEET.accounts}!A2:I`
const GOLD_RANGE = `${SHEET.gold}!A2:I`
const TX_LAST_COLUMN = 'K'
const CAT_LAST_COLUMN = 'H'
const ACC_LAST_COLUMN = 'I'
const GOLD_LAST_COLUMN = 'I'

const TRANSACTION_TYPE_VALUES = ['expense', 'income', 'transfer']

/* ---------------------------------------------------------------- mapping */

function rowToTransaction (row, index) {
  return {
    id: row[0] || '',
    date: normalizeDate(row[1]),
    account: row[2] ?? '',
    amount: Number(row[3]) || 0,
    type: TRANSACTION_TYPE_VALUES.includes(row[4]) ? row[4] : 'expense',
    category: row[5] ?? '',
    description: row[6] ?? '',
    createdAt: row[7] ?? '',
    updatedAt: row[8] ?? '',
    // Destination account; only set on transfers.
    toAccount: row[9] ?? '',
    tags: parseTags(row[10]),
    rowNumber: index + 2
  }
}

function transactionToRow (transaction) {
  return [
    transaction.id,
    transaction.date,
    transaction.account,
    Number(transaction.amount),
    transaction.type,
    transaction.category || '',
    transaction.description || '',
    transaction.createdAt,
    transaction.updatedAt,
    transaction.toAccount || '',
    formatTags(transaction.tags)
  ]
}

function rowToAccount (row, index) {
  return {
    id: row[0] || '',
    name: row[1] ?? '',
    kind: row[2] || 'other',
    color: row[3] || '#6b7280',
    icon: row[4] || '👛',
    openingBalance: Number(row[5]) || 0,
    description: row[6] ?? '',
    sortOrder: Number(row[7]) || 0,
    // Hidden from the pickers and lists; its transactions stay exactly where
    // they are, so every balance and total still counts it.
    archived: isTrue(row[8]),
    rowNumber: index + 2
  }
}

function accountToRow (account) {
  return [
    account.id,
    account.name,
    account.kind,
    account.color,
    account.icon,
    Number(account.openingBalance) || 0,
    account.description || '',
    account.sortOrder ?? 0,
    account.archived ? 'TRUE' : ''
  ]
}

/** The sheet is hand-editable, so a checkbox, a formula and a typed word all land here. */
function isTrue (value) {
  if (typeof value === 'boolean') return value
  return ['true', 'ya', 'yes', '1'].includes(String(value ?? '').trim().toLowerCase())
}

function rowToCategory (row, index) {
  return {
    id: row[0] || '',
    name: row[1] ?? '',
    type: ['expense', 'income', 'both'].includes(row[2]) ? row[2] : 'both',
    color: row[3] || '#6b7280',
    icon: row[4] || '📝',
    description: row[5] ?? '',
    sortOrder: Number(row[6]) || 0,
    // Off the pickers, still on every transaction that already carries it - the
    // same deal an archived account gets.
    archived: isTrue(row[7]),
    rowNumber: index + 2
  }
}

function categoryToRow (category) {
  return [
    category.id,
    category.name,
    category.type,
    category.color,
    category.icon,
    category.description || '',
    category.sortOrder ?? 0,
    category.archived ? 'TRUE' : ''
  ]
}

function rowToGoldLot (row, index) {
  const grams = Number(row[2]) || 0
  const cost = Number(row[3]) || 0

  return {
    id: row[0] || '',
    date: normalizeDate(row[1]),
    grams,
    cost,
    // Recomputed rather than trusted: the sheet is hand-editable.
    pricePerGram: grams ? cost / grams : 0,
    fromAccount: row[5] ?? '',
    description: row[6] ?? '',
    createdAt: row[7] ?? '',
    updatedAt: row[8] ?? '',
    rowNumber: index + 2
  }
}

function goldLotToRow (lot) {
  const grams = Number(lot.grams) || 0
  const cost = Number(lot.cost) || 0

  return [
    lot.id,
    lot.date,
    grams,
    cost,
    grams ? Math.round(cost / grams) : 0,
    lot.fromAccount || '',
    lot.description || '',
    lot.createdAt,
    lot.updatedAt
  ]
}

/**
 * Sheets may hand back a serial number if a cell was ever formatted as a date.
 * Everything downstream expects `YYYY-MM-DD`.
 */
function normalizeDate (value) {
  if (typeof value === 'number') {
    const epoch = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000
    return new Date(epoch).toISOString().slice(0, 10)
  }
  return String(value ?? '').slice(0, 10)
}

/* ----------------------------------------------------------- transactions */

export async function listTransactions (workbook) {
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)
  return rows
    .map(rowToTransaction)
    .filter((transaction) => transaction.id && transaction.date)
}

export async function createTransaction (workbook, input) {
  const now = new Date().toISOString()
  const transaction = {
    ...input,
    id: newId(),
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now
  }

  await appendValues(workbook.spreadsheetId, `${SHEET.transactions}!A1`, [
    transactionToRow(transaction)
  ])
  return transaction
}

/** Bulk insert in one append - importing 12 rows should not be 12 round trips. */
export async function createTransactions (workbook, inputs) {
  if (!inputs.length) return []

  const now = new Date().toISOString()
  const transactions = inputs.map((input) => ({
    ...input,
    id: newId(),
    tags: normalizeTags(input.tags),
    // An importer knows when the row was really written; without that, rows
    // brought in from another app would all share one timestamp and lose their
    // order within a day.
    createdAt: input.createdAt || now,
    updatedAt: now
  }))

  await appendValues(
    workbook.spreadsheetId,
    `${SHEET.transactions}!A1`,
    transactions.map(transactionToRow)
  )
  return transactions
}

export async function updateTransaction (workbook, input) {
  const rowNumber = await resolveRowNumber(workbook, TX_RANGE, input.id, input.rowNumber)
  if (!rowNumber) throw new Error('Transaksi tidak ditemukan - mungkin sudah dihapus.')

  const transaction = {
    ...input,
    rowNumber,
    tags: normalizeTags(input.tags),
    updatedAt: new Date().toISOString()
  }
  await updateValues(
    workbook.spreadsheetId,
    `${SHEET.transactions}!A${rowNumber}:${TX_LAST_COLUMN}${rowNumber}`,
    [transactionToRow(transaction)]
  )
  return transaction
}

/**
 * Re-points a batch of transactions at another account in one write, touching
 * only the account and updated_at cells rather than rewriting whole rows - a
 * full-row write would need every other field to still be current, which after
 * a bulk selection it may not be.
 *
 * A transfer already arriving at the target is left alone and reported back:
 * moving it would make both ends the same account, which is not a transfer at
 * all. Silently dropping the row or silently corrupting it are both worse than
 * saying which ones did not move.
 */
export async function moveTransactions (workbook, ids, account) {
  const wanted = new Set(ids)
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)
  const updatedAt = new Date().toISOString()

  const data = []
  const moved = []

  rows.forEach((row, index) => {
    if (!wanted.has(row[0]) || row[2] === account) return
    if (row[4] === 'transfer' && row[9] === account) return

    const rowNumber = index + 2
    data.push({ range: `${SHEET.transactions}!C${rowNumber}`, values: [[account]] })
    data.push({ range: `${SHEET.transactions}!I${rowNumber}`, values: [[updatedAt]] })
    moved.push(row[0])
  })

  await batchUpdateValues(workbook.spreadsheetId, data)
  return { moved, updatedAt }
}

/**
 * Re-files a batch of transactions under another category, same shape and same
 * reasoning as `moveTransactions`.
 *
 * Transfers are skipped rather than written: a transfer carries no category, and
 * giving one a category would make it the only transfer in the book that could
 * appear under a category filter. They are reported back so the caller can say
 * how many were left alone instead of quietly reporting a smaller number than
 * the selection.
 */
export async function recategorizeTransactions (workbook, ids, category) {
  const wanted = new Set(ids)
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)
  const updatedAt = new Date().toISOString()

  const data = []
  const moved = []
  let transfers = 0

  rows.forEach((row, index) => {
    if (!wanted.has(row[0])) return
    if (row[4] === 'transfer') {
      transfers += 1
      return
    }
    if (row[5] === category) return

    const rowNumber = index + 2
    data.push({ range: `${SHEET.transactions}!F${rowNumber}`, values: [[category]] })
    data.push({ range: `${SHEET.transactions}!I${rowNumber}`, values: [[updatedAt]] })
    moved.push(row[0])
  })

  await batchUpdateValues(workbook.spreadsheetId, data)
  return { moved, transfers, updatedAt }
}

/**
 * Puts tags on a batch of transactions, touching only the tag and updated_at
 * cells for the same reason `moveTransactions` does: after a bulk selection the
 * rest of the row may already have moved on, and a full-row write would send a
 * stale copy of it back.
 *
 * Adding is the default and merges with whatever the row already carries -
 * labelling forty rows "reimburse" should not silently strip the tags they were
 * filed under before. Replacing is the deliberate option, and clearing is just
 * replacing with nothing.
 */
export async function tagTransactions (workbook, ids, tags, { replace = false } = {}) {
  const wanted = new Set(ids)
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)
  const updatedAt = new Date().toISOString()

  const data = []
  const tagged = []

  rows.forEach((row, index) => {
    if (!wanted.has(row[0])) return

    const current = parseTags(row[10])
    const next = replace ? normalizeTags(tags) : mergeTags(current, tags)
    if (sameTags(current, next)) return

    const rowNumber = index + 2
    data.push({ range: `${SHEET.transactions}!K${rowNumber}`, values: [[formatTags(next)]] })
    data.push({ range: `${SHEET.transactions}!I${rowNumber}`, values: [[updatedAt]] })
    tagged.push({ id: row[0], tags: next })
  })

  await batchUpdateValues(workbook.spreadsheetId, data)
  return { tagged, updatedAt }
}

/**
 * Scans every row and rewrites the tag cell wherever `next` returns a different
 * list. Only the tag and updated_at cells are touched, for the same reason
 * `tagTransactions` does it: a full-row write would send back a stale copy of
 * fields the row may have moved on from.
 */
async function rewriteTagCells (workbook, next) {
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)
  const updatedAt = new Date().toISOString()

  const data = []
  const changed = []

  rows.forEach((row, index) => {
    const current = parseTags(row[10])
    const updated = next(current)
    if (sameTags(current, updated)) return

    const rowNumber = index + 2
    data.push({ range: `${SHEET.transactions}!K${rowNumber}`, values: [[formatTags(updated)]] })
    data.push({ range: `${SHEET.transactions}!I${rowNumber}`, values: [[updatedAt]] })
    changed.push({ id: row[0], tags: updated })
  })

  await batchUpdateValues(workbook.spreadsheetId, data)
  return { changed, updatedAt }
}

/**
 * Renames one tag across every transaction carrying it.
 *
 * A tag has no identity of its own - it is a word in a cell - so this is a bulk
 * rewrite rather than an update to one record. Matching is case-insensitive
 * because that is how tags compare everywhere else, which also means renaming
 * onto a name already in use is how you merge two tags: `normalizeTags` drops
 * the duplicate and the row keeps one of them.
 */
export async function renameTag (workbook, from, to) {
  const before = normalizeTag(from).toLowerCase()
  const after = normalizeTag(to)
  if (!before || !after) return { changed: [], updatedAt: null }

  return rewriteTagCells(workbook, (current) =>
    current.some((tag) => tag.toLowerCase() === before)
      ? normalizeTags(current.map((tag) => (tag.toLowerCase() === before ? after : tag)))
      : current
  )
}

/** Strips one tag everywhere. The transactions themselves are left alone. */
export async function deleteTag (workbook, tag) {
  const wanted = normalizeTag(tag).toLowerCase()
  if (!wanted) return { changed: [], updatedAt: null }

  return rewriteTagCells(workbook, (current) =>
    current.filter((item) => item.toLowerCase() !== wanted)
  )
}

export async function deleteTransactions (workbook, ids) {
  const wanted = new Set(ids)
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)

  const rowNumbers = rows
    .map((row, index) => (wanted.has(row[0]) ? index + 2 : null))
    .filter(Boolean)

  if (!rowNumbers.length) return 0

  await deleteRows(workbook.spreadsheetId, workbook.sheetIds[SHEET.transactions], rowNumbers)
  return rowNumbers.length
}

/**
 * Transactions reference categories and accounts by name, so renaming one has to
 * follow through or every existing row silently points at nothing. Sent as a
 * single batched write covering only the affected cells.
 */
const REFERENCE_COLUMNS = {
  account: { letter: 'C', index: 2 },
  category: { letter: 'F', index: 5 },
  toAccount: { letter: 'J', index: 9 }
}

export async function renameReferences (workbook, field, from, to) {
  if (!from || from === to) return 0

  const column = REFERENCE_COLUMNS[field]
  const rows = await getValues(workbook.spreadsheetId, TX_RANGE)

  const data = rows.flatMap((row, index) =>
    row[column.index] === from
      ? [{
          range: `${SHEET.transactions}!${column.letter}${index + 2}`,
          values: [[to]]
        }]
      : []
  )

  await batchUpdateValues(workbook.spreadsheetId, data)
  return data.length
}

/* ------------------------------------------------------------- categories */

export async function listCategories (workbook) {
  const rows = await getValues(workbook.spreadsheetId, CAT_RANGE)
  return rows
    .map(rowToCategory)
    .filter((category) => category.id && category.name)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function createCategory (workbook, input) {
  const category = { ...input, id: newId() }

  await appendValues(workbook.spreadsheetId, `${SHEET.categories}!A1`, [categoryToRow(category)])
  return category
}

/** One append for a whole set - an import creates dozens of these at once. */
export async function createCategories (workbook, inputs) {
  if (!inputs.length) return []

  const categories = inputs.map((input) => ({ ...input, id: newId() }))

  await appendValues(
    workbook.spreadsheetId,
    `${SHEET.categories}!A1`,
    categories.map(categoryToRow)
  )
  return categories
}

export async function updateCategory (workbook, input) {
  const rowNumber = await resolveRowNumber(workbook, CAT_RANGE, input.id, input.rowNumber)
  if (!rowNumber) throw new Error('Kategori tidak ditemukan - mungkin sudah dihapus.')

  await updateValues(
    workbook.spreadsheetId,
    `${SHEET.categories}!A${rowNumber}:${CAT_LAST_COLUMN}${rowNumber}`,
    [categoryToRow({ ...input, rowNumber })]
  )
  return { ...input, rowNumber }
}

export async function deleteCategory (workbook, id) {
  const rowNumber = await resolveRowNumber(workbook, CAT_RANGE, id)
  if (!rowNumber) return 0

  await deleteRows(workbook.spreadsheetId, workbook.sheetIds[SHEET.categories], [rowNumber])
  return 1
}

/* --------------------------------------------------------------- accounts */

export async function listAccounts (workbook) {
  const rows = await getValues(workbook.spreadsheetId, ACC_RANGE)
  return rows
    .map(rowToAccount)
    .filter((account) => account.id && account.name)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export async function createAccount (workbook, input) {
  const account = { ...input, id: newId() }

  await appendValues(workbook.spreadsheetId, `${SHEET.accounts}!A1`, [accountToRow(account)])
  return account
}

export async function createAccounts (workbook, inputs) {
  if (!inputs.length) return []

  const accounts = inputs.map((input) => ({ ...input, id: newId() }))

  await appendValues(workbook.spreadsheetId, `${SHEET.accounts}!A1`, accounts.map(accountToRow))
  return accounts
}

export async function updateAccount (workbook, input) {
  const rowNumber = await resolveRowNumber(workbook, ACC_RANGE, input.id, input.rowNumber)
  if (!rowNumber) throw new Error('Akun tidak ditemukan - mungkin sudah dihapus.')

  await updateValues(
    workbook.spreadsheetId,
    `${SHEET.accounts}!A${rowNumber}:${ACC_LAST_COLUMN}${rowNumber}`,
    [accountToRow({ ...input, rowNumber })]
  )
  return { ...input, rowNumber }
}

export async function deleteAccount (workbook, id) {
  const rowNumber = await resolveRowNumber(workbook, ACC_RANGE, id)
  if (!rowNumber) return 0

  await deleteRows(workbook.spreadsheetId, workbook.sheetIds[SHEET.accounts], [rowNumber])
  return 1
}

/* ------------------------------------------------------------------- gold */

export async function listGoldLots (workbook) {
  const rows = await getValues(workbook.spreadsheetId, GOLD_RANGE)
  return rows.map(rowToGoldLot).filter((lot) => lot.id && lot.grams > 0)
}

export async function createGoldLot (workbook, input) {
  const now = new Date().toISOString()
  const lot = { ...input, id: newId(), createdAt: now, updatedAt: now }

  await appendValues(workbook.spreadsheetId, `${SHEET.gold}!A1`, [goldLotToRow(lot)])
  return { ...lot, pricePerGram: lot.grams ? lot.cost / lot.grams : 0 }
}

export async function updateGoldLot (workbook, input) {
  const rowNumber = await resolveRowNumber(workbook, GOLD_RANGE, input.id, input.rowNumber)
  if (!rowNumber) throw new Error('Catatan emas tidak ditemukan - mungkin sudah dihapus.')

  const lot = { ...input, rowNumber, updatedAt: new Date().toISOString() }
  await updateValues(
    workbook.spreadsheetId,
    `${SHEET.gold}!A${rowNumber}:${GOLD_LAST_COLUMN}${rowNumber}`,
    [goldLotToRow(lot)]
  )
  return { ...lot, pricePerGram: lot.grams ? lot.cost / lot.grams : 0 }
}

export async function deleteGoldLot (workbook, id) {
  const rowNumber = await resolveRowNumber(workbook, GOLD_RANGE, id)
  if (!rowNumber) return 0

  await deleteRows(workbook.spreadsheetId, workbook.sheetIds[SHEET.gold], [rowNumber])
  return 1
}

/** Gold lots point at their funding account by name too, so renames must reach them. */
export async function renameGoldAccountReferences (workbook, from, to) {
  if (!from || from === to) return 0

  const rows = await getValues(workbook.spreadsheetId, GOLD_RANGE)
  const data = rows.flatMap((row, index) =>
    row[5] === from ? [{ range: `${SHEET.gold}!F${index + 2}`, values: [[to]] }] : []
  )

  await batchUpdateValues(workbook.spreadsheetId, data)
  return data.length
}

/**
 * Re-reads the id column right before a write so a stale row number from an
 * earlier fetch can never clobber or delete somebody else's row.
 */
async function resolveRowNumber (workbook, range, id, hint) {
  const rows = await getValues(workbook.spreadsheetId, range)

  if (hint && rows[hint - 2]?.[0] === id) return hint

  const index = rows.findIndex((row) => row[0] === id)
  return index === -1 ? null : index + 2
}

export const HEADERS = {
  TRANSACTION_HEADERS,
  CATEGORY_HEADERS,
  ACCOUNT_HEADERS,
  GOLD_HEADERS
}
