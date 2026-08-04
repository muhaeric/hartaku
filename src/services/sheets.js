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
export async function findSpreadsheetByName (name) {
  const params = new URLSearchParams({
    q: `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id,name)',
    pageSize: '10'
  })

  const { files = [] } = await googleFetch(`${DRIVE_API}?${params}`)
  return files[0]?.id || null
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
