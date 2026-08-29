import { adminEmails } from './admin.js'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

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

function appLink (appUrl) {
  if (!appUrl) return ''
  const safeUrl = escapeHtml(appUrl)
  return `<p style="margin:24px 0 0"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#4361ee;color:#fff;text-decoration:none;font-weight:600">Buka Hartaku</a></p>`
}

export function welcomeEmail (user, appUrl) {
  const greetingName = firstName(user)
  return {
    to: [user.email],
    subject: 'Selamat datang di Hartaku 👋',
    text: [
      `Halo ${greetingName},`,
      '',
      'Selamat datang di Hartaku. Kamu sudah bisa mulai mencatat pemasukan, pengeluaran, transfer antar akun, dan investasi emas.',
      'Catatan keuanganmu tetap tersimpan di Google Spreadsheet milikmu sendiri.',
      '',
      appUrl ? `Buka Hartaku: ${appUrl}` : '',
      '',
      'Salam,',
      'Hartaku'
    ].filter((line, index, lines) => line || lines[index - 1] !== '').join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:auto">
        <h1 style="font-size:24px;margin:0 0 16px">Selamat datang di Hartaku 👋</h1>
        <p>Halo ${escapeHtml(greetingName)},</p>
        <p>Kamu sudah bisa mulai mencatat pemasukan, pengeluaran, transfer antar akun, dan investasi emas.</p>
        <p>Catatan keuanganmu tetap tersimpan di <strong>Google Spreadsheet milikmu sendiri</strong>.</p>
        ${appLink(appUrl)}
        <p style="margin-top:28px;color:#6b7280">Salam,<br />Hartaku</p>
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
    subject: `User baru Hartaku: ${name}`,
    text: [
      'Ada user baru yang masuk ke Hartaku.',
      '',
      `Nama: ${name}`,
      `Email: ${user.email}`,
      `Waktu: ${signedUpAt} WIB`
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:560px;margin:auto">
        <h1 style="font-size:22px;margin:0 0 16px">User baru Hartaku</h1>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Nama</td><td style="padding:6px 0;font-weight:600">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${escapeHtml(user.email)}</td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#6b7280">Waktu</td><td style="padding:6px 0">${escapeHtml(signedUpAt)} WIB</td></tr>
        </table>
      </div>
    `
  }
}

async function sendEmail (message, idempotencyKey) {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
      'User-Agent': 'hartaku/1.0'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      ...message
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend ${response.status}: ${detail.slice(0, 500)}`)
  }
}

/**
 * Email is operational side work: a provider outage must never prevent login.
 * Deterministic idempotency keys also protect against a retried OAuth callback.
 */
export async function sendNewUserEmailsSafely (user, { appUrl } = {}) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn('[email] RESEND_API_KEY atau EMAIL_FROM belum dikonfigurasi; email user baru dilewati.')
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
    messages.map(({ message, idempotencyKey }) => sendEmail(message, idempotencyKey))
  )

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`[email] ${messages[index].label} gagal dikirim:`, result.reason)
    }
  })
}
