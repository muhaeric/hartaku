import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency, formatDate } from '../../lib/format.js'
import {
  mappedProviderCount,
  mergeEmailCandidates,
  scanEmailTransactions
} from '../../services/emailTransactionSync.js'
import Button from '../ui/Button.jsx'
import Sheet from '../ui/Sheet.jsx'

export const EMAIL_REVIEW_EVENT = 'hartaku:review-email-transactions'

export default function EmailAutomationRunner () {
  const { hasGmailAccess, user } = useAuth()
  const { isLocal } = useStorage()
  const { settings, updateSettings } = useSettings()
  const { activeAccounts, activeCategories, transactions, addTransactions, loading, workbook } = useData()
  const toast = useToast()
  const busy = useRef(false)
  const startupScanKey = useRef('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const pending = useMemo(
    () => settings.emailUser === user?.email ? settings.emailPendingTransactions || [] : [],
    [settings.emailPendingTransactions, settings.emailUser, user?.email]
  )
  const pendingKey = pending.map((item) => item.sourceId).join('|')

  useEffect(() => {
    if (pendingKey) setReviewOpen(true)
  }, [pendingKey])

  useEffect(() => {
    const openReview = () => setReviewOpen(true)
    window.addEventListener(EMAIL_REVIEW_EVENT, openReview)
    return () => window.removeEventListener(EMAIL_REVIEW_EVENT, openReview)
  }, [])

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

  const current = pending[0]

  const confirmCurrent = async () => {
    if (!current || reviewBusy) return
    setReviewBusy(true)
    try {
      await addTransactions([current])
      updateSettings((settings) => ({
        ...settings,
        emailPendingTransactions: (settings.emailPendingTransactions || [])
          .filter((item) => item.sourceId !== current.sourceId),
        emailLastSyncResult: {
          ...(settings.emailLastSyncResult || {}),
          confirmed: (settings.emailLastSyncResult?.confirmed || 0) + 1
        }
      }))
      toast.success('Transaksi email dicatat.')
      if (pending.length === 1) setReviewOpen(false)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setReviewBusy(false)
    }
  }

  const dismissCurrent = () => {
    if (!current || reviewBusy) return
    updateSettings((settings) => {
      const dismissed = [...new Set([
        ...(settings.emailDismissedSourceIds || []),
        current.sourceId
      ])].slice(-500)

      return {
        ...settings,
        emailPendingTransactions: (settings.emailPendingTransactions || [])
          .filter((item) => item.sourceId !== current.sourceId),
        emailDismissedSourceIds: dismissed,
        emailLastSyncResult: {
          ...(settings.emailLastSyncResult || {}),
          rejected: (settings.emailLastSyncResult?.rejected || 0) + 1
        }
      }
    })
    if (pending.length === 1) setReviewOpen(false)
  }

  return (
    <Sheet
      open={reviewOpen && Boolean(current)}
      title="Konfirmasi transaksi email"
      description={pending.length > 1 ? `${pending.length} transaksi menunggu ditinjau satu per satu.` : 'Periksa detail sebelum mencatat.'}
      onClose={() => { if (!reviewBusy) setReviewOpen(false) }}
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1 justify-center"
            disabled={reviewBusy}
            onClick={dismissCurrent}
          >
            Abaikan
          </Button>
          <Button
            className="flex-1 justify-center"
            loading={reviewBusy}
            onClick={confirmCurrent}
          >
            Catat transaksi
          </Button>
        </div>
      }
    >
      {current && (
        <div className="space-y-3 rounded-control border border-hairline bg-tint/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption text-subtitle">{typeLabel(current.type)}</p>
              <p className="mt-0.5 text-body font-semibold text-ink">{current.description}</p>
            </div>
            <p className={`shrink-0 text-body font-bold ${current.type === 'income' ? 'text-income' : 'text-expense'}`}>
              {current.type === 'income' ? '+' : '−'}{formatCurrency(current.amount, settings.currency)}
            </p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-caption">
            <dt className="text-subtitle">Tanggal</dt>
            <dd className="text-right font-medium">{formatDate(current.date, settings.dateFormat)}</dd>
            <dt className="text-subtitle">Akun</dt>
            <dd className="text-right font-medium">{current.account}</dd>
            <dt className="text-subtitle">Kategori</dt>
            <dd className="text-right font-medium">{current.category}</dd>
          </dl>
        </div>
      )}
    </Sheet>
  )
}

function typeLabel (type) {
  if (type === 'income') return 'Pemasukan terdeteksi'
  if (type === 'transfer') return 'Transfer terdeteksi'
  return 'Pengeluaran terdeteksi'
}
