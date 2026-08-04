import { revokeToken } from '../_lib/google.js'
import { requireMethod, requireSameOrigin } from '../_lib/http.js'
import { SESSION_COOKIE, clearCookie, readCookie, unseal } from '../_lib/session.js'

export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return

  const session = unseal(readCookie(req, SESSION_COOKIE))
  clearCookie(req, res, SESSION_COOKIE)

  if (session?.refreshToken) await revokeToken(session.refreshToken)

  res.status(200).json({ ok: true })
}
