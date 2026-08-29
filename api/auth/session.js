import { DRIVE_SCOPE_MESSAGE, hasDriveScope, refreshAccessToken } from '../_lib/google.js'
import { requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'
import { isAdminUser } from '../_lib/admin.js'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  clearCookie,
  readCookie,
  seal,
  setCookie,
  unseal
} from '../_lib/session.js'
import { recordUserSafely } from '../_lib/users.js'

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
    // Only invalid_grant proves that this particular refresh token is dead.
    // Network failures, rate limits, and temporary Google outages must not
    // destroy an otherwise valid session (especially when an iOS PWA resumes).
    if (err.code === 'invalid_grant') {
      clearCookie(req, res, SESSION_COOKIE)
      return res.status(401).json({
        error: err.code,
        message: 'Sesi kamu sudah tidak berlaku. Silakan login lagi.'
      })
    }

    return res.status(503).json({
      error: 'refresh_unavailable',
      message: 'Sesi belum bisa dipulihkan karena layanan Google sedang bermasalah. Coba lagi sebentar.'
    })
  }

  // A grant made without the Drive permission keeps refreshing happily and only
  // fails once the Sheets API is called - catch it here instead.
  if (!hasDriveScope(tokens.scope)) {
    clearCookie(req, res, SESSION_COOKIE)
    return res.status(403).json({ error: 'missing_drive_scope', message: DRIVE_SCOPE_MESSAGE })
  }

  // Sliding expiry: every visit pushes the 7-day logout window forward.
  await recordUserSafely(session.user, 'session')
  setCookie(req, res, SESSION_COOKIE, seal(session), SESSION_MAX_AGE)

  res.status(200).json({
    user: session.user,
    isAdmin: isAdminUser(session.user),
    accessToken: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
  })
}
