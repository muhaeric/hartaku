import { adminEmails } from './admin.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const RESEND_BATCH_ENDPOINT = 'https://api.resend.com/emails/batch'
export const TEAM_CONTACT_URL =
  'https://wa.me/6283141469381?text=Hai%20tim%20HartakuSigma%20saya%20ingin%20menyampaikan%20request%20%2F%20feedback'

function escapeHtml (value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function firstName (user) {
  const name = String(user?.name || '').trim()
  return name ? name.split(/\s+/)[0] : 'teman'
}

function headerText (value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim()
}

export function emailSenderAddress () {
  const explicitSender = String(process.env.EMAIL_FROM || '').trim()
  if (explicitSender) return explicitSender

  const domain = String(process.env.RESEND_EMAIL_DOMAIN || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  const validDomain = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)
  return validDomain ? `HartakuSigma <halo@${domain}>` : ''
}

function actionLinks (appUrl) {
  const appButton = appUrl
    ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:12px;background:#4361ee;color:#fff;text-decoration:none;font-weight:600">Buka HartakuSigma</a>`
    : ''

  return `
    <p style="margin:24px 0 0">
      ${appButton}
      <a href="${escapeHtml(TEAM_CONTACT_URL)}" style="display:inline-block;margin:0 0 8px;padding:11px 17px;border:1px solid #d1d5db;border-radius:12px;background:#fff;color:#374151;text-decoration:none;font-weight:600">Kritik dan saran</a>
    </p>
  `
}

export function welcomeEmail (user, appUrl) {
  const greetingName = firstName(user)
  return {
    to: [user.email],
    subject: 'Selamat datang di HartakuSigma 👋',
    text: [
      `Halo ${greetingName},`,
      '',
      'Selamat datang di HartakuSigma. Kamu sudah bisa mulai mencatat pemasukan, pengeluaran, transfer antar akun, dan investasi emas.',
      'Catatan keuanganmu tetap tersimpan di Google Spreadsheet milikmu sendiri.',
      '',
      appUrl ? `Buka HartakuSigma: ${appUrl}` : '',
      `Kritik dan saran: ${TEAM_CONTACT_URL}`,
      '',
      'Salam,',
      'HartakuSigma'
    ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:auto">
        <h1 style="font-size:24px;margin:0 0 16px">Selamat datang di HartakuSigma 👋</h1>
        <p>Halo ${escapeHtml(greetingName)},</p>
        <p>Kamu sudah bisa mulai mencatat pemasukan, pengeluaran, transfer antar akun, dan investasi emas.</p>
        <p>Catatan keuanganmu tetap tersimpan di <strong>Google Spreadsheet milikmu sendiri</strong>.</p>
        ${actionLinks(appUrl)}
        <p style="margin-top:28px;color:#6b7280">Salam,<br />HartakuSigma</p>
      </div>
    `
  }
}

export function newUserAdminEmail (user) {
  const name = headerText(user?.name || user?.email || 'Tanpa nama')
  const signedUpAt = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(new Date())

  return {
    to: adminEmails(),
    subject: `User baru HartakuSigma: ${name}`,
    text: [
      'Ada user baru yang masuk ke HartakuSigma.',
      '',
      `Nama: ${name}`,
      `Email: ${user.email}`,
      `Waktu: ${signedUpAt} WIB`
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 16px">User baru HartakuSigma</h1>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Nama</td><td style="padding:6px 0;font-weight:600">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${escapeHtml(user.email)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Waktu</td><td style="padding:6px 0">${escapeHtml(signedUpAt)} WIB</td></tr>
        </table>
      </div>
    `
  }
}

/**
 * Default copy for the one-time rebrand notice. The admin can override subject
 * and body from the dashboard; `{nama}` is replaced with the recipient's first
 * name and `{link}` with a button to open the app.
 */
export const ANNOUNCEMENT_DEFAULTS = {
  subject: 'Hartaku kini bernama HartakuSigma',
  body: [
    'Halo {nama},',
    '',
    'Mulai sekarang, Hartaku berganti nama menjadi HartakuSigma.',
    '',
    'Yang berubah hanya namanya. Semua fitur, catatan keuangan, dan spreadsheet ' +
      '"Hartaku - Expense Tracker" di Google Drive-mu tetap sama dan tetap milikmu. ' +
      'Kamu tidak perlu melakukan apa pun — cukup buka aplikasi seperti biasa.',
    '',
    '{link}',
    '',
    'Terima kasih sudah mencatat keuanganmu bersama kami.',
    '',
    'Salam,',
    'HartakuSigma'
  ].join('\n')
}

const LINK_LABEL = 'Buka HartakuSigma'

function announcementText (body, name, appUrl) {
  return body
    .replace(/\{nama\}/g, name)
    .replace(/\{link\}/g, appUrl ? `${LINK_LABEL}: ${appUrl}` : '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function announcementHtml (body, name, appUrl) {
  const button = appUrl
    ? `<a href="${escapeHtml(appUrl)}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#4361ee;color:#fff;text-decoration:none;font-weight:600">${LINK_LABEL}</a>`
    : ''

  // Escape the whole body first; the {nama}/{link} tokens survive escaping
  // (they contain no special characters), so author text can never inject HTML.
  const safe = escapeHtml(body).replace(/\{nama\}/g, escapeHtml(name))

  const paragraphs = safe
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\{link\}/g, button).replace(/\n/g, '<br>'))
    .filter((block) => block.trim())
    .map((block) => `<p style="margin:0 0 16px">${block}</p>`)
    .join('\n')

  return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:auto">
        ${paragraphs}
      </div>
    `
}

export function announcementEmail (user, appUrl, draft = {}) {
  const name = firstName(user)
  const subject = headerText((draft.subject || ANNOUNCEMENT_DEFAULTS.subject).replace(/\{nama\}/g, name))
  const body = draft.body || ANNOUNCEMENT_DEFAULTS.body

  return {
    to: [user.email],
    subject,
    text: announcementText(body, name, appUrl),
    html: announcementHtml(body, name, appUrl)
  }
}

async function sendEmail (message, idempotencyKey, from) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'User-Agent': 'hartaku/1.0'
    },
    body: JSON.stringify({
      from,
      ...message
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 500)}`)
  }

  return response.json().catch(() => ({}))
}

