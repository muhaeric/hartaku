import { readCookie, SESSION_COOKIE, unseal } from './session.js'

export function adminEmails () {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminUser (user) {
  const email = String(user?.email || '').trim().toLowerCase()
  return Boolean(email && adminEmails().includes(email))
}

/** Authorizes admin API requests from the same encrypted session as the app. */
export function requireAdmin (req, res) {
  const session = unseal(readCookie(req, SESSION_COOKIE))

  if (!session?.user) {
    res.status(401).json({ error: 'no_session', message: 'Silakan masuk terlebih dahulu.' })
    return null
  }

  if (!isAdminUser(session.user)) {
    res.status(403).json({ error: 'admin_only', message: 'Akun ini tidak memiliki akses admin.' })
    return null
  }

  return session.user
}
