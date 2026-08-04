import { refreshAccessToken } from '../_lib/google.js'
import { requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  clearCookie,
  readCookie,
  seal,
  setCookie,
  unseal
} from '../_lib/session.js'

/**
 * Returns the current user plus a fresh, short-lived Google access token.
 * The browser keeps that token in memory only - the refresh token never
 * leaves the httpOnly cookie.
 */
export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'])) return

  const session = unseal(readCookie(req, SESSION_COOKIE))
  if (!session?.refreshToken) {
    return res.status(401).json({ error: 'no_session' })
  }

  let tokens
  try {
    tokens = await refreshAccessToken(session.refreshToken)
  } catch (err) {
    // invalid_grant means the user revoked access or the token expired for good.
    clearCookie(req, res, SESSION_COOKIE)
    return res.status(401).json({
      error: err.code || 'refresh_failed',
      message:
        err.code === 'invalid_grant'
          ? 'Sesi kamu sudah tidak berlaku. Silakan login lagi.'
          : err.message
    })
  }

  // Sliding expiry: every visit pushes the 7-day logout window forward.
  setCookie(req, res, SESSION_COOKIE, seal(session), SESSION_MAX_AGE)

  res.status(200).json({
    user: session.user,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
  })
}
