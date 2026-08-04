/** Shared request helpers for the serverless handlers. */

export function requireMethod (req, res, method) {
  if (req.method === method) return true

  res.setHeader('Allow', method)
  res.status(405).json({ error: 'method_not_allowed' })
  return false
}

/**
 * Rejects cross-site POSTs. Together with the SameSite=Strict session cookie
 * this is the CSRF protection for the auth endpoints.
 */
export function requireSameOrigin (req, res) {
  const origin = req.headers.origin
  if (origin && origin === appOrigin(req)) return true

  res.status(403).json({ error: 'forbidden_origin' })
  return false
}

/** Origin the browser is talking to, used to build the OAuth redirect URI. */
export function appOrigin (req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')

  const proto = (req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim()
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

export function redirectUri (req) {
  return `${appOrigin(req)}/auth/callback`
}

export function requireEnv (res, names) {
  const missing = names.filter((name) => !process.env[name])
  if (!missing.length) return true

  res.status(500).json({
    error: 'server_not_configured',
    message: `Missing environment variables: ${missing.join(', ')}`
  })
  return false
}
