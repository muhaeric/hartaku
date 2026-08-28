import { requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import { readCookie, SESSION_COOKIE, unseal } from '../_lib/session.js'
import { recordTransactionActivity } from '../_lib/users.js'

export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['SESSION_SECRET', 'DATABASE_URL'])) return

  const session = unseal(readCookie(req, SESSION_COOKIE))
  if (!session?.user) {
    return res.status(401).json({ error: 'no_session' })
  }

  try {
    await recordTransactionActivity(session.user)
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json({ recorded: true })
  } catch (error) {
    console.error('[activity/transaction] failed to record activity:', error)
    return res.status(500).json({
      error: 'transaction_activity_failed',
      message: 'Aktivitas transaksi gagal dicatat.'
    })
  }
}