export async function sendWelcomeEmail (user, { appUrl, idempotencyKey } = {}) {
  const from = emailSenderAddress()
  if (!process.env.RESEND_API_KEY || !from) {
    const error = new Error('Resend belum dikonfigurasi. Periksa API key dan domain/alamat pengirim.')
    error.code = 'email_not_configured'
    throw error
  }
  if (!user?.sub || !user?.email) {
    const error = new Error('Data user untuk email sambutan tidak lengkap.')
    error.code = 'invalid_email_recipient'
    throw error
  }

  return sendEmail(
    welcomeEmail(user, appUrl),
    idempotencyKey || `welcome-user-${user.sub}`,
    from
  )
}

/**
 * Email is operational side work: a provider outage must never prevent login.
 * Deterministic idempotency keys also protect against a retried OAuth callback.
 */
export async function sendNewUserEmailsSafely (user, { appUrl } = {}) {
  const from = emailSenderAddress()
  if (!process.env.RESEND_API_KEY || !from) {
    console.warn('[email] RESEND_API_KEY dan alamat/domain pengirim belum dikonfigurasi; email user baru dilewati.')
    return
  }

  const messages = [
    {
      label: 'welcome',
      message: welcomeEmail(user, appUrl),
      idempotencyKey: `welcome-user-${user.sub}`
    }
  ]

  const adminMessage = newUserAdminEmail(user)
  if (adminMessage.to.length) {
    messages.push({
      label: 'admin-notification',
      message: adminMessage,
      idempotencyKey: `new-user-admin-${user.sub}`
    })
  }

  const results = await Promise.allSettled(
    messages.map(({ message, idempotencyKey }) => sendEmail(message, idempotencyKey, from))
  )

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[email] ${messages[index].label} gagal dikirim:`, result.reason)
    }
  })
}

/**
 * Sends one announcement to many recipients in a single Resend batch request
 * (max 100 per call). The caller keeps the campaign log that makes the blast
 * idempotent, so this does not set per-message idempotency keys.
 */
export async function sendAnnouncementEmails (users, { appUrl, draft } = {}) {
  const from = emailSenderAddress()
  if (!process.env.RESEND_API_KEY || !from) {
    const error = new Error('Resend belum dikonfigurasi. Periksa API key dan domain/alamat pengirim.')
    error.code = 'email_not_configured'
    throw error
  }

  const recipients = (users || []).filter((user) => user?.email)
  if (!recipients.length) return { sent: 0 }
  if (recipients.length > 100) {
    const error = new Error('Batch pengumuman melebihi 100 penerima.')
    error.code = 'announcement_batch_too_large'
    throw error
  }

  const batch = recipients.map((user) => ({ from, ...announcementEmail(user, appUrl, draft) }))

  const response = await fetch(RESEND_BATCH_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'User-Agent': 'hartaku/1.0'
    },
    body: JSON.stringify(batch)
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 500)}`)
  }

  await response.json().catch(() => ({}))
  return { sent: recipients.length }
}
