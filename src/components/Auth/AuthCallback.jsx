import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../ui/Button.jsx'
import { LoadingBlock } from '../ui/Feedback.jsx'

/** Landing route for Google's OAuth redirect. */
export default function AuthCallback () {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { completeSignIn } = useAuth()
  const [error, setError] = useState(null)
  const started = useRef(false)

  useEffect(() => {
    // StrictMode double-invokes effects; the code is single-use.
    if (started.current) return
    started.current = true

    const denied = params.get('error')
    if (denied) {
      setError(
        denied === 'access_denied'
          ? 'Kamu menolak izin akses. Login dibatalkan.'
          : `Google menolak login: ${denied}`
      )
      return
    }

    const code = params.get('code')
    const state = params.get('state')
    if (!code || !state) {
      setError('Balasan dari Google tidak lengkap. Silakan login lagi.')
      return
    }

    completeSignIn(code, state)
      .then(() => navigate('/', { replace: true }))
      .catch((err) => setError(err.message))
  }, [params, completeSignIn, navigate])

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          🔒
        </span>
        <h1 className="text-lg font-semibold">Login gagal</h1>
        <p className="max-w-sm text-body text-subtitle">{error}</p>
        <Button onClick={() => navigate('/', { replace: true })}>Kembali ke halaman login</Button>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <LoadingBlock label="Menyelesaikan login…" />
    </main>
  )
}
