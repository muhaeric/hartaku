import { serialToIso } from './xlsx.js'

/**
 * Turns a Money Manager Excel export into transactions this app understands.
 *
 * The export is one row per *leg*, not per transaction: a transfer appears
 * twice, once as `Transfer-In` on the receiving account and once as
 * `Transfer-Out` on the sending one. Here a transfer is a single row, so the
 * pairs are matched up and only one of each survives. An unmatched leg is still
 * kept - a partial export should lose a duplicate, never a transaction.
 *
 * Column names are matched by heading rather than by position, because the
 * export's own column order changes with the app's language and with whether a
 * second currency is in play.
 */

const HEADINGS = {
  date: ['period', 'date', 'tanggal', 'waktu'],
  account: ['accounts', 'account', 'akun'],
  category: ['category', 'kategori'],
  subcategory: ['subcategory', 'sub category', 'subkategori'],
  note: ['note', 'notes', 'catatan'],
  type: ['income/expense', 'income / expense', 'type', 'jenis'],
  description: ['description', 'keterangan'],
  amount: ['amount', 'jumlah', 'nominal'],
  currency: ['currency', 'mata uang']
}

const KINDS = {
  'exp.': 'expense',
  exp: 'expense',
  expense: 'expense',
  pengeluaran: 'expense',
  'expense balance': 'expense',
  'inc.': 'income',
  inc: 'income',
  income: 'income',
  pemasukan: 'income',
  'income balance': 'income',
  transfer: 'out',
  'transfer-out': 'out',
  'transfer out': 'out',
  'transfer-in': 'in',
  'transfer in': 'in'
}

/** Serial numbers plausible for a date: roughly 1980 to 2080. */
const SERIAL_RANGE = [29000, 66000]

export function parseMoneyManager (sheets) {
  const warnings = []
  const rows = []

  for (const sheet of sheets) {
    const header = findHeader(sheet.rows)
    if (!header) continue

    for (let index = header.row + 1; index < sheet.rows.length; index += 1) {
      const parsed = readRow(sheet.rows[index], header.columns, warnings)
      if (parsed) rows.push(parsed)
    }
  }

  if (!rows.length) {
    throw new Error(
      'Tidak ada transaksi yang terbaca. Pastikan ini file hasil ekspor Excel dari Money Manager.'
    )
  }

  // Money Manager lets "Utang mba tari" and "Utang mba Tari" coexist as two
  // accounts. Settling on one spelling before anything else runs keeps the two
  // legs of a transfer matchable, and keeps every row pointing at an account
  // that will actually be created.
  const accountNames = canonical(rows.flatMap((row) => [row.account, row.counterpart]))
  const categoryNames = canonical(rows.map((row) => row.category))

  for (const row of rows) {
    row.account = accountNames.get(row.account.toLowerCase()) || row.account
    row.counterpart = accountNames.get(row.counterpart.toLowerCase()) || row.counterpart
    row.category = categoryNames.get(row.category.toLowerCase()) || row.category
  }

  const transactions = collapseTransfers(rows)
  transactions.sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return {
    transactions,
    accounts: [...accountNames.values()],
    categories: collectCategories(transactions),
    counts: {
      expense: transactions.filter((item) => item.type === 'expense').length,
      income: transactions.filter((item) => item.type === 'income').length,
      transfer: transactions.filter((item) => item.type === 'transfer').length,
      // Every leg that was folded into its partner rather than imported twice.
      paired: rows.length - transactions.length
    },
    range: {
      from: transactions.reduce((min, item) => (item.date < min ? item.date : min), '9999'),
      to: transactions.reduce((max, item) => (item.date > max ? item.date : max), '0000')
    },
    warnings: [...new Set(warnings)]
  }
}

/* --------------------------------------------------------------- header */

function findHeader (rows) {
  const limit = Math.min(rows.length, 20)

  for (let index = 0; index < limit; index += 1) {
    const columns = mapColumns(rows[index])
    // The type column is the one that cannot be guessed from anything else, so
    // its presence is what marks a row as the header.
    if (columns.type !== undefined && columns.account !== undefined) {
      return { row: index, columns }
    }
  }

  return null
}

function mapColumns (row) {
  const columns = {}
  const known = new Set(Object.values(HEADINGS).flat())

  row.forEach((cell, index) => {
    const heading = String(cell ?? '').trim().toLowerCase()
    if (!heading) return

    for (const [field, aliases] of Object.entries(HEADINGS)) {
      // First match wins: the export repeats "Accounts" as a trailing total
      // column, and the leftmost one is the real account.
      if (columns[field] === undefined && aliases.includes(heading)) columns[field] = index
    }

    // Money Manager heads one column with the user's main currency code and
    // fills it with every amount converted into it, while "Amount" stays in
    // whatever currency the account itself uses. This app knows one currency,
    // so the converted column is the honest one to read.
    if (columns.main === undefined && !known.has(heading) && /^[a-z]{3}$/.test(heading)) {
      columns.main = index
      columns.mainCode = heading.toUpperCase()
    }
  })

  return columns
}

/* ------------------------------------------------------------------ rows */

