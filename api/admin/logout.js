import { endAdminSession } from '../_lib/admin.js'
import { requireMethod, requireSameOrigin } from '../_lib/http.js'

export default function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return

  endAdminSession(req, res)
  return res.status(200).json({ ok: true })
}
