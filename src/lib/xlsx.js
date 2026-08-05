/**
 * Just enough of ZIP and SpreadsheetML to read an .xlsx in the browser.
 *
 * A spreadsheet library would be several times the size of this whole app, and
 * all that is needed here is "give me the cells". The unzipping is done by the
 * browser's own `DecompressionStream`, so nothing is hand-rolled except the
 * archive's table of contents.
 *
 * Deliberately read-only, and deliberately lossy: formulas come back as their
 * last computed value, formatting is ignored, and the only style question asked
 * of a cell is whether it is a date - because a date in a spreadsheet is just a
 * number until something says otherwise.
 */

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50

/** Excel counts days from 1899-12-30; 25569 of them separate that from epoch. */
const EPOCH_OFFSET_DAYS = 25569
const MS_PER_DAY = 86400000

/** Number formats Excel ships with that mean a date or a time. */
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47,
  50, 51, 52, 53, 54, 55, 56, 57, 58
])

export class XlsxError extends Error {}

/**
 * Reads every sheet in the file as arrays of plain values: strings, numbers,
 * booleans, `null` for blanks, and ISO timestamps for date-formatted cells.
 */
export async function readWorkbook (file) {
  const zip = await openZip(await file.arrayBuffer())

  const shared = readSharedStrings(await readText(zip, 'xl/sharedStrings.xml'))
  const isDateStyle = readStyles(await readText(zip, 'xl/styles.xml'))

  const workbook = parseXml(await readText(zip, 'xl/workbook.xml'), 'xl/workbook.xml')
  const targets = readRelationships(await readText(zip, 'xl/_rels/workbook.xml.rels'))

  const sheets = []

  for (const element of descendants(workbook, 'sheet')) {
    const relationId = attributeByLocalName(element, 'id')
    const path = targets.get(relationId)
    const xml = path ? await readText(zip, path) : null
    if (!xml) continue

    sheets.push({
      name: element.getAttribute('name') || `Sheet${sheets.length + 1}`,
      rows: readSheet(xml, path, shared, isDateStyle)
    })
  }

  if (!sheets.length) throw new XlsxError('Tidak ada lembar yang bisa dibaca di file ini.')
  return { sheets }
}

/* ------------------------------------------------------------------ zip */

async function openZip (buffer) {
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // The end-of-central-directory record is the last 22 bytes unless the archive
  // carries a comment, so scan back across the largest comment one may have.
  let eocd = -1
  const floor = Math.max(0, bytes.length - 22 - 0xffff)

  for (let offset = bytes.length - 22; offset >= floor; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) {
      eocd = offset
      break
    }
  }

  if (eocd === -1) throw new XlsxError('File ini bukan .xlsx — arsipnya tidak terbaca.')

  const count = view.getUint16(eocd + 10, true)
  let pointer = view.getUint32(eocd + 16, true)

  if (pointer === 0xffffffff || count === 0xffff) {
    throw new XlsxError('File .xlsx ini terlalu besar (format zip64) untuk dibuka di browser.')
  }

  const entries = new Map()

  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(pointer, true) !== CENTRAL_SIGNATURE) break

    const method = view.getUint16(pointer + 10, true)
    const compressedSize = view.getUint32(pointer + 20, true)
    const nameLength = view.getUint16(pointer + 28, true)
    const extraLength = view.getUint16(pointer + 30, true)
    const commentLength = view.getUint16(pointer + 32, true)
    const localOffset = view.getUint32(pointer + 42, true)

    const name = new TextDecoder().decode(
      bytes.subarray(pointer + 46, pointer + 46 + nameLength)
    )

    entries.set(name, { method, compressedSize, localOffset })
    pointer += 46 + nameLength + extraLength + commentLength
  }

  return { bytes, view, entries }
}

/** Returns null for parts the file simply does not have - most are optional. */
async function readText (zip, name) {
  const entry = zip.entries.get(name)
  if (!entry) return null

  // Only the local header knows how much padding sits before the data; its
  // sizes are the unreliable ones, which is why those come from the directory.
  const nameLength = zip.view.getUint16(entry.localOffset + 26, true)
  const extraLength = zip.view.getUint16(entry.localOffset + 28, true)
  const start = entry.localOffset + 30 + nameLength + extraLength
  const raw = zip.bytes.subarray(start, start + entry.compressedSize)

  if (entry.method === 0) return new TextDecoder().decode(raw)
  if (entry.method !== 8) throw new XlsxError('Kompresi di dalam file ini tidak didukung.')

  return new TextDecoder().decode(await inflate(raw))
}

