import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { EMAIL_PROVIDERS } from '../../lib/emailTransactionParser.js'
import { formatDate } from '../../lib/format.js'
import {
  mappedProviderCount,
  mergeEmailCandidates,
  scanEmailTransactions
} from '../../services/emailTransactionSync.js'
import Button from '../ui/Button.jsx'
import { RefreshIcon } from '../ui/icons.jsx'
import { EMAIL_REVIEW_EVENT } from './EmailAutomationRunner.jsx'

export default function EmailAutomationSection () {
  const toast = useToast()
  const { hasGmailAccess, signIn, signOut, user } = useAuth()
  const { settings, updateSettings } = useSettings()
  const { activeAccounts, activeCategories, transactions, loading } = useData()
  const [syncing, setSyncing] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const mappingCount = mappedProviderCount(settings, activeAccounts)
  const pendingCount = settings.emailUser === user?.email
    ? (settings.emailPendingTransactions || []).length
    : 0
  const dismissedCount = settings.emailUser === user?.email
    ? (settings.emailDismissedSourceIds || []).length
    : 0

  useEffect(() => {
    if (!hasGmailAccess || !user?.email || settings.emailUser === user.email) return
    // Mappings name accounts in one user's workbook; never carry them silently
    // into another Google account using the same browser profile.
    updateSettings({
      emailUser: user.email,
      emailAutoEnabled: false,
      emailAccountMappings: {},
      emailLastSyncAt: null,
      emailLastSyncResult: null,
      emailPendingTransactions: [],
      emailDismissedSourceIds: []
    })
  }, [hasGmailAccess, user?.email, settings.emailUser, updateSettings])

  const connect = async () => {
    await signIn({ gmail: true, returnTo: '/settings' })
  }

  const disconnect = async () => {
    const confirmed = window.confirm(
      'Putuskan Gmail dari Hartaku? Izin Google akan dicabut, kandidat transaksi email di perangkat ini akan dihapus, lalu kamu diminta masuk lagi tanpa akses Gmail.'
    )
    if (!confirmed) return

    setDisconnecting(true)
    try {
      // Google does not support revoking just one scope from a combined grant.
      // Revoke the grant, clear all Gmail-derived local state, then immediately
      // request the normal Drive-only session again.
      await signOut()
      updateSettings({
        emailUser: '',
        emailAutoEnabled: false,
        emailAccountMappings: {},
        emailLastSyncAt: null,
        emailLastSyncResult: null,
        emailPendingTransactions: [],
        emailDismissedSourceIds: []
      })
      await signIn({ returnTo: '/settings' })
      setDisconnecting(false)
    } catch (err) {
      toast.error(err.message || 'Gmail belum berhasil diputuskan.')
      setDisconnecting(false)
    }
  }

  const setMapping = (provider, account) => {
    updateSettings((current) => ({
      ...current,
      emailAccountMappings: { ...current.emailAccountMappings, [provider]: account }
    }))
  }

  const toggle = () => {
    if (!settings.emailAutoEnabled) {
      updateSettings({
        emailUser: user?.email || '',
        emailAutoEnabled: true,
        emailLastSyncAt: new Date().toISOString()
      })
      toast.success('Pemantauan email diaktifkan. Transaksi tetap menunggu konfirmasi.')
    } else {
      updateSettings({ emailAutoEnabled: false })
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const { candidates, result } = await scanEmailTransactions({
        settings,
        accounts: activeAccounts,
        categories: activeCategories,
        transactions
      })
      const now = new Date().toISOString()
      updateSettings((current) => ({
        ...current,
        emailPendingTransactions: mergeEmailCandidates(current.emailPendingTransactions, candidates),
        emailLastSyncAt: now,
        emailLastSyncResult: result
      }))
      if (candidates.length) {
        toast.success(`${candidates.length} transaksi email baru menunggu konfirmasi.`)
      } else {
        toast.show('Tidak ada transaksi email baru yang perlu dikonfirmasi.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const retryDismissed = async () => {
    setSyncing(true)
    try {
      const retrySettings = {
        ...settings,
        emailDismissedSourceIds: [],
        emailLastSyncAt: null
      }
      const { candidates, result } = await scanEmailTransactions({
        settings: retrySettings,
        accounts: activeAccounts,
        categories: activeCategories,
        transactions
      })
      const now = new Date().toISOString()
      updateSettings((current) => ({
        ...current,
        emailDismissedSourceIds: [],
        emailPendingTransactions: mergeEmailCandidates(current.emailPendingTransactions, candidates),
        emailLastSyncAt: now,
        emailLastSyncResult: result
      }))
      if (candidates.length) {
        toast.success(`${candidates.length} transaksi email ditampilkan kembali untuk dikonfirmasi.`)
      } else {
        toast.show('Email yang diabaikan sudah diperiksa ulang, tetapi tidak ada kandidat baru.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-gap-normal">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-xl">
          ✉️
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body font-medium">Ambil transaksi dari email</p>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-onsoft">
              Beta
            </span>
          </div>
          <p className="text-caption text-subtitle">
            Mendeteksi notifikasi bank dan e-wallet saat Hartaku aktif. Transaksi baru selalu menunggu konfirmasi.
          </p>
        </div>
      </div>

      <div className="rounded-control border border-hairline bg-brand-soft/40 p-3 text-caption text-subtitle">
        Hartaku membaca pengirim, subjek, waktu, dan isi notifikasi transaksi terbaru hanya
        setelah kamu menghubungkan Gmail. Pemrosesan berlangsung di browser dan hasilnya
        selalu menunggu konfirmasimu sebelum dicatat.{' '}
        <a className="font-medium text-brand underline" href="/privacy#google-user-data">
          Cara data Gmail digunakan dan dilindungi
        </a>
      </div>

      {!hasGmailAccess ? (
        <div className="space-y-2 rounded-control bg-tint/[0.04] p-3">
          <p className="text-caption text-subtitle">
            Hubungkan Gmail untuk memberi izin baca-saja. Izin ini terpisah dari akses spreadsheet.
          </p>
          <Button className="w-full justify-center sm:w-auto" onClick={connect}>
            Hubungkan Gmail
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-caption text-subtitle">
              Gmail terhubung sebagai <span className="font-medium text-ink">{user?.email}</span>.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-expense"
              loading={disconnecting}
              onClick={disconnect}
            >
              Putuskan Gmail
            </Button>
          </div>

          <div>
            <p className="label">Hubungkan pengirim ke akun Hartaku</p>
            <div className="divide-y divide-hairline rounded-control border border-hairline">
              {EMAIL_PROVIDERS.map((provider) => (
                <label key={provider.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0 text-caption font-medium">{provider.label}</span>
                  <select
                    aria-label={`Akun untuk ${provider.label}`}
                    className="field h-9 w-1/2 max-w-[210px] py-0"
                    value={settings.emailAccountMappings?.[provider.id] || ''}
                    onChange={(event) => setMapping(provider.id, event.target.value)}
                  >
                    <option value="">Abaikan</option>
                    {activeAccounts.map((account) => (
                      <option key={account.id || account.name} value={account.name}>{account.name}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-control bg-tint/[0.04] p-3">
            <span>
              <span className="block text-body font-medium">Pantau email otomatis</span>
              <span className="block text-caption text-subtitle">Hartaku hanya menyiapkan kandidat; kamu yang memutuskan pencatatannya.</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className={`text-caption font-semibold ${settings.emailAutoEnabled ? 'text-brand' : 'text-subtitle'}`}>
                {settings.emailAutoEnabled ? 'ON' : 'OFF'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.emailAutoEnabled}
                aria-label="Pantau email otomatis"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${settings.emailAutoEnabled ? 'bg-brand' : 'bg-tint/20'} disabled:cursor-not-allowed disabled:opacity-50`}
                disabled={!settings.emailAutoEnabled && (!mappingCount || !activeCategories.length)}
                onClick={toggle}
              >
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 rounded-full bg-surface shadow-sm transition-transform ${settings.emailAutoEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}
                />
              </button>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              disabled={!mappingCount || loading}
              onClick={syncNow}
            >
              <RefreshIcon className="h-4 w-4" />
              Periksa email sekarang
            </Button>
            {pendingCount > 0 && (
              <Button
                variant="soft"
                size="sm"
                onClick={() => window.dispatchEvent(new Event(EMAIL_REVIEW_EVENT))}
              >
                Tinjau {pendingCount} transaksi
              </Button>
            )}
            {dismissedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                loading={syncing}
                disabled={!mappingCount || loading}
                onClick={retryDismissed}
              >
                Periksa ulang {dismissedCount} email diabaikan
              </Button>
            )}
            {settings.emailLastSyncAt && (
              <span className="text-caption text-subtitle">
                Terakhir {formatSyncTime(settings.emailLastSyncAt, settings.dateFormat)}
              </span>
            )}
          </div>

          {settings.emailLastSyncResult && (
            <SyncSummary result={settings.emailLastSyncResult} pendingCount={pendingCount} />
          )}
          {!mappingCount && <p className="hint">Pilih minimal satu akun sebelum mengaktifkan sinkronisasi.</p>}
        </>
      )}

      <p className="hint">
        Tidak ada transaksi email yang ditulis ke spreadsheet sebelum kamu menekan “Catat transaksi”. Email gagal, nominal ambigu, dan pengirim yang belum dipetakan tetap dilewati; kategori yang belum dikenali harus kamu pilih saat konfirmasi.
      </p>
    </div>
  )
}

function SyncSummary ({ result, pendingCount }) {
  const skipped = (result.unmapped || 0) + (result.unrecognized || 0) + (result.uncategorized || 0)
  return (
    <p className="rounded-control bg-tint/[0.04] p-3 text-caption text-subtitle">
      Pemindaian terakhir: {result.scanned || 0} email diperiksa, {result.found || 0} kandidat ditemukan,
      {' '}{result.duplicates || 0} sudah ditangani, dan {skipped} dilewati.
      {(result.needsCategory || 0) > 0 && <> {result.needsCategory} kandidat perlu dipilih kategorinya.</>}
      {pendingCount > 0 && <> Saat ini {pendingCount} menunggu konfirmasi.</>}
    </p>
  )
}

function formatSyncTime (iso, dateFormat) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const localIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `${formatDate(localIso, dateFormat)} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}
