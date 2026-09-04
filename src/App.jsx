import { useCallback, useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AuthCallback from './components/Auth/AuthCallback.jsx'
import LoginScreen from './components/Auth/LoginScreen.jsx'
import AdminPage from './components/Admin/AdminPage.jsx'
import LocalMigration from './components/Setup/LocalMigration.jsx'
import CategoryDetail from './components/Category/CategoryDetail.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import DevPreview from './components/DevPreview.jsx'
import ImportMoneyManager from './components/Import/ImportMoneyManager.jsx'
import ImportScreenshot from './components/Import/ImportScreenshot.jsx'
import AppLayout from './components/Layout/AppLayout.jsx'
import ManagePage from './components/Manage/ManagePage.jsx'
import SettingsPage from './components/Settings/SettingsPage.jsx'
import FinancialSnapshot from './components/Snapshot/FinancialSnapshot.jsx'
import SnapshotPreview from './components/Snapshot/SnapshotPreview.jsx'
import TransactionFormPage from './components/Transaction/TransactionFormPage.jsx'
import TransactionList from './components/Transaction/TransactionList.jsx'
import { LoadingBlock } from './components/ui/Feedback.jsx'
import Button from './components/ui/Button.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { StorageProvider, useStorage } from './context/StorageContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { adminApi } from './services/appApi.js'

export default function App () {
  return (
    <SettingsProvider>
      <ToastProvider>
        <StorageProvider>
          <Routes>
            <Route path="/admin" element={<AdminRoute />} />
            <Route element={<UserAuthBoundary />}>
              <Route path="/auth/callback" element={<AuthCallback />} />
              {/* Layout harness; excluded from production builds. */}
              {import.meta.env.DEV && <Route path="/__preview" element={<DevPreview />} />}
              {import.meta.env.DEV && <Route path="/__snapshot-preview" element={<PreviewLayout />} />}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Route>
          </Routes>
        </StorageProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}

function PreviewLayout () {
  return (
    <main className="mx-auto w-full max-w-2xl px-page py-4">
      <SnapshotPreview />
    </main>
  )
}

function AdminRoute () {
  const [status, setStatus] = useState('loading')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const expireSession = useCallback(() => setStatus('anonymous'), [])

  useEffect(() => {
    let active = true
    adminApi.session()
      .then(() => {
        if (active) setStatus('authenticated')
      })
      .catch((err) => {
        if (!active) return
        setStatus('anonymous')
        if (err.status !== 401) setError(err.message)
      })
    return () => { active = false }
  }, [])

  const signIn = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await adminApi.login(pin)
      setPin('')
      setStatus('authenticated')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const signOut = async () => {
    try {
      await adminApi.logout()
    } finally {
      setPin('')
      setError('')
      setStatus('anonymous')
    }
  }

  if (status === 'loading') {
    return <main className="flex min-h-dvh items-center justify-center"><LoadingBlock label="Memeriksa akses admin…" /></main>
  }

  if (status === 'anonymous') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-page">
        <form className="card w-full max-w-sm text-center" onSubmit={signIn}>
          <span className="text-4xl" aria-hidden="true">🔐</span>
          <h1 className="mt-3 text-page-title font-bold">Admin Hartaku</h1>
          <p className="mt-2 text-body text-subtitle">Masukkan PIN admin untuk membuka dashboard.</p>
          <label className="sr-only" htmlFor="admin-pin">PIN admin</label>
          <input
            id="admin-pin"
            className="field mt-5 w-full text-center text-lg tracking-[0.3em]"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={128}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
            placeholder="PIN"
            autoFocus
            required
          />
          {error && <p className="mt-3 text-caption text-expense" role="alert">{error}</p>}
          <Button className="mt-4 w-full justify-center" type="submit" loading={submitting} disabled={!pin}>
            Masuk
          </Button>
        </form>
      </main>
    )
  }

  return <AdminPage onSignOut={signOut} onSessionExpired={expireSession} />
}

function UserAuthBoundary () {
  return <AuthProvider><Outlet /></AuthProvider>
}

/**
 * The gate. In Google mode it is a session; in device mode there is nothing to
 * check - the browser profile is the credential, so the app opens straight
 * away and never waits on an auth call it does not need.
 */
function AuthenticatedApp () {
  const { status, error, retrySession } = useAuth()
  const { isLocal, migrating, startMigration } = useStorage()

  // Consent was declined or the tab came back without a session: drop the
  // pending migration rather than showing that screen on every future open.
  useEffect(() => {
    if (isLocal && migrating && status === 'anonymous') startMigration(false)
  }, [isLocal, migrating, status, startMigration])

  if (status === 'loading' && (!isLocal || migrating)) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="Menyiapkan aplikasi…" />
      </div>
    )
  }

  if (status === 'recovering' && (!isLocal || migrating)) {
    return <SessionRecovery error={error} retry={retrySession} />
  }

  if (!isLocal && status === 'anonymous') return <LoginScreen />
  if (isLocal && migrating && status === 'authenticated') return <LocalMigration />

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<TransactionList />} />
          <Route path="add" element={<TransactionFormPage />} />
          <Route path="import" element={<ImportScreenshot />} />
          <Route path="import/money-manager" element={<ImportMoneyManager />} />
          <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
          <Route path="manage" element={<ManagePage />} />
          <Route path="categories" element={<Navigate to="/manage?tab=categories" replace />} />
          <Route path="categories/:name" element={<CategoryDetail />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="snapshot" element={<FinancialSnapshot />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

function SessionRecovery ({ error, retry }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-page">
      <div className="card w-full max-w-sm text-center">
        <span className="text-4xl" aria-hidden="true">📶</span>
        <h1 className="mt-3 text-page-title font-bold">Menyambungkan kembali sesi</h1>
        <p className="mt-2 text-body text-subtitle">
          {error || 'Sesi kamu masih tersimpan, tetapi belum bisa diperiksa saat ini.'}
        </p>
        <Button className="mt-5 w-full justify-center" onClick={() => retry().catch(() => {})}>
          Coba lagi
        </Button>
      </div>
    </main>
  )
}
