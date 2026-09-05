import crypto from 'node:crypto'
import { buildAuthUrl, createPkcePair } from '../_lib/google.js'
import { requireEnv, requireMethod, requireSameOrigin, redirectUri } from '../_lib/http.js'
import { OAUTH_COOKIE, OAUTH_MAX_AGE, seal, setCookie } from '../_lib/session.js'

/** Starts the OAuth flow: returns the Google consent URL for the browser to visit. */
export default async function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'])) return

  const state = crypto.randomBytes(16).toString('base64url')
  const { verifier, challenge } = createPkcePair()
  const gmail = req.body?.gmail === true

  // state + PKCE verifier live in a short-lived httpOnly cookie, never in JS-readable storage
  setCookie(req, res, OAUTH_COOKIE, seal({ state, verifier, gmail }), OAUTH_MAX_AGE)

  res.status(200).json({
    url: buildAuthUrl({
      clientId: process.env.GOOGLE_CLIENT_ID,
      redirectUri: redirectUri(req),
      state,
      challenge,
      gmail
    })
  })
}
