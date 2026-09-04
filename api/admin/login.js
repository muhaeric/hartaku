import { isValidAdminPin, startAdminSession } from '../_lib/admin.js'
import { requireEnv, requireMethod, requireSameOrigin } from '../_lib/http.js'

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const attemptsByClient = new Map()

export default function handler (req, res) {
  if (!requireMethod(req, res, 'POST')) return
  if (!requireSameOrigin(req, res)) return
  if (!requireEnv(res, ['SESSION_SECRET', 'ADMIN_PIN'])) return

  const client = clientKey(req)
  const now = Date.now()
  const attempts = currentAttempts(client, now)
  if (attempts.count >= MAX_ATTEMPTS) {
    res.setHeader('Retry-After', Math.ceil((attempts.resetAt - now) / 1000))
    return res.status(429).json({
      error: 'too_many_attempts',
      message: 'Terlalu banyak percobaan. Tunggu 15 menit lalu coba lagi.'
    })
  }

  const pin = typeof req.body?.pin === 'string' ? req.body.pin : ''
  if (!pin || pin.length > 128 || !isValidAdminPin(pin)) {
    attemptsByClient.set(client, { count: attempts.count + 1, resetAt: attempts.resetAt })
    return res.status(401).json({
      error: 'invalid_pin',
      message: 'PIN admin salah.'
    })
  }

  attemptsByClient.delete(client)
  const expiresAt = startAdminSession(req, res)
  res.setHeader('Cache-Control', 'private, no-store')
  return res.status(200).json({ authenticated: true, expiresAt })
}

function clientKey (req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0]
    .trim()
}

function currentAttempts (client, now) {
  const current = attemptsByClient.get(client)
  if (current && current.resetAt > now) return current

  if (attemptsByClient.size >= 1000) {
    for (const [key, entry] of attemptsByClient) {
      if (entry.resetAt <= now) attemptsByClient.delete(key)
    }
    if (attemptsByClient.size >= 1000) attemptsByClient.delete(attemptsByClient.keys().next().value)
  }

  const fresh = { count: 0, resetAt: now + ATTEMPT_WINDOW_MS }
  attemptsByClient.set(client, fresh)
  return fresh
}
