import { Navigate, Route, Routes } from 'react-router-dom'
import AuthCallback from './components/Auth/AuthCallback.jsx'
import LoginScreen from './components/Auth/LoginScreen.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import AppLayout from './components/Layout/AppLayout.jsx'
import ManagePage from './components/Manage/ManagePage.jsx'
import SettingsPage from './components/Settings/SettingsPage.jsx'
import TransactionFormPage from './components/Transaction/TransactionFormPage.jsx'
import TransactionList from './components/Transaction/TransactionList.jsx'
import { LoadingBlock } from './components/ui/Feedback.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { DataProvider } from './context/DataContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'

export default function App () {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  )
}

function AuthenticatedApp () {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <LoadingBlock label="Menyiapkan aplikasi…" />
      </div>
    )
  }

  if (status === 'anonymous') return <LoginScreen />

  return (
    <DataProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<TransactionList />} />
          <Route path="add" element={<TransactionFormPage />} />
          <Route path="transactions/:id/edit" element={<TransactionFormPage />} />
          <Route path="manage" element={<ManagePage />} />
          <Route path="categories" element={<Navigate to="/manage?tab=categories" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}
