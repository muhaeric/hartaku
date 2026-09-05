import { toIso } from './dates.js'

export const EMAIL_PROVIDERS = [
  { id: 'bca', label: 'BCA', domains: ['bca.co.id', 'klikbca.com'] },
  { id: 'mandiri', label: 'Bank Mandiri / Livin’', domains: ['bankmandiri.co.id'] },
  { id: 'bri', label: 'BRI / BRImo', domains: ['bri.co.id'] },
  { id: 'bni', label: 'BNI', domains: ['bni.co.id'] },
  { id: 'jago', label: 'Bank Jago', domains: ['jago.com'] },
  { id: 'blu', label: 'blu by BCA Digital', domains: ['bcadigital.co.id'] },
  { id: 'seabank', label: 'SeaBank', domains: ['seabank.co.id'] },
  { id: 'gopay', label: 'GoPay', domains: ['gopay.co.id', 'gojek.com'] },
  { id: 'dana', label: 'DANA', domains: ['dana.id'] },
  { id: 'ovo', label: 'OVO', domains: ['ovo.id'] },
  { id: 'shopeepay', label: 'ShopeePay', domains: ['shopee.co.id'] },
  { id: 'linkaja', label: 'LinkAja', domains: ['linkaja.id'] }
]

const MONTHS = {
  jan: 0, januari: 0, feb: 1, februari: 1, mar: 2, maret: 2,
  apr: 3, april: 3, mei: 4, may: 4, jun: 5, juni: 5,
  jul: 6, juli: 6, agu: 7, agt: 7, agustus: 7, aug: 7,
  sep: 8, sept: 8, september: 8, okt: 9, oktober: 9, oct: 9,
  nov: 10, november: 10, des: 11, desember: 11, dec: 11
}

const INCOME_WORDS = /\b(kredit|uang masuk|dana masuk|diterima|penerimaan|incoming|received|refund|pengembalian)\b/i
const EXPENSE_WORDS = /\b(debit|debet|pembayaran|pembelian|membayar|transaksi keluar|uang keluar|melakukan transfer|mengirimkan uang|transfer (?:ke|keluar)|top up|tarik tunai|penarikan uang tunai|purchase|payment|paid|qris)\b/i
const SUCCESS_WORDS = /\b(berhasil|sukses|successful|success|telah dilakukan|completed|sudah bertransaksi)\b/i
const FAILURE_WORDS = /\b(gagal|dibatalkan|batal|failed|declined|rejected|kedaluwarsa)\b/i
const PENDING_WORDS = /\b(pending|diproses|menunggu|in progress)\b/i
const ALERT_WORDS = /\b(notifikasi|pemberitahuan|transaction alert)\b.{0,30}\b(transaksi|debit|debet|kredit|payment)\b/i

export function detectEmailProvider ({ from = '' }) {
  const address = String(from).match(/(?:^|<)([^<>\s]+@[^<>\s]+)(?:>|$)/)?.[1] || String(from)
  const domain = address.toLowerCase().split('@').pop()?.replace(/[>\s].*$/, '') || ''

  return EMAIL_PROVIDERS.find((provider) =>
    provider.domains.some((candidate) => domain === candidate || domain.endsWith(`.${candidate}`))
  )?.id || null
}

/**
 * Deliberately conservative: an email is importable only when the provider,
 * transaction direction, amount and a success signal are all present.
 */
export function parseTransactionEmail (message) {
  const text = normalizeText(`${message.subject || ''}\n${message.text || ''}`)
  const provider = detectEmailProvider({ ...message, text })
  if (
    !provider || FAILURE_WORDS.test(text) || PENDING_WORDS.test(text) ||
    (!SUCCESS_WORDS.test(text) && !ALERT_WORDS.test(text))
  ) return null

  const type = INCOME_WORDS.test(text) && !EXPENSE_WORDS.test(text)
    ? 'income'
    : EXPENSE_WORDS.test(text)
      ? 'expense'
      : null
  if (!type) return null

  const amount = extractAmount(text)
  if (!Number.isFinite(amount) || amount <= 0) return null

  return {
    provider,
    type,
    amount,
    date: extractDate(text, message.internalDate),
    description: extractDescription(text, message.subject, provider),
    confidence: 0.9
  }
}

