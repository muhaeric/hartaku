import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { EMAIL_PROVIDERS } from '../../lib/emailTransactionParser.js'
import { formatDate } from '../../lib/format.js'
import { mappedProviderCount, syncEmailTransactions } from '../../services/emailTransactionSync.js'
import Button from '../ui/Button.jsx'
import { RefreshIcon } from '../ui/icons.jsx'

export default function EmailAutomationSection () {
  const toast = useToast()
  const { hasGmailAccess, signIn, user } = useAuth()
  const { settings, updateSettings } = useSettings()
  const { activeAccounts, activeCategories, transactions, addTransactions, loading } = useData()
  const [syncing, setSyncing] = useState(false)
  const mappingCount = mappedProviderCount(settings, activeAccounts)

  useEffect(() => {
    if (!hasGmailAccess || !user?.email || settings.emailUser === user.email) return
    // Mappings name accounts in one user's workbook; never carry them silently
    // into another Google account using the same browser profile.
    updateSettings({
      emailUser: user.email,
      emailAutoEnabled: false,
      emailAccountMappings: {},
      emailLastSyncAt: null,
      emailLastSyncResult: null
    })
  }, [hasGmailAccess, user?.email, settings.emailUser, updateSettings])

  const connect = async () => {
    await signIn({ gmail: true, returnTo: '/settings' })
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
      toast.success('Pencatatan otomatis diaktifkan untuk email baru.')
    } else {
      updateSettings({ emailAutoEnabled: false })
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const result = await syncEmailTransactions({
        settings,
        accounts: activeAccounts,
        categories: activeCategories,
        transactions,
        addTransactions
      })
      const now = new Date().toISOString()
      updateSettings({ emailLastSyncAt: now, emailLastSyncResult: result })
      if (result.imported) toast.success(`${result.imported} transaksi baru dicatat dari email.`)
      else toast.show('Tidak ada transaksi email baru yang bisa dicatat.')
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
            Membaca notifikasi bank dan e-wallet saat Hartaku aktif. Isi email diproses di perangkat ini.
          </p>
        </div>
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
          <p className="text-caption text-subtitle">
            Gmail terhubung sebagai <span className="font-medium text-ink">{user?.email}</span>.
          </p>

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

          <label className="flex items-center justify-between gap-4 rounded-control bg-tint/[0.04] p-3">
            <span>
              <span className="block text-body font-medium">Catat otomatis</span>
              <span className="block text-caption text-subtitle">Hanya email baru yang dikenali dengan yakin.</span>
            </span>
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-brand"
              checked={settings.emailAutoEnabled}
              disabled={!settings.emailAutoEnabled && (!mappingCount || !activeCategories.length)}
              onChange={toggle}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              loading={syncing}
              disabled={!mappingCount || loading}
              onClick={syncNow}
            >
              <RefreshIcon className="h-4 w-4" />
              Sinkronkan sekarang
            </Button>
            {settings.emailLastSyncAt && (
              <span className="text-caption text-subtitle">
                Terakhir {formatSyncTime(settings.emailLastSyncAt, settings.dateFormat)}
              </span>
            )}
          </div>

          {settings.emailLastSyncResult && <SyncSummary result={settings.emailLastSyncResult} />}
          {!mappingCount && <p className="hint">Pilih minimal satu akun sebelum mengaktifkan sinkronisasi.</p>}
        </>
      )}

      <p className="hint">
        Hartaku mengabaikan email gagal, nominal ambigu, pengirim yang belum dipetakan, dan transaksi tanpa kategori yang cocok. Periksa catatan secara berkala selama fitur masih beta.
      </p>
    </div>
  )
}

function SyncSummary ({ result }) {
  const skipped = (result.unmapped || 0) + (result.unrecognized || 0) + (result.uncategorized || 0)
  return (
    <p className="rounded-control bg-tint/[0.04] p-3 text-caption text-subtitle">
      Pemindaian terakhir: {result.scanned || 0} email diperiksa, {result.imported || 0} dicatat,
      {' '}{result.duplicates || 0} duplikat, dan {skipped} dilewati.
    </p>
  )
}

function formatSyncTime (iso, dateFormat) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const localIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `${formatDate(localIso, dateFormat)} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}
