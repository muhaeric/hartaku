import { googleFetch } from './googleApi.js'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages'
const SUBJECT_QUERY = [
  'subject:transaksi', 'subject:pembayaran', 'subject:transfer', 'subject:debit',
  'subject:debet', 'subject:kredit', 'subject:purchase', 'subject:payment',
  'subject:berhasil', 'subject:notifikasi', 'subject:membayar',
  'subject:"top up"', 'subject:"tarik tunai"'
].join(' ')

export async function listRecentTransactionEmails ({ after, lookbackDays = 14, maxResults = 100 } = {}) {
  const since = after ? gmailDate(new Date(new Date(after).getTime() - 24 * 60 * 60 * 1000)) : null
  const timeQuery = since ? `after:${since}` : `newer_than:${lookbackDays}d`
  const params = new URLSearchParams({
    q: `${timeQuery} {${SUBJECT_QUERY}}`,
    maxResults: String(maxResults)
  })
  const { messages = [] } = await googleFetch(`${GMAIL_API}?${params}`)

  const full = []
  for (let index = 0; index < messages.length; index += 8) {
    const batch = messages.slice(index, index + 8)
    full.push(...await Promise.all(batch.map(({ id }) => getMessage(id))))
  }
  return full
}

async function getMessage (id) {
  const params = new URLSearchParams({ format: 'full' })
  const message = await googleFetch(`${GMAIL_API}/${encodeURIComponent(id)}?${params}`)
  const headers = Object.fromEntries(
    (message.payload?.headers || []).map(({ name, value }) => [name.toLowerCase(), value])
  )

  return {
    id: message.id,
    threadId: message.threadId,
    internalDate: message.internalDate,
    from: headers.from || '',
    subject: headers.subject || '',
    text: payloadText(message.payload)
  }
}

function payloadText (payload) {
  if (!payload) return ''
  const parts = flattenParts(payload)
  const plain = parts.filter((part) => part.mimeType === 'text/plain' && part.body?.data)
  const html = parts.filter((part) => part.mimeType === 'text/html' && part.body?.data)
  const chosen = plain.length ? plain : html
  return chosen.map((part) => decodeBody(part.body.data, part.mimeType)).join('\n')
}

function flattenParts (part) {
  return [part, ...(part.parts || []).flatMap(flattenParts)]
}

function decodeBody (data, mimeType) {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
    const decoded = new TextDecoder().decode(bytes)
    if (mimeType !== 'text/html') return decoded
    const withLineBreaks = decoded.replace(/<(?:br\s*\/?|\/(?:p|div|tr|li))>/gi, '\n')
    const doc = new DOMParser().parseFromString(withLineBreaks, 'text/html')
    return doc.body?.textContent || ''
  } catch {
    return ''
  }
}

function gmailDate (date) {
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}
