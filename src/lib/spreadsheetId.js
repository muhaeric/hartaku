/** Accepts a bare spreadsheet id or a full Google Sheets URL. Returns '' if neither. */
export function extractSpreadsheetId (input) {
  const value = String(input ?? '').trim()
  if (!value) return ''

  const fromUrl = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (fromUrl) return fromUrl[1]

  return /^[a-zA-Z0-9-_]{20,}$/.test(value) ? value : ''
}
