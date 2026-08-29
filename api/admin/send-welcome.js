import crypto from 'node:crypto'
import { requireAdmin } from '../_lib/admin.js'
import { sendWelcomeEmail } from '../_lib/email.js'
import { appOrigin, requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import { getUserById } from '../_lib/users.js'

export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['SESSION_SECRET', 'ADMIN_EMAILS', 'DATABASE_URL', 'RESEND_API_KEY'])) return
  if (!requireAdmin(req, res)) return

  const userId = String(req.body?.userId || '').trim()
  if (!userId || userId.length > 255) {
    return res.status(400).json({
      error: 'invalid_user_id',
      message: 'User yang akan menerima email tidak valid.'
    })
  }

  try {
    const user = await getUserById(userId)
    if (!user) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User tidak ditemukan.'
      })
    }

    await sendWelcomeEmail(user, {
      appUrl: appOrigin(req),
      idempotencyKey: `manual-welcome-${user.sub}-${crypto.randomUUID()}`
    })

    return res.status(200).json({
      sent: true,
      message: `Email sambutan berhasil dikirim ke ${user.email}.`
    })
  } catch (error) {
    console.error('[admin/send-welcome] failed to send email:', error)
    return res.status(500).json({
      error: error.code || 'welcome_email_failed',
      message: error.code === 'email_not_configured'
        ? error.message
        : 'Email sambutan gagal dikirim. Periksa konfigurasi Resend lalu coba lagi.'
    })
  }
}
