import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
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

export default function App () {
  return (
    <SettingsProvider>
      <ToastProvider>
        <StorageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/admin" element={<AdminRoute />} />
              {/* Layout harness; excluded from production builds. */}
              {import.meta.env.DEV && <Route path="/__preview" element={<DevPreview />} />}
              {import.meta.env.DEV && <Route path="/__snapshot-preview" element={<PreviewLayout />} />}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </AuthProvider>
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
  const { status, isAdmin, signIn, signOut, error, retrySession } = useAuth()

  if (status === 'loading') {
    return <main className="flex min-h-dvh items-center justify-center"><LoadingBlock label="Memeriksa akses admin…" /></main>
  }

  if (status === 'recovering') return <SessionRecovery error={error} retry={retrySession} />

  if (status === 'anonymous') {
    return (
      <main className="flex min-h-dvh items-center justify-center px-page">
        <div className="card w-full max-w-sm text-center">
          <span className="text-4xl" aria-hidden="true">🔐</span>
          <h1 className="mt-3 text-page-title font-bold">Admin Hartaku</h1>
          <p className="mt-2 text-body text-subtitle">Masuk dengan akun Google yang terdaftar sebagai admin.</p>
          <Button className="mt-5 w-full justify-center" onClick={() => signIn({ returnTo: '/admin' })}>Masuk dengan Google</Button>
        </div>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-page">
        <div className="card w-full max-w-sm text-center">
          <span className="text-4xl" aria-hidden="true">⛔</span>
          <h1 className="mt-3 text-page-title font-bold">Akses ditolak</h1>
          <p className="mt-2 text-body text-subtitle">Akun ini bukan admin Hartaku.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => window.location.assign('/')}>Kembali</Button>
            <Button onClick={signOut}>Ganti akun</Button>
          </div>
        </div>
      </main>
    )
  }

  return <AdminPage />
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
