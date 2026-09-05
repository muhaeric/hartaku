/** Calls to this app's own serverless endpoints under /api. */

async function post (path, body, { keepalive = false } = {}) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    keepalive,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {})
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.message || payload.error || `Request gagal (${response.status})`)
    error.code = payload.error
    error.status = response.status
    throw error
  }

  return payload
}

export const authApi = {
  /** Returns the Google consent URL to redirect the browser to. */
  start: ({ gmail = false } = {}) => post('/api/auth/start', { gmail }),
  /** Exchanges the authorization code for a session. */
  callback: (code, state) => post('/api/auth/callback', { code, state }),
  /** Restores the session and returns a fresh access token. */
  session: () => post('/api/auth/session'),
  logout: () => post('/api/auth/logout')
}

export const adminApi = {
  login: (pin) => post('/api/admin/login', { pin }),
  session: () => post('/api/admin/session'),
  logout: () => post('/api/admin/logout'),
  users: ({ search = '', page = 1, limit = 25 } = {}) =>
    post('/api/admin/users', { search, page, limit }),
  sendWelcome: (userId) => post('/api/admin/send-welcome', { userId })
}

export const activityApi = {
  /** Records only that a transaction write succeeded, never its contents. */
  transactionAdded: () => post('/api/activity/transaction', {}, { keepalive: true })
}
