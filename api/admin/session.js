import { requireAdmin } from '../_lib/admin.js'
import { requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'

export default function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['SESSION_SECRET', 'ADMIN_PIN'])) return

  const session = requireAdmin(req, res)
  if (!session) return

  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ authenticated: true, expiresAt: session.expiresAt })
}
