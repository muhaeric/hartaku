/**
 * Pulls transaction fields out of OCR text from an Indonesian banking or
 * e-wallet screenshot.
 *
 * Deliberately bank-agnostic: it keys off the labels those apps share
 * ("Nominal", "Berhasil", "Ref") rather than per-bank layouts, so a bank nobody
 * anticipated still parses. Account and category are chosen by the user, so
 * nothing here tries to guess them.
 */

const MONTHS = {
  jan: 1, januari: 1,
  feb: 2, februari: 2, peb: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12
}

/** Lines mentioning these describe a balance, a fee or an id - never the amount moved. */
// `\bref\b` deliberately: a bare `ref` also matches "Refund", which is a real
// transaction description.
const NOT_THE_AMOUNT =
  /saldo|sisa|limit|tabungan|bunga|poin|cashback tersedia|biaya|admin|\bref\b|referensi|no\.?\s*transaksi|id\s*transaksi|rekening|kartu/i
const AMOUNT_LABEL = /nominal|jumlah|total|amount|nilai transaksi|dibayar|pembayaran/i

const INCOME_HINTS =
  /(uang masuk|dana masuk|terima|diterima|masuk dari|transfer dari|kredit|refund|pengembalian|cashback|top ?up berhasil|penambahan saldo)/i
const EXPENSE_HINTS =
  /(transfer ke|kirim ke|pembayaran|pembelian|bayar|belanja|tarik tunai|penarikan|debit|uang keluar|dana keluar|top ?up|isi ulang|qris)/i

const MERCHANT_LABEL =
  /^(?:ke|dari|kepada|penerima|tujuan|merchant|toko|nama penerima|dibayarkan ke|untuk)\s*[:\-]\s*(.+)$|^(?:ke|dari|kepada|penerima|tujuan|merchant|toko)\s+(\S.*)$/i

/** These sit on their own line with the value underneath - a very common layout. */
const MERCHANT_LABEL_ONLY =
  /^(?:ke|dari|kepada|penerima|tujuan|merchant|toko|untuk|nama penerima)\s*:?$/i

const REFERENCE_LABEL =
  /(?:no\.?\s*ref(?:erensi)?|ref(?:erence)?\s*(?:no|id)?|id\s*transaksi|no\.?\s*transaksi|kode\s*transaksi|trx\s*id)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-/]{5,})/i

/** A line that is nothing but a field label or a screen heading. */
const BARE_LABEL =
  /^(nominal|jumlah|total|saldo(?: akhir)?|tanggal|waktu|jam|status|berhasil|sukses|selesai|catatan|keterangan|biaya(?: admin)?|admin|metode|sumber dana|jenis|detail|ref(?:erensi)?|mutasi(?: rekening)?|riwayat(?: transaksi)?|transaksi|ke|dari|kepada|tujuan|penerima|untuk)\s*:?$/i

/** Labels and headings that are never a merchant name, skipped when guessing. */
const LABEL_LINE =
  /^(nominal|jumlah|total|saldo|tanggal|waktu|jam|status|berhasil|sukses|selesai|catatan|keterangan|biaya|admin|metode|sumber dana|jenis|detail|transaksi|ref|referensi|no\.?|transfer|pembayaran|pembelian|uang (masuk|keluar)|dana (masuk|keluar)|top ?up|isi ulang|tarik tunai|penarikan|ke|dari|kepada|tujuan|penerima|untuk)\b/i

/**
 * Entry point. A payment receipt yields one transaction; a mutation list yields
 * one per row. Which it is comes from the data - a receipt shows a single
 * transaction amount (its fee and balance lines are recognised and set aside),
 * a statement shows several - rather than from asking the user to declare it.
 */
export function parseTransactions (text, { ocrConfidence = 0 } = {}) {
  const lines = toLines(text)
  const entries = statementEntries(lines)

  if (entries.length >= 2) {
    return entries.map((entry) => ({
      ...entry,
      confidence: round2(0.5 * ocrConfidence + 0.5 * (entry.date ? 1 : 0.6)),
      rawText: text
    }))
  }

  const single = parseReceipt(text, { ocrConfidence })
  return single.amount ? [single] : []
}