async function inflate (bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new XlsxError('Browser ini belum bisa membuka .xlsx. Coba lewat Chrome atau Safari terbaru.')
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/* ------------------------------------------------------------------ xml */

function parseXml (xml, label) {
  if (!xml) throw new XlsxError(`Bagian ${label} tidak ada di file ini.`)

  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new XlsxError(`Bagian ${label} rusak dan tidak bisa dibaca.`)
  }

  return doc.documentElement
}

/**
 * Matching on `localName` rather than the tag as written: producers are free to
 * namespace-prefix everything (`<x:row>`), and several do.
 */
function children (node, name) {
  return [...node.children].filter((child) => child.localName === name)
}

function firstChild (node, name) {
  return [...node.children].find((child) => child.localName === name) || null
}

function descendants (node, name) {
  return [...node.getElementsByTagName('*')].filter((child) => child.localName === name)
}

function attributeByLocalName (element, name) {
  return [...element.attributes].find((attribute) => attribute.localName === name)?.value || ''
}

/* -------------------------------------------------------------- parts */

function readRelationships (xml) {
  const targets = new Map()
  if (!xml) return targets

  for (const relationship of children(parseXml(xml, 'relationships'), 'Relationship')) {
    const target = relationship.getAttribute('Target') || ''
    targets.set(
      relationship.getAttribute('Id'),
      target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    )
  }

  return targets
}

function readSharedStrings (xml) {
  if (!xml) return []

  return children(parseXml(xml, 'sharedStrings'), 'si').map(richText)
}

/** A shared string can be split into runs; phonetic hints are not part of it. */
function richText (node) {
  return [...node.getElementsByTagName('*')]
    .filter((child) => child.localName === 't' && child.parentElement?.localName !== 'rPh')
    .map((child) => child.textContent)
    .join('')
}

/**
 * Returns a predicate over style indexes. Dates are the one thing a value
 * cannot tell you about itself - `46238` is a number until a format says it is
 * the 4th of August.
 */
function readStyles (xml) {
  if (!xml) return () => false

  const root = parseXml(xml, 'styles')
  const custom = new Map()

  for (const format of descendants(root, 'numFmt')) {
    custom.set(Number(format.getAttribute('numFmtId')), format.getAttribute('formatCode') || '')
  }

  const container = firstChild(root, 'cellXfs')
  const formatIds = container
    ? children(container, 'xf').map((xf) => Number(xf.getAttribute('numFmtId') || 0))
    : []

  return (styleIndex) => {
    const id = formatIds[styleIndex]
    if (id === undefined) return false
    if (BUILTIN_DATE_FORMATS.has(id)) return true

    const code = custom.get(id)
    if (!code) return false

    // Strip literals and locale hints first, or `"Rp"` and `[$-421]` would read
    // as month and day tokens.
    return /[ymdhs]/i.test(code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, ''))
  }
}

function readSheet (xml, label, shared, isDateStyle) {
  const sheetData = firstChild(parseXml(xml, label), 'sheetData')
  if (!sheetData) return []

  const rows = []

  for (const row of children(sheetData, 'row')) {
    const cells = []

    for (const cell of children(row, 'c')) {
      cells[columnIndex(cell.getAttribute('r'))] = cellValue(cell, shared, isDateStyle)
    }

    // `r` is honoured so a file with skipped rows keeps its row numbering, which
    // is what any "the header is on line 4" logic downstream relies on.
    const number = Number(row.getAttribute('r'))
    rows[Number.isFinite(number) && number > 0 ? number - 1 : rows.length] = [...cells]
  }

  return [...rows].map((row) => row || [])
}

/** "AB12" -> 27. Blank or malformed references land in the first column. */
function columnIndex (reference) {
  const letters = String(reference || '').match(/^[A-Z]+/i)?.[0]
  if (!letters) return 0

  let index = 0
  for (const letter of letters.toUpperCase()) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }

  return index - 1
}

function cellValue (cell, shared, isDateStyle) {
  const type = cell.getAttribute('t') || 'n'

  if (type === 'inlineStr') {
    const inline = firstChild(cell, 'is')
    return inline ? richText(inline) : ''
  }

  const raw = firstChild(cell, 'v')?.textContent
  if (raw === undefined || raw === '') return null

  if (type === 's') return shared[Number(raw)] ?? ''
  if (type === 'str') return raw
  if (type === 'b') return raw === '1'
  if (type === 'e') return null

  const number = Number(raw)
  if (!Number.isFinite(number)) return raw

  return isDateStyle(Number(cell.getAttribute('s') || 0)) ? serialToIso(number) : number
}

/**
 * The serial is a wall-clock reading with no timezone, so it is read as UTC:
 * anything else would shift the calendar date the file plainly shows.
 */
export function serialToIso (serial) {
  return new Date(Math.round((serial - EPOCH_OFFSET_DAYS) * MS_PER_DAY)).toISOString()
}
