import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { mappedProviderCount, syncEmailTransactions } from '../../services/emailTransactionSync.js'

export default function EmailAutomationRunner () {
  const { hasGmailAccess, user } = useAuth()
  const { isLocal } = useStorage()
  const { settings, updateSettings } = useSettings()
  const { activeAccounts, activeCategories, transactions, addTransactions, loading, workbook } = useData()
  const toast = useToast()
  const busy = useRef(false)

  const sync = useCallback(async () => {
    const lastSync = new Date(settings.emailLastSyncAt || 0).getTime()
    if (
      busy.current || isLocal || !hasGmailAccess || !settings.emailAutoEnabled ||
      settings.emailUser !== user?.email || loading || !workbook ||
      !mappedProviderCount(settings, activeAccounts) ||
      (Number.isFinite(lastSync) && Date.now() - lastSync < 60_000)
    ) return

    busy.current = true
    try {
      const result = await syncEmailTransactions({
        settings,
        accounts: activeAccounts,
        categories: activeCategories,
        transactions,
        addTransactions
      })
      updateSettings({
        emailLastSyncAt: new Date().toISOString(),
        emailLastSyncResult: result
      })
      if (result.imported) toast.success(`${result.imported} transaksi baru dicatat dari email.`)
    } catch {
      // Background sync stays quiet. The explicit Settings action reports errors.
    } finally {
      busy.current = false
    }
  }, [
    isLocal,
    hasGmailAccess,
    user?.email,
    settings,
    loading,
    workbook,
    activeAccounts,
    activeCategories,
    transactions,
    addTransactions,
    updateSettings,
    toast
  ])

  useEffect(() => {
    sync()
    const whenVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }
    const timer = window.setInterval(whenVisible, 5 * 60_000)
    document.addEventListener('visibilitychange', whenVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', whenVisible)
    }
  }, [sync])

  return null
}