/**
 * One row per amount that looks like a transaction. Dates in these lists are
 * usually printed once as a group heading, so the last one seen carries down.
 */
function statementEntries (lines) {
  const entries = []
  let currentDate = null

  lines.forEach((line, index) => {
    const dateHere = findDate([line])
    if (dateHere) currentDate = dateHere

    const previous = index > 0 ? lines[index - 1] : ''
    // "Biaya" / "Saldo" often head their own line with the figure underneath;
    // without this a receipt reads as three separate transactions.
    const excluded =
      NOT_THE_AMOUNT.test(line) || (NOT_THE_AMOUNT.test(previous) && !/\d/.test(previous))
    if (excluded) return

    const amounts = amountsIn(line)
    if (amounts.length !== 1) return

    const amount = amounts[0]
    const label = describeLine(line) || describeLine(lines[index - 1] || '') || ''
    // List rows commonly put the date underneath the merchant/amount line.
    // Prefer that date over the previous row's date, but never look past the
    // next amount line or we could steal the following transaction's date.
    const rowDate = dateHere || findFollowingDate(lines, index) || currentDate

    entries.push({
      amount,
      date: rowDate,
      time: findTime([line]),
      type: signOf(line),
      merchant: label,
      reference: ''
    })
  })

  return entries
}

function findFollowingDate (lines, amountIndex) {
  for (let index = amountIndex + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (amountsIn(line).length) return null

    const date = findDate([line])
    if (date) return date
  }

  return null
}

/** Strips the money, the date and the time, leaving whatever named the row. */
function describeLine (line) {
  const rest = stripNonAmounts(line)
    .replace(/[-−–+]?\s*rp\.?\s*\d[\d.,]*/gi, ' ')
    .replace(/[-−–+]?\s*\b\d[\d.,]{3,}\b/g, ' ')
    .replace(/[|•·]+/g, ' ')
    .trim()

  // Only a bare label is rejected: "Transfer ke Budi" starts with a label word
  // but is exactly the description we want to keep.
  if (!rest || BARE_LABEL.test(rest)) return ''
  return cleanName(rest)
}

function signOf (line) {
  if (/[-−–]\s*(?:rp\.?\s*)?\d/i.test(line)) return 'expense'
  if (/\+\s*(?:rp\.?\s*)?\d/i.test(line)) return 'income'
  return findType(line)
}

function toLines (text) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeCurrencyDigits(line).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function normalizeCurrencyDigits (line) {
  return line.replace(/rp\.?\s*[\dOoIl.,]+/gi, (amount) =>
    amount.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')
  )
}

export function parseReceipt (text, { ocrConfidence = 0 } = {}) {
  const lines = toLines(text)
  const amount = findAmount(lines)
  const date = findDate(lines)
  const time = findTime(lines)
  const type = findType(text)
  const merchant = findMerchant(lines)
  const reference = findReference(text)

  const found = [amount, date, merchant].filter((value) => value !== null && value !== '').length

  return {
    amount,
    date,
    time,
    type,
    merchant,
    reference,
    // Blend how well the image was read with how much of it we understood: a
    // crisp scan we could not interpret is not a confident result.
    confidence: round2(0.4 * ocrConfidence + 0.6 * (found / 3)),
    rawText: text
  }
}

/* --------------------------------------------------------------- amount */

function findAmount (lines) {
  const candidates = []

  lines.forEach((line, index) => {
    const previous = index > 0 ? lines[index - 1] : ''
    // Labels frequently sit on their own line with the figure underneath.
    const labelled =
      AMOUNT_LABEL.test(line) || (AMOUNT_LABEL.test(previous) && !/\d/.test(previous))

    for (const value of amountsIn(line)) {
      let score = 0
      if (labelled) score += 3
      if (NOT_THE_AMOUNT.test(line)) score -= 5
      // The headline figure usually sits in the top third of these screens.
      if (index < lines.length / 3) score += 1

      candidates.push({ value, score })
    }
  })

  if (!candidates.length) return null

  candidates.sort((a, b) => b.score - a.score || b.value - a.value)
  return candidates[0].score < 0 ? null : candidates[0].value
}

