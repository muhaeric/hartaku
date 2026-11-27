import { requireAdmin } from '../_lib/admin.js'
import { ANNOUNCEMENT_DEFAULTS, sendAnnouncementEmails } from '../_lib/email.js'
import { appOrigin, requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import {
  getAnnouncementDraft,
  getAnnouncementProgress,
  getPendingAnnouncementRecipients,
  markAnnouncementSent,
  saveAnnouncementDraft
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
  const hasEdits = req.body?.subject !== undefined || req.body?.body !== undefined

  try {
    // The admin can revise subject/body; once saved, every batch and resume
    // uses the same stored copy. Fall back to the default copy if none saved.
    if (hasEdits) {
      await saveAnnouncementDraft(CAMPAIGN, {
        subject: req.body?.subject,
        body: req.body?.body
      })
    }
    const draft = (await getAnnouncementDraft(CAMPAIGN)) || ANNOUNCEMENT_DEFAULTS

    if (dryRun) {
      const progress = await getAnnouncementProgress(CAMPAIGN)
      const sample = await getPendingAnnouncementRecipients(CAMPAIGN, 5)
      return res.status(200).json({
        dryRun: true,
        subject: draft.subject,
        body: draft.body,
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

    await sendAnnouncementEmails(recipients, { appUrl: appOrigin(req), draft })
    await markAnnouncementSent(CAMPAIGN, recipients.map((user) => user.sub))

    const progress = await getAnnouncementProgress(CAMPAIGN)
    return res.status(200).json({
      sentThisBatch: recipients.length,
      done: progress.remaining === 0,
      ...progress
    })
  } catch (error) {
    console.error('[admin/send-announcement] failed:', error)
    const known = error.code === 'email_not_configured' || error.code === 'announcement_draft_empty'
    return res.status(known ? 400 : 500).json({
      error: error.code || 'announcement_failed',
      message: known
        ? error.message
        : 'Pengumuman gagal dikirim. Periksa konfigurasi Resend lalu coba lagi.'
    })
  }
}
