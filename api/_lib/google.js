import crypto from 'node:crypto'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'

/**
 * `drive.file` is the narrowest scope that still lets the app create and then
 * read/write its own spreadsheet - it grants no access to the rest of Drive.
 */
export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file'
].join(' ')

export function createPkcePair () {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function buildAuthUrl ({ clientId, redirectUri, state, challenge, loginHint }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    // Both are required for Google to hand back a refresh token.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true'
  })
  if (loginHint) params.set('login_hint', loginHint)

  return `${AUTH_URL}?${params.toString()}`
}

export async function exchangeCode ({ code, redirectUri, verifier }) {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier
  })
}

export async function refreshAccessToken (refreshToken) {
  return tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  })
}

export async function revokeToken (token) {
  try {
    await fetch(REVOKE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token })
    })
  } catch {
    // Revocation is best effort - the cookie is cleared either way.
  }
}

async function tokenRequest (fields) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      ...fields,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET
    })
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || 'token_request_failed')
    error.code = payload.error || 'token_request_failed'
    error.status = response.status
    throw error
  }

  return payload
}

/**
 * Reads the profile claims out of an id_token. Safe without signature checking:
 * the token came straight from Google's token endpoint over TLS.
 */
export function decodeIdToken (idToken) {
  if (!idToken) return {}

  try {
    const payload = idToken.split('.')[1]
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

export function toUser (claims) {
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name || claims.email,
    picture: claims.picture || null
  }
}
