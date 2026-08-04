import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from '../services/appApi.js'
import { setAccessTokenProvider } from '../services/googleApi.js'

const AuthContext = createContext(null)

/** Refresh a minute early so a request never starts with an almost-dead token. */
const EXPIRY_MARGIN_MS = 60_000

export function AuthProvider ({ children }) {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)

  // The Google access token stays in memory only - never localStorage.
  const token = useRef({ value: null, expiresAt: 0 })
  const inflight = useRef(null)

  const applySession = useCallback((session) => {
    token.current = { value: session.accessToken, expiresAt: session.expiresAt }
    setUser(session.user)
    setStatus('authenticated')
    setError(null)
  }, [])

  const clearSession = useCallback(() => {
    token.current = { value: null, expiresAt: 0 }
    setUser(null)
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
        clearSession()
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
    refreshSession().catch(() => {
      // No session yet - the login screen handles it.
    })
  }, [refreshSession])

  const signIn = useCallback(async () => {
    setError(null)
    try {
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
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      setError,
      signIn,
      completeSignIn,
      signOut,
      getAccessToken
    }),
    [status, user, error, signIn, completeSignIn, signOut, getAccessToken]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth () {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
