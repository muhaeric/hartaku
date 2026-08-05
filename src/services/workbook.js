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
  findWorkbooks,
  getSpreadsheet,
  getValues,
  spreadsheetUrl,
  tagSpreadsheet,
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

/** Raised when the search ran cleanly and turned up nothing. */
export class WorkbookNotFoundError extends Error {
  constructor (message) {
    super(message)
    this.name = 'WorkbookNotFoundError'
    this.code = 'workbook_not_found'
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
 * Order: explicitly chosen id -> remembered id -> Drive lookup -> ask.
 *
 * Creating is never automatic. An empty search result does not prove the user
 * is new - it also happens when the file was renamed, when the app's per-file
 * Drive grant was revoked and re-issued, or when the search simply misses. On a
 * second browser those all look identical to a first run, and guessing wrong
 * splits the user's data across two spreadsheets. So the decision is handed
 * back: `allowCreate` is only set once someone has actually asked for a new one.
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
      existing = await findWorkbooks(SPREADSHEET_NAME)
    } catch (err) {
      if (!allowCreate) {
        throw new WorkbookLookupError(
          'Tidak bisa memeriksa apakah spreadsheet Hartaku sudah ada. ' +
            'Biasanya karena Google Drive API belum diaktifkan di project Google Cloud-mu.',
          err
        )
      }
    }

    // Prefer a spreadsheet that actually carries Hartaku's sheets, so a broad
    // match cannot adopt something unrelated. Only if none qualifies do we fall
    // back to the first one that merely opens.
    let fallback = null
    for (const file of existing) {
      const candidate = await loadSpreadsheet(file.id)
      if (!candidate) continue

      if (looksLikeWorkbook(candidate)) {
        meta = candidate
        break
      }
      fallback ??= candidate
    }

    meta ??= fallback
  }

  if (!meta && !allowCreate) {
    throw new WorkbookNotFoundError(
      'Tidak ada satu pun spreadsheet buatan Hartaku di akun Google ini. Kalau kamu yakin ' +
        'catatanmu ada, kemungkinan kamu masuk dengan akun Google yang berbeda, atau akses ' +
        'aplikasi pernah dicabut sehingga file lamanya tidak lagi terlihat oleh Hartaku.'
    )
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

  // Marks the file so the next browser finds it by tag rather than by filename.
  // Applied on every open, not just on create, so workbooks made before the tag
  // existed pick it up the first time they are used.
  try {
    await tagSpreadsheet(workbook.spreadsheetId)
  } catch {
    // Discovery falls back to the filename; not worth blocking startup for.
  }

  rememberSpreadsheetId(workbook.spreadsheetId)
  return workbook
}

/** A Hartaku workbook always has the transactions sheet; a stray file will not. */
function looksLikeWorkbook (meta) {
  return (meta.sheets || []).some((sheet) => sheet.properties?.title === SHEET.transactions)
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
  const rows = await getValues(workbook.spreadsheetId, `${SHEET.accounts}!A2:I`)
  if (rows.some((row) => row[0])) return

  const seeded = DEFAULT_ACCOUNTS.map((account, index) => [
    newId(),
    account.name,
    account.kind,
    account.color,
    account.icon,
    account.openingBalance,
    '',
    index,
    ''
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
