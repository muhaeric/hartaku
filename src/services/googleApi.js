/**
 * Thin fetch wrapper for Google APIs. The access token lives in memory inside
 * AuthProvider; this module only knows how to ask for it.
 */

let provideToken = async () => null

export function setAccessTokenProvider (fn) {
  provideToken = fn
}

export class GoogleApiError extends Error {
  constructor (message, { status, reason } = {}) {
    super(message)
    this.name = 'GoogleApiError'
    this.status = status
    this.reason = reason
  }
}

export async function googleFetch (url, options = {}, allowRetry = true) {
  const token = await provideToken()
  if (!token) throw new GoogleApiError('Sesi Google tidak ditemukan.', { status: 401 })

  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...options.headers,
      authorization: `Bearer ${token}`
    }
  })

  if (response.status === 401 && allowRetry) {
    await provideToken({ force: true })
    return googleFetch(url, options, false)
  }

  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}))

  if (!response.ok) {
    const detail = payload.error || {}
    throw new GoogleApiError(detail.message || `Google API error (${response.status})`, {
      status: response.status,
      reason: detail.status || detail.errors?.[0]?.reason
    })
  }

  return payload
}
