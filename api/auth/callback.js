import crypto from 'node:crypto'
import { decodeIdToken, exchangeCode, toUser } from '../_lib/google.js'
import { requireEnv, requireMethod, requireSameOrigin, redirectUri } from '../_lib/http.js'
import {
  OAUTH_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  clearCookie,
  readCookie,
  seal,
  setCookie,
  unseal
} from '../_lib/session.js'

/** Finishes the OAuth flow: swaps the authorization code for tokens. */
export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'])) return

  const { code, state } = req.body || {}
  if (!code || !state) {
    return res.status(400).json({ error: 'missing_code_or_state' })
  }

  const pending = unseal(readCookie(req, OAUTH_COOKIE))
  clearCookie(req, res, OAUTH_COOKIE)

  if (!pending || !timingSafeEqual(pending.state, state)) {
    return res.status(400).json({
      error: 'state_mismatch',
      message: 'Sesi login kedaluwarsa. Silakan coba login lagi.'
    })
  }

  let tokens
  try {
    tokens = await exchangeCode({
      code,
      redirectUri: redirectUri(req),
      verifier: pending.verifier
    })
  } catch (err) {
    return res.status(401).json({ error: err.code || 'code_exchange_failed', message: err.message })
  }

  if (!tokens.refresh_token) {
    return res.status(401).json({
      error: 'missing_refresh_token',
      message: 'Google tidak mengirim refresh token. Cabut akses aplikasi di akun Google lalu login ulang.'
    })
  }

  const user = toUser(decodeIdToken(tokens.id_token))
  setCookie(
    req,
    res,
    SESSION_COOKIE,
    seal({ refreshToken: tokens.refresh_token, user }),
    SESSION_MAX_AGE
  )

  res.status(200).json({
    user,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000
  })
}

function timingSafeEqual (a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
