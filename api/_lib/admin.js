import crypto from 'node:crypto'
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  clearCookie,
  readCookie,
  seal,
  setCookie,
  unseal
} from './session.js'

export function adminEmails () {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isValidAdminPin (candidate) {
  const configured = Buffer.from(String(process.env.ADMIN_PIN || ''))
  const supplied = Buffer.from(String(candidate || ''))
  return configured.length > 0 && equalBuffers(configured, supplied)
}

export function startAdminSession (req, res, now = Date.now()) {
  const expiresAt = now + ADMIN_SESSION_MAX_AGE * 1000
  setCookie(
    req,
    res,
    ADMIN_SESSION_COOKIE,
    seal({ admin: true, expiresAt, pinFingerprint: adminPinFingerprint() }),
    ADMIN_SESSION_MAX_AGE
  )
  return expiresAt
}

export function endAdminSession (req, res) {
  clearCookie(req, res, ADMIN_SESSION_COOKIE)
}

/** Authorizes admin API requests using the dedicated PIN session. */
export function requireAdmin (req, res) {
  const session = unseal(readCookie(req, ADMIN_SESSION_COOKIE))

  if (
    session?.admin !== true ||
    !Number.isFinite(session.expiresAt) ||
    session.expiresAt <= Date.now() ||
    !equalBuffers(Buffer.from(String(session.pinFingerprint || '')), Buffer.from(adminPinFingerprint()))
  ) {
    endAdminSession(req, res)
    res.status(401).json({ error: 'no_admin_session', message: 'Sesi admin berakhir. Masukkan PIN lagi.' })
    return null
  }

  return session
}

function adminPinFingerprint () {
  return crypto.createHash('sha256').update(String(process.env.ADMIN_PIN || '')).digest('base64url')
}

function equalBuffers (left, right) {
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}
