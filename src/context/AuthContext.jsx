import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from '../services/appApi.js'
import { clearCache } from '../services/cache.js'
import { setAccessTokenProvider } from '../services/googleApi.js'

const AuthContext = createContext(null)

/** Refresh a minute early so a request never starts with an almost-dead token. */
const EXPIRY_MARGIN_MS = 60_000

export function AuthProvider ({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState(null)

  // The Google access token stays in memory only - never localStorage.
  const token = useRef({ value: null, expiresAt: 0 })
  const inflight = useRef(null)

  const applySession = useCallback((session) => {
    token.current = { value: session.accessToken, expiresAt: session.expiresAt }
    setUser(session.user)
    setIsAdmin(Boolean(session.isAdmin))
    setStatus('authenticated')
    setError(null)
  }, [])

  const clearSession = useCallback(() => {
    token.current = { value: null, expiresAt: 0 }
    setUser(null)
    setIsAdmin(false)
    setStatus('anonymous')
  }, [])

  const refreshSession = useCallback(async () => {
    if (inflight.current) return inflight.current

    inflight.current = authApi
      .session()
      .then((session) => {
        applySession(session)
        return session.accessToken
      })
      .catch((err) => {
        const rejected = err.status === 401 || err.status === 403

        if (rejected) {
          clearSession()
        } else {
          // A temporary refresh failure is not a logout. Keep an already-open
          // app usable with its current token/cache, and show a recovery state
          // instead of the login screen when restoring a freshly opened PWA.
          setStatus((current) => (current === 'authenticated' ? current : 'recovering'))
        }

        // "No session yet" is the normal first-visit case and stays silent.
        if (err.code && err.code !== 'no_session') setError(err.message)
        throw err
      })
      .finally(() => {
        inflight.current = null
      })

    return inflight.current
  }, [applySession, clearSession])

  const getAccessToken = useCallback(
    async ({ force = false } = {}) => {
      const current = token.current
      if (!force && current.value && Date.now() < current.expiresAt - EXPIRY_MARGIN_MS) {
        return current.value
      }

      try {
        return await refreshSession()
      } catch {
        return null
      }
    },
    [refreshSession]
  )

  // Registered during render: child effects run before parent effects, and they
  // may already be issuing Google API calls.
  useMemo(() => setAccessTokenProvider(getAccessToken), [getAccessToken])

  useEffect(() => {
    const restore = () => {
      refreshSession().catch(() => {
        // A rejected session goes to login; a temporary failure remains on the
        // recovery screen and can be retried without starting OAuth again.
      })
    }
    const restoreWhenVisible = () => {
      if (document.visibilityState === 'visible') restore()
    }

    restore()
    window.addEventListener('online', restore)
    window.addEventListener('pageshow', restore)
    document.addEventListener('visibilitychange', restoreWhenVisible)

    return () => {
      window.removeEventListener('online', restore)
      window.removeEventListener('pageshow', restore)
      document.removeEventListener('visibilitychange', restoreWhenVisible)
    }
  }, [refreshSession])

  const signIn = useCallback(async ({ returnTo } = {}) => {
    setError(null)
    try {
      if (returnTo) {
        try {
          sessionStorage.setItem('hartaku.auth.returnTo', returnTo)
        } catch {
          // Storage can be blocked by strict browser privacy settings. Login
          // still works; only the post-login return route is lost.
        }
      }
      const { url } = await authApi.start()
      window.location.assign(url)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const completeSignIn = useCallback(
    async (code, state) => {
      const session = await authApi.callback(code, state)
      applySession(session)
    },
    [applySession]
  )

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      // The cached workbook belongs to the account that just left.
      clearCache()
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      status,
      user,
      isAdmin,
      error,
      setError,
      signIn,
      completeSignIn,
      signOut,
      retrySession: refreshSession,
      getAccessToken
    }),
    [status, user, isAdmin, error, signIn, completeSignIn, signOut, refreshSession, getAccessToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth () {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