/** Dates, times and long reference runs are digits that are never money. */
function stripNonAmounts (line) {
  return line
    .replace(/\b\d{1,2}\s+[A-Za-z]{3,10}\.?\s+\d{4}\b/g, ' ')
    .replace(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g, ' ')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}[:.]\d{2}(?::\d{2})?\b/g, ' ')
}

/**
 * Indonesian formatting uses `.` for thousands and `,` for decimals, but OCR
 * confuses the two often enough that grouping is inferred from the digits.
 */
function amountsIn (rawLine) {
  const line = stripNonAmounts(rawLine)
  const results = []
  const pattern = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,})/gi

  for (const match of line.matchAll(pattern)) {
    const raw = match[1]
    const hasCurrency = /rp/i.test(match[0])
    const grouped = /[.,]/.test(raw)
    const value = toNumber(raw)

    // An unbroken run of 10+ digits with no currency mark is an account or
    // reference number, not a rupiah figure.
    if (!hasCurrency && !grouped && raw.length > 9) continue
    // OCR often drops the day from "16 Agu 2026", leaving a bare year. A
    // four-digit year without a currency prefix is never a transaction amount.
    if (!hasCurrency && !grouped && value >= 1900 && value <= 2100) continue

    // A bare number needs to be big enough to plausibly be money.
    if (Number.isFinite(value) && value > 0 && (hasCurrency || value >= 1000)) {
      results.push(value)
    }
  }

  return results
}

function toNumber (raw) {
  const groups = raw.split(/[.,]/)
  if (groups.length === 1) return Number(raw)

  const last = groups[groups.length - 1]
  // A trailing group of exactly 3 digits is thousands; 1-2 digits is a decimal.
  if (last.length === 3) return Number(groups.join(''))

  return Number(`${groups.slice(0, -1).join('')}.${last}`)
}

/* ----------------------------------------------------------------- date */

function findDate (lines) {
  for (const line of lines) {
    const numeric = line.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/)
    if (numeric) {
      const [, day, month, year] = numeric
      const iso = buildIso(year, month, day)
      if (iso) return iso
    }

    const iso = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`

    const named = line.match(/\b(\d{1,2})\s+([A-Za-z]{3,10})\.?\s+(\d{4})\b/)
    if (named) {
      const month = MONTHS[named[2].toLowerCase()]
      if (month) return buildIso(named[3], month, named[1])
    }
  }

  return null
}

function buildIso (year, month, day) {
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year)
  const m = Number(month)
  const d = Number(day)

  if (!m || m > 12 || !d || d > 31) return null
  return `${fullYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function findTime (lines) {
  for (const line of lines) {
    const match = line.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)(?::([0-5]\d))?\b/)
    if (match) return `${String(match[1]).padStart(2, '0')}:${match[2]}`
  }
  return null
}

/* ----------------------------------------------------------------- type */

function findType (text) {
  const income = INCOME_HINTS.test(text)
  const expense = EXPENSE_HINTS.test(text)

  if (income && !expense) return 'income'
  // Money leaving is both the default and the more common case.
  return 'expense'
}

/* ------------------------------------------------------- merchant & ref */

function findMerchant (lines) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    // "Ke" / "Dari" on their own line, name on the next one.
    if (MERCHANT_LABEL_ONLY.test(line)) {
      const value = firstNameLike(lines.slice(index + 1, index + 3))
      if (value) return value
      continue
    }

    const labelled = line.match(MERCHANT_LABEL)
    if (labelled) {
      const value = cleanName(labelled[1] || labelled[2] || '')
      if (value) return value
    }
  }

  // Nothing labelled: fall back to the first line that reads like a name.
  return firstNameLike(lines) || ''
}

function firstNameLike (lines) {
  for (const line of lines) {
    if (LABEL_LINE.test(line)) continue
    // Account numbers, amounts and timestamps are not names.
    if (/\d{3,}/.test(line)) continue

    const value = cleanName(line)
    if (value && value.length >= 3) return value
  }
  return ''
}

function cleanName (value) {
  return value
    .replace(/\s*(berhasil|sukses|selesai|success)\s*$/i, '')
    .replace(/[|•·]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
}

function findReference (text) {
  const match = text.replace(/\s+/g, ' ').match(REFERENCE_LABEL)
  return match ? match[1].trim() : ''
}

function round2 (value) {
  return Math.round(value * 100) / 100
}
