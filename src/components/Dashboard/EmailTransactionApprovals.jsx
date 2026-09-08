import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatCurrency, formatDate } from '../../lib/format.js'
import {
  mappedProviderCount,
  mergeEmailCandidates,
  scanEmailTransactions
} from '../../services/emailTransactionSync.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'
import Carousel from '../ui/Carousel.jsx'
import { RefreshIcon } from '../ui/icons.jsx'

export const EMAIL_APPROVALS_HASH = '#email-transaction-approvals'

export default function EmailTransactionApprovals () {
  const { hasGmailAccess, user } = useAuth()
  const { activeAccounts, activeCategories, transactions, addTransactions, loading } = useData()
  const { settings, updateSettings } = useSettings()
  const toast = useToast()
  const section = useRef(null)
  const [busySourceId, setBusySourceId] = useState('')
  const [syncing, setSyncing] = useState(false)
  const enabled = Boolean(settings.emailAutoEnabled && settings.emailUser === user?.email)
  const pending = useMemo(
    () => settings.emailUser === user?.email ? settings.emailPendingTransactions || [] : [],
    [settings.emailPendingTransactions, settings.emailUser, user?.email]
  )
  const canSync = hasGmailAccess && !loading && mappedProviderCount(settings, activeAccounts) > 0

  useEffect(() => {
    if (pending.length && window.location.hash === EMAIL_APPROVALS_HASH) {
      section.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [pending.length])

  const updateCandidate = (sourceId, patch) => {
    if (busySourceId) return
    updateSettings((current) => ({
      ...current,
      emailPendingTransactions: (current.emailPendingTransactions || []).map((item) =>
        item.sourceId === sourceId ? { ...item, ...patch } : item
      )
    }))
  }

  const confirmCandidate = async (candidate) => {
    if (!candidate.category || busySourceId) return
    setBusySourceId(candidate.sourceId)
    try {
      await addTransactions([candidate])
      updateSettings((current) => ({
        ...current,
        emailPendingTransactions: (current.emailPendingTransactions || [])
          .filter((item) => item.sourceId !== candidate.sourceId),
        emailLastSyncResult: {
          ...(current.emailLastSyncResult || {}),
          confirmed: (current.emailLastSyncResult?.confirmed || 0) + 1
        }
      }))
      toast.success('Transaksi email dicatat.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusySourceId('')
    }
  }

  const dismissCandidate = (candidate) => {
    if (busySourceId) return
    updateSettings((current) => ({
      ...current,
      emailPendingTransactions: (current.emailPendingTransactions || [])
        .filter((item) => item.sourceId !== candidate.sourceId),
      emailDismissedSourceIds: [...new Set([
        ...(current.emailDismissedSourceIds || []),
        candidate.sourceId
      ])].slice(-500),
      emailLastSyncResult: {
        ...(current.emailLastSyncResult || {}),
        rejected: (current.emailLastSyncResult?.rejected || 0) + 1
      }
    }))
  }

  const syncNow = async () => {
    if (!canSync || syncing) return
    setSyncing(true)
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
      } else {
        toast.show('Tidak ada transaksi email baru yang perlu dikonfirmasi.')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  if (!enabled) return null

  return (
    <section
      ref={section}
      id={EMAIL_APPROVALS_HASH.slice(1)}
      className="scroll-mt-4 space-y-gap-normal"
      aria-live="polite"
    >
      <SectionHeader
        title="Transaksi otomatis menunggu persetujuan"
        hint={pending.length ? 'Periksa satu per satu sebelum transaksi dicatat.' : 'Transaksi baru dari email akan muncul di sini.'}
        action={
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-caption font-semibold text-brand-onsoft">
            {pending.length ? `${pending.length} menunggu` : 'Aktif'}
          </span>
        }
      />
      {pending.length ? (
        <Card flush>
          <Carousel
            label="Transaksi otomatis yang menunggu persetujuan"
            slides={pending.map((candidate, index) => ({
              key: candidate.sourceId,
              title: `Transaksi ${index + 1} dari ${pending.length}`,
              content: (
                <TransactionApprovalCard
                  candidate={candidate}
                  categories={categoriesFor(activeCategories, candidate.type)}
                  currency={settings.currency}
                  dateFormat={settings.dateFormat}
                  busy={Boolean(busySourceId)}
                  saving={busySourceId === candidate.sourceId}
                  onChange={(patch) => updateCandidate(candidate.sourceId, patch)}
                  onConfirm={() => confirmCandidate(candidate)}
                  onDismiss={() => dismissCandidate(candidate)}
                />
              )
            }))}
          />
        </Card>
      ) : (
        <Card className="flex flex-col items-center py-6 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-xl" aria-hidden="true">
            ✉️
          </span>
          <h3 className="mt-3 text-body font-semibold">Belum ada transaksi yang perlu disetujui</h3>
          <p className="mt-1 max-w-sm text-caption text-subtitle">
            Hartaku akan menampilkan transaksi baru setelah menemukan notifikasi bank atau e-wallet yang sesuai.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            loading={syncing}
            disabled={!canSync}
            onClick={syncNow}
          >
            <RefreshIcon className="h-4 w-4" />
            Cek email sekarang
          </Button>
        </Card>
      )}
    </section>
  )
}

function TransactionApprovalCard ({
  candidate,
  categories,
  currency,
  dateFormat,
  busy,
  saving,
  onChange,
  onConfirm,
  onDismiss
}) {
  return (
    <article className="mx-page mb-4 mt-2 space-y-3 rounded-control border border-hairline bg-tint/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption text-subtitle">{typeLabel(candidate.type)}</p>
          <p className="mt-0.5 break-words text-body font-semibold text-ink">{candidate.description}</p>
        </div>
        <p className={`amount shrink-0 text-body font-bold ${candidate.type === 'income' ? 'text-income' : 'text-expense'}`}>
          {candidate.type === 'income' ? '+' : '−'}{formatCurrency(candidate.amount, currency)}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-caption">
        <dt className="text-subtitle">Tanggal</dt>
        <dd className="text-right font-medium">{formatDate(candidate.date, dateFormat)}</dd>
        <dt className="text-subtitle">Akun</dt>
        <dd className="text-right font-medium">{candidate.account}</dd>
        <dt className="self-center text-subtitle">Kategori</dt>
        <dd>
          <select
            aria-label={`Kategori untuk ${candidate.description}`}
            className="field h-9 py-0 text-caption"
            value={candidate.category}
            disabled={busy}
            onChange={(event) => onChange({ category: event.target.value })}
          >
            <option value="">Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.name} value={category.name}>{category.name}</option>
            ))}
          </select>
        </dd>
      </dl>

      {!candidate.category && (
        <p className="text-caption text-expense">Pilih kategori sebelum mencatat transaksi ini.</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 justify-center"
          disabled={busy}
          onClick={onDismiss}
        >
          Abaikan
        </Button>
        <Button
          size="sm"
          className="flex-1 justify-center"
          loading={saving}
          disabled={busy || !candidate.category}
          onClick={onConfirm}
        >
          Catat transaksi
        </Button>
      </div>
    </article>
  )
}

function typeLabel (type) {
  if (type === 'income') return 'Pemasukan terdeteksi'
  if (type === 'transfer') return 'Transfer terdeteksi'
  return 'Pengeluaran terdeteksi'
}

function categoriesFor (categories, type) {
  return categories.filter(
    (category) => !category.archived && (category.type === type || category.type === 'both')
  )
}
