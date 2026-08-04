import {
  ACCOUNT_HEADERS,
  CATEGORY_HEADERS,
  GOLD_HEADERS,
  SHEET,
  TRANSACTION_HEADERS
} from '../lib/constants.js'
import { newId } from '../lib/id.js'
import {
  appendValues,
  batchUpdateValues,
  deleteRows,
  getValues,
  updateValues
} from './sheets.js'

const TX_RANGE = `${SHEET.transactions}!A2:J`
const CAT_RANGE = `${SHEET.categories}!A2:G`
const ACC_RANGE = `${SHEET.accounts}!A2:H`
const GOLD_RANGE = `${SHEET.gold}!A2:I`
const TX_LAST_COLUMN = 'J'
const CAT_LAST_COLUMN = 'G'
const ACC_LAST_COLUMN = 'H'
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
    transaction.toAccount || ''
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
    account.sortOrder ?? 0
  ]
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
    category.sortOrder ?? 0
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
    createdAt: now,
    updatedAt: now
  }

  await appendValues(workbook.spreadsheetId, `${SHEET.transactions}!A1`, [
    transactionToRow(transaction)
  ])
  return transaction
}

export async function updateTransaction (workbook, input) {
  const rowNumber = await resolveRowNumber(workbook, TX_RANGE, input.id, input.rowNumber)
  if (!rowNumber) throw new Error('Transaksi tidak ditemukan - mungkin sudah dihapus.')

  const transaction = { ...input, rowNumber, updatedAt: new Date().toISOString() }
  await updateValues(
    workbook.spreadsheetId,
    `${SHEET.transactions}!A${rowNumber}:${TX_LAST_COLUMN}${rowNumber}`,
    [transactionToRow(transaction)]
  )
  return transaction
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