function extractAmount (text) {
  const labelled = [
    /(?:nominal|jumlah|total|nilai transaksi|transaction amount|amount)\s*[:\-]?\s*(?:rp|idr)\s*([\d.,]+)/i,
    /(?:rp|idr)\s*([\d.,]+)\s*(?:telah|berhasil|ke|kepada|di|pada)/i
  ]

  for (const pattern of labelled) {
    const match = text.match(pattern)
    const value = match && parseRupiah(match[1])
    if (Number.isFinite(value) && value > 0) return value
  }

  // A single currency amount is safe enough; multiple unlabelled amounts often
  // include the balance and must be reviewed manually instead of guessed.
  const amounts = [...text.matchAll(/(?:rp|idr)\s*([\d][\d.,]*)/gi)]
    .map((match) => parseRupiah(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0)
  return amounts.length === 1 ? amounts[0] : NaN
}

function parseRupiah (raw) {
  const cleaned = String(raw).replace(/[^\d.,]/g, '')
  if (!cleaned) return NaN
  const last = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','))
  const tail = last >= 0 ? cleaned.slice(last + 1) : ''
  if (tail.length === 2 && /[.,]/.test(cleaned)) {
    const whole = cleaned.slice(0, last).replace(/[.,]/g, '')
    return Number(`${whole}.${tail}`)
  }
  return Number(cleaned.replace(/[.,]/g, ''))
}

function extractDate (text, internalDate) {
  const numeric = text.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/)
  if (numeric) return safeIso(Number(numeric[3]), Number(numeric[2]) - 1, Number(numeric[1]))

  const named = text.match(/\b(\d{1,2})\s+(jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|may|jun(?:i)?|jul(?:i)?|agu(?:stus)?|agt|aug|sep(?:t(?:ember)?)?|okt(?:ober)?|oct|nov(?:ember)?|des(?:ember)?|dec)\s+(20\d{2})\b/i)
  if (named) {
    const month = MONTHS[named[2].toLowerCase()]
    if (month !== undefined) return safeIso(Number(named[3]), month, Number(named[1]))
  }

  const fallback = new Date(Number(internalDate) || internalDate || Date.now())
  return Number.isNaN(fallback.getTime()) ? toIso(new Date()) : toIso(fallback)
}

function safeIso (year, month, day) {
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return toIso(new Date())
  }
  return toIso(date)
}

function extractDescription (text, subject, provider) {
  const fields = [
    /(?:merchant|pedagang|penerima|tujuan|kepada|keterangan|deskripsi)\s*[:\-]\s*([^\n]+)/i,
    /(?:pembayaran|pembelian|membayar)\s+(?:di|ke)\s+([^\n\p{Extended_Pictographic}]+)/iu,
    /(?:^|\n)(?:ke|penerima)\s*:?\s*\n\s*([^\n]+)/im
  ]
  for (const pattern of fields) {
    const match = text.match(pattern)
    if (match?.[1]) return cleanDescription(match[1])
  }

  const label = EMAIL_PROVIDERS.find((item) => item.id === provider)?.label || provider
  const usefulSubject = cleanDescription(subject || '')
  return usefulSubject && usefulSubject.length >= 3 ? usefulSubject : `Transaksi ${label}`
}

function cleanDescription (value) {
  return String(value)
    .replace(/\s+/g, ' ')
    .replace(/(?:nomor referensi|reference|ref)\s*[:#].*$/i, '')
    .trim()
    .slice(0, 160)
}

function normalizeText (value) {
  return String(value)
    .replace(/\r/g, '')
    .replace(/[\t\u00a0]+/g, ' ')
    .replace(/ {2,}/g, ' ')
}
