import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import {
  mappedProviderCount,
  mergeEmailCandidates,
  scanEmailTransactions
} from '../../services/emailTransactionSync.js'

export default function EmailAutomationRunner () {
  const { hasGmailAccess, user } = useAuth()
  const { isLocal } = useStorage()
  const { settings, updateSettings } = useSettings()
  const { activeAccounts, activeCategories, transactions, loading, workbook } = useData()
  const toast = useToast()
  const busy = useRef(false)
  const startupScanKey = useRef('')

  const sync = useCallback(async ({ force = false, reportError = false } = {}) => {
    const lastSync = new Date(settings.emailLastSyncAt || 0).getTime()
    if (
      busy.current || isLocal || !hasGmailAccess || !settings.emailAutoEnabled ||
      settings.emailUser !== user?.email || loading || !workbook ||
      !mappedProviderCount(settings, activeAccounts) ||
      (!force && Number.isFinite(lastSync) && Date.now() - lastSync < 60_000)
    ) return

    busy.current = true
    try {
      const { candidates, result } = await scanEmailTransactions({
        settings,
        accounts: activeAccounts,
        categories: activeCategories,
        transactions
      })
      updateSettings((current) => ({
        ...current,
        emailPendingTransactions: mergeEmailCandidates(current.emailPendingTransactions, candidates),
        emailLastSyncAt: new Date().toISOString(),
        emailLastSyncResult: result
      }))
      if (candidates.length) {
        toast.success(`${candidates.length} transaksi email baru menunggu konfirmasi.`)
      }
    } catch (err) {
      if (reportError) toast.error(`Pemeriksaan email gagal: ${err.message}`)
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
    updateSettings,
    toast
  ])

  const autoReady = Boolean(
    !isLocal && hasGmailAccess && settings.emailAutoEnabled &&
    settings.emailUser === user?.email && !loading && workbook &&
    mappedProviderCount(settings, activeAccounts)
  )

  /*
   * A homescreen launch is a user asking for fresh state. It must not inherit
   * the interval's cooldown: otherwise a recently saved timestamp can make the
   * initial scan silently disappear. The key prevents the settings update at
   * the end of a scan from starting a second one during the same app mount.
   */
  useEffect(() => {
    if (!autoReady) return
    const key = `${user?.email || ''}:${workbook?.spreadsheetId || workbook?.id || 'workbook'}`
    if (startupScanKey.current === key) return
    startupScanKey.current = key
    sync({ force: true, reportError: true })
  }, [autoReady, user?.email, workbook, sync])

  useEffect(() => {
    const whenVisible = () => {
      if (document.visibilityState === 'visible') {
        sync({ force: true, reportError: true })
      }
    }
    const onPageShow = (event) => {
      if (event.persisted) sync({ force: true, reportError: true })
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') sync()
    }, 5 * 60_000)
    document.addEventListener('visibilitychange', whenVisible)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', whenVisible)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [sync])

  // The runner only discovers candidates. Review now lives on the dashboard so
  // a background scan never interrupts the user with a popup.
  return null
}
