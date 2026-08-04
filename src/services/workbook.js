import {
  ACCOUNT_HEADERS,
  CATEGORY_HEADERS,
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  GOLD_HEADERS,
  SHEET,
  SPREADSHEET_NAME,
  TRANSACTION_HEADERS
} from '../lib/constants.js'
import { newId } from '../lib/id.js'
import {
  appendValues,
  batchUpdate,
  createSpreadsheet,
  findSpreadsheetsByName,
  getSpreadsheet,
  getValues,
  spreadsheetUrl,
  updateValues
} from './sheets.js'

const STORAGE_KEY = 'hartaku.spreadsheetId'

/** Raised when we cannot tell whether a workbook already exists. */
export class WorkbookLookupError extends Error {
  constructor (message, cause) {
    super(message)
    this.name = 'WorkbookLookupError'
    this.code = 'workbook_lookup_failed'
    this.cause = cause
  }
}

export function storedSpreadsheetId () {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function rememberSpreadsheetId (id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode - the Drive lookup will find the file again next time.
  }
}

/**
 * Resolves the spreadsheet backing this account.
 * Order: explicitly chosen id -> remembered id -> Drive lookup -> create new.
 *
 * A new workbook is only created when the Drive lookup ran and genuinely found
 * nothing. If the lookup itself fails we refuse and throw, because creating
 * blind is how a second device ends up with its own empty copy of the data.
 * Pass `allowCreate` once the user has explicitly asked for a fresh one.
 */
export async function ensureWorkbook ({ spreadsheetId, allowCreate = false } = {}) {
  let meta = null

  const candidates = [spreadsheetId, storedSpreadsheetId()].filter(Boolean)
  for (const candidate of candidates) {
    meta = await loadSpreadsheet(candidate)
    if (meta) break
  }

  if (!meta && !spreadsheetId) {
    let existing = []
    try {
      existing = await findSpreadsheetsByName(SPREADSHEET_NAME)
    } catch (err) {
      if (!allowCreate) {
        throw new WorkbookLookupError(
          'Tidak bisa memeriksa apakah spreadsheet Hartaku sudah ada. ' +
            'Biasanya karena Google Drive API belum diaktifkan di project Google Cloud-mu.',
          err
        )
      }
    }

    for (const file of existing) {
      meta = await loadSpreadsheet(file.id)
      if (meta) break
    }
  }

  if (!meta) {
    meta = await createSpreadsheet({
      title: SPREADSHEET_NAME,
      sheets: [SHEET.transactions, SHEET.categories, SHEET.accounts, SHEET.gold]
    })
  }

  meta = await ensureSheets(meta)
  const workbook = {
    spreadsheetId: meta.spreadsheetId,
    title: meta.properties?.title || SPREADSHEET_NAME,
    url: spreadsheetUrl(meta.spreadsheetId),
    sheetIds: Object.fromEntries(
      (meta.sheets || []).map((sheet) => [sheet.properties.title, sheet.properties.sheetId])
    )
  }

  await ensureHeaders(workbook)
  await seedCategories(workbook)
  await seedAccounts(workbook)

  rememberSpreadsheetId(workbook.spreadsheetId)
  return workbook
}

async function loadSpreadsheet (id) {
  try {
    return await getSpreadsheet(id)
  } catch {
    return null
  }
}

async function ensureSheets (meta) {
  const existing = new Set((meta.sheets || []).map((sheet) => sheet.properties.title))
  const missing = Object.values(SHEET).filter((title) => !existing.has(title))
  if (!missing.length) return meta

  await batchUpdate(
    meta.spreadsheetId,
    missing.map((title) => ({
      addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } }
    }))
  )

  return getSpreadsheet(meta.spreadsheetId)
}

async function ensureHeaders (workbook) {
  const specs = [
    { sheet: SHEET.transactions, headers: TRANSACTION_HEADERS },
    { sheet: SHEET.categories, headers: CATEGORY_HEADERS },
    { sheet: SHEET.accounts, headers: ACCOUNT_HEADERS },
    { sheet: SHEET.gold, headers: GOLD_HEADERS }
  ]

  for (const { sheet, headers } of specs) {
    const [current = []] = await getValues(workbook.spreadsheetId, `${sheet}!A1:Z1`)
    const matches = headers.every((header, index) => current[index] === header)
    if (matches) continue

    const lastColumn = String.fromCharCode(64 + headers.length)
    await updateValues(workbook.spreadsheetId, `${sheet}!A1:${lastColumn}1`, [headers])
  }
}

async function seedAccounts (workbook) {
  const rows = await getValues(workbook.spreadsheetId, `${SHEET.accounts}!A2:H`)
  if (rows.some((row) => row[0])) return

  const seeded = DEFAULT_ACCOUNTS.map((account, index) => [
    newId(),
    account.name,
    account.kind,
    account.color,
    account.icon,
    account.openingBalance,
    '',
    index
  ])

  await appendValues(workbook.spreadsheetId, `${SHEET.accounts}!A1`, seeded)
}

async function seedCategories (workbook) {
  const rows = await getValues(workbook.spreadsheetId, `${SHEET.categories}!A2:G`)
  if (rows.some((row) => row[0])) return

  const seeded = DEFAULT_CATEGORIES.map((category, index) => [
    newId(),
    category.name,
    category.type,
    category.color,
    category.icon,
    '',
    index
  ])

  await appendValues(workbook.spreadsheetId, `${SHEET.categories}!A1`, seeded)
}
