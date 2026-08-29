import crypto from 'node:crypto'

export const SESSION_COOKIE = 'htk_session'
export const OAUTH_COOKIE = 'htk_oauth'

// Sliding window: the cookie is re-issued on every successful refresh. Thirty
// days is long enough for an installed mobile PWA to survive a few weeks of
// inactivity without turning the refresh-token cookie into a permanent login.
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60
export const OAUTH_MAX_AGE = 10 * 60

let cachedKey = null

function key () {
  if (cachedKey) return cachedKey

  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters')
  }
  cachedKey = crypto.scryptSync(secret, 'hartaku.session.v1', 32)
  return cachedKey
}

/** Encrypts a JSON-serialisable value into an opaque cookie string. */
export function seal (value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final()
  ])

  return [iv, cipher.getAuthTag(), body]
    .map((buf) => buf.toString('base64url'))
    .join('.')
}

/** Reverses `seal`. Returns null for anything tampered with or unreadable. */
export function unseal (token) {
  if (typeof token !== 'string') return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  try {
    const [iv, tag, body] = parts.map((part) => Buffer.from(part, 'base64url'))
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)

    const plain = Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
    return JSON.parse(plain)
  } catch {
    return null
  }
}

function serializeCookie (name, value, { maxAge, secure }) {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function setCookie (req, res, name, value, maxAge) {
  const existing = res.getHeader('Set-Cookie')
  const cookie = serializeCookie(name, value, { maxAge, secure: isSecure(req) })

  res.setHeader(
    'Set-Cookie',
    existing ? [].concat(existing, cookie) : [cookie]
  )
}

export function clearCookie (req, res, name) {
  setCookie(req, res, name, '', 0)
}

export function readCookie (req, name) {
  if (req.cookies) return req.cookies[name]

  const header = req.headers?.cookie || ''
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq > 0 && trimmed.slice(0, eq) === name) {
      return decodeURIComponent(trimmed.slice(eq + 1))
    }
  }
  return undefined
}

function isSecure (req) {
  const proto = req.headers['x-forwarded-proto']
  if (proto) return proto.split(',')[0].trim() === 'https'
  return false
}
