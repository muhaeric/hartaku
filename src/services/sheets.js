import { googleFetch } from './googleApi.js'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

export async function createSpreadsheet ({ title, sheets }) {
  return googleFetch(SHEETS_API, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: sheets.map((name, index) => ({
        properties: { title: name, index, gridProperties: { frozenRowCount: 1 } }
      }))
    })
  })
}

/**
 * Looks for a spreadsheet this app created earlier. The `drive.file` scope only
 * ever returns files created by this app, so the listing stays private.
 */
/**
 * A marker written onto the spreadsheet's Drive metadata. Searching by this
 * rather than by filename means the workbook is still found after the user
 * renames it - which, with a name-only search, silently orphaned their data.
 * `appProperties` are private to this OAuth client and invisible to the user.
 */
const WORKBOOK_TAG = { key: 'hartakuWorkbook', value: 'v1' }

export async function tagSpreadsheet (spreadsheetId) {
  const params = new URLSearchParams({ fields: 'id' })

  return googleFetch(`${DRIVE_API}/${spreadsheetId}?${params}`, {
    method: 'PATCH',
    body: JSON.stringify({ appProperties: { [WORKBOOK_TAG.key]: WORKBOOK_TAG.value } })
  })
}

async function queryDrive (q) {
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,createdTime)',
    // Oldest first: if duplicates exist, the original is the one to reopen.
    orderBy: 'createdTime',
    pageSize: '25'
  })

  const { files = [] } = await googleFetch(`${DRIVE_API}?${params}`)
  return files
}

/**
 * Finds this app's workbooks: by marker first, then by name for spreadsheets
 * created before the marker existed. Results are merged so an older untagged
 * file is never missed.
 */
export async function findWorkbooks (name) {
  const escaped = name.replace(/'/g, "\\'")

  const tagged = await queryDrive(
    `appProperties has { key='${WORKBOOK_TAG.key}' and value='${WORKBOOK_TAG.value}' } and trashed=false`
  )
  const named = await queryDrive(
    `name='${escaped}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  )

  const seen = new Set()
  return [...tagged, ...named].filter((file) => {
    if (seen.has(file.id)) return false
    seen.add(file.id)
    return true
  })
}

export async function getSpreadsheet (spreadsheetId) {
  const params = new URLSearchParams({
    fields: 'spreadsheetId,properties.title,sheets.properties(sheetId,title)'
  })
  return googleFetch(`${SHEETS_API}/${spreadsheetId}?${params}`)
}

export async function getValues (spreadsheetId, range) {
  const params = new URLSearchParams({
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING'
  })

  const { values = [] } = await googleFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`
  )
  return values
}

export async function appendValues (spreadsheetId, range, rows) {
  const params = new URLSearchParams({
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS'
  })

  return googleFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?${params}`,
    { method: 'POST', body: JSON.stringify({ values: rows }) }
  )
}

export async function updateValues (spreadsheetId, range, rows) {
  const params = new URLSearchParams({ valueInputOption: 'RAW' })

  return googleFetch(
    `${SHEETS_API}/${spreadsheetId}/values/${encodeURIComponent(range)}?${params}`,
    { method: 'PUT', body: JSON.stringify({ values: rows }) }
  )
}

/** Writes several disjoint ranges in one request. */
export async function batchUpdateValues (spreadsheetId, data) {
  if (!data.length) return null

  return googleFetch(`${SHEETS_API}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data })
  })
}

export async function batchUpdate (spreadsheetId, requests) {
  if (!requests.length) return null

  return googleFetch(`${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests })
  })
}

/**
 * Deletes rows by 1-based spreadsheet row number. Sorted descending so earlier
 * deletions never shift the rows still queued behind them.
 */
export async function deleteRows (spreadsheetId, sheetId, rowNumbers) {
  const requests = [...new Set(rowNumbers)]
    .sort((a, b) => b - a)
    .map((rowNumber) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: rowNumber - 1,
          endIndex: rowNumber
        }
      }
    }))

  return batchUpdate(spreadsheetId, requests)
}

export function spreadsheetUrl (spreadsheetId) {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
}
