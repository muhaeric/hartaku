import { requireAdmin } from '../_lib/admin.js'
import { sendAnnouncementEmails } from '../_lib/email.js'
import { appOrigin, requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import {
  getAnnouncementProgress,
  getPendingAnnouncementRecipients,
  markAnnouncementSent
} from '../_lib/users.js'

/**
 * Identifies this specific one-time blast. The campaign log keyed on it is what
 * makes the send idempotent: each user receives it at most once no matter how
 * many times the batch loop is run.
 */
const CAMPAIGN = 'rebrand-hartakusigma-2026-11'

/** One batch per request keeps each call well under the serverless timeout. */
const BATCH_SIZE = 100

export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['SESSION_SECRET', 'ADMIN_PIN', 'DATABASE_URL', 'RESEND_API_KEY'])) return
  if (!requireAdmin(req, res)) return

  const dryRun = req.body?.dryRun === true

  try {
    if (dryRun) {
      const progress = await getAnnouncementProgress(CAMPAIGN)
      const sample = await getPendingAnnouncementRecipients(CAMPAIGN, 5)
      return res.status(200).json({
        dryRun: true,
        ...progress,
        done: progress.remaining === 0,
        sample: sample.map((user) => user.email)
      })
    }

    const recipients = await getPendingAnnouncementRecipients(CAMPAIGN, BATCH_SIZE)
    if (!recipients.length) {
      const progress = await getAnnouncementProgress(CAMPAIGN)
      return res.status(200).json({ sentThisBatch: 0, done: true, ...progress })
    }

    await sendAnnouncementEmails(recipients, { appUrl: appOrigin(req) })
    await markAnnouncementSent(CAMPAIGN, recipients.map((user) => user.sub))

    const progress = await getAnnouncementProgress(CAMPAIGN)
    return res.status(200).json({
      sentThisBatch: recipients.length,
      done: progress.remaining === 0,
      ...progress
    })
  } catch (error) {
    console.error('[admin/send-announcement] failed:', error)
    return res.status(500).json({
      error: error.code || 'announcement_failed',
      message: error.code === 'email_not_configured'
        ? error.message
        : 'Pengumuman gagal dikirim. Periksa konfigurasi Resend lalu coba lagi.'
    })
  }
}