function readRow (row, columns, warnings) {
  if (!row || !row.length) return null

  const kind = KINDS[String(row[columns.type] ?? '').trim().toLowerCase()]
  if (!kind) return null

  const amount = Math.abs(
    toNumber(row[columns.main === undefined ? columns.amount : columns.main])
  )
  if (!Number.isFinite(amount) || amount <= 0) return null

  const account = text(row[columns.account])
  if (!account) return null

  const currency = text(row[columns.currency])
  if (currency && columns.mainCode && currency.toUpperCase() !== columns.mainCode) {
    warnings.push(
      `Ada transaksi dalam mata uang lain — nominalnya diambil dari kolom ${columns.mainCode} yang sudah dikonversi.`
    )
  }

  const stamp = toTimestamp(row[columns.date], warnings)
  if (!stamp) return null

  // On a transfer row the category column holds the account at the other end,
  // which is also why transfers never carry a category of their own.
  const counterpart = text(row[columns.category])

  return {
    kind,
    date: stamp.slice(0, 10),
    createdAt: stamp,
    amount,
    account,
    category: kind === 'in' || kind === 'out' ? '' : counterpart,
    counterpart: kind === 'in' || kind === 'out' ? counterpart : '',
    description: joinDetails(
      text(row[columns.note]),
      text(row[columns.subcategory]),
      text(row[columns.description])
    )
  }
}

function joinDetails (...parts) {
  return [...new Set(parts.filter(Boolean))].join(' · ')
}

function text (value) {
  return String(value ?? '').trim()
}

function toNumber (value) {
  if (typeof value === 'number') return value

  const cleaned = text(value).replace(/[^\d.,-]/g, '')
  if (!cleaned) return NaN

  // Money Manager writes plain numbers into the Amount column; a thousands
  // separator only shows up when the sheet has been through another editor.
  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  if (lastComma > lastDot) return Number(cleaned.replace(/\./g, '').replace(',', '.'))
  if (lastDot > lastComma) return Number(cleaned.replace(/,/g, ''))
  return Number(cleaned)
}

/** Returns an ISO timestamp, keeping the time so same-day rows stay in order. */
function toTimestamp (value, warnings) {
  if (typeof value === 'number') {
    if (value < SERIAL_RANGE[0] || value > SERIAL_RANGE[1]) return null
    return serialToIso(value)
  }

  const raw = text(value)
  if (!raw) return null

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (iso) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = iso
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`
  }

  const slashed = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[T ](\d{2}):(\d{2}))?/)
  if (slashed) {
    const [, first, second, year, hour = '00', minute = '00'] = slashed
    if (Number(first) <= 12) {
      warnings.push(
        'Tanggalnya ditulis sebagai teks tanpa keterangan urutan — dibaca sebagai hari/bulan/tahun.'
      )
    }
    return `${year}-${pad(second)}-${pad(first)}T${hour}:${minute}:00.000Z`
  }

  return null
}

function pad (value) {
  return String(value).padStart(2, '0')
}

/* -------------------------------------------------------------- transfers */

function collapseTransfers (rows) {
  // Both legs of a transfer describe the same movement; keyed the same way,
  // they collide and one can be dropped. Counted rather than flagged, so three
  // identical transfers in a day still import as three.
  const outgoing = new Map()

  for (const row of rows) {
    if (row.kind !== 'out') continue
    const key = transferKey(row.date, row.amount, row.account, row.counterpart)
    outgoing.set(key, (outgoing.get(key) || 0) + 1)
  }

  const transactions = []

  for (const row of rows) {
    if (row.kind === 'expense' || row.kind === 'income') {
      transactions.push(toTransaction(row, row.kind, row.account, ''))
      continue
    }

    if (row.kind === 'out') {
      transactions.push(toTransaction(row, 'transfer', row.account, row.counterpart))
      continue
    }

    // An incoming leg: skip it if its outgoing twin is in the file, keep it as
    // a transfer in its own right if it is not.
    const key = transferKey(row.date, row.amount, row.counterpart, row.account)
    const pending = outgoing.get(key) || 0

    if (pending > 0) outgoing.set(key, pending - 1)
    else transactions.push(toTransaction(row, 'transfer', row.counterpart, row.account))
  }

  return transactions
}

function transferKey (date, amount, from, to) {
  return `${date}|${amount}|${from}|${to}`
}

function toTransaction (row, type, account, toAccount) {
  return {
    date: row.date,
    createdAt: row.createdAt,
    account,
    toAccount,
    amount: row.amount,
    type,
    category: type === 'transfer' ? '' : row.category,
    description: row.description
  }
}

/* ------------------------------------------------------------ collections */

/** Lowercased name -> the first spelling the file used for it. */
function canonical (names) {
  const seen = new Map()

  for (const name of names) {
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name)
  }

  return seen
}

/** A category used by both flows is imported as usable by both. */
function collectCategories (transactions) {
  const found = new Map()

  for (const transaction of transactions) {
    if (transaction.type === 'transfer' || !transaction.category) continue

    const key = transaction.category.toLowerCase()
    const existing = found.get(key)

    if (!existing) found.set(key, { name: transaction.category, type: transaction.type })
    else if (existing.type !== transaction.type) existing.type = 'both'
  }

  return [...found.values()]
}
