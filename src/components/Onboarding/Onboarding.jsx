import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { ACCOUNT_KINDS, CATEGORY_COLORS, CURRENCIES, LIMITS } from '../../lib/constants.js'
import { isImageIcon } from '../../lib/accountIcon.js'
import { formatAmountInput, formatCurrency, parseAmount } from '../../lib/format.js'
import {
  ONBOARDING,
  onboardingDecision,
  readOnboarding,
  subscribeOnboarding,
  writeOnboarding
} from '../../lib/onboarding.js'
import Button from '../ui/Button.jsx'
import { CheckIcon, ChevronLeftIcon, PlusIcon, ScanIcon, TrashIcon } from '../ui/icons.jsx'

/**
 * Stands in front of the app until the first-run walkthrough is done or
 * skipped. Anyone who already has transactions is marked done without ever
 * seeing it - they are not new, whatever this browser remembers.
 */
export function OnboardingGate ({ children }) {
  const { workbook, loading, transactions } = useData()
  const [status, setStatus] = useState(readOnboarding)

  useEffect(() => subscribeOnboarding(setStatus), [])

  const decision = onboardingDecision({
    status,
    // Cached data arrives with `loading` still set; a stale empty cache is not
    // proof of a new user, so the decision waits for the real fetch.
    ready: Boolean(workbook) && !loading,
    transactionCount: transactions.length
  })

  useEffect(() => {
    if (decision === 'skip') writeOnboarding(ONBOARDING.done)
  }, [decision])

  if (decision === 'show') return <Onboarding onDone={() => writeOnboarding(ONBOARDING.done)} />
  return children
}

const STEPS = ['welcome', 'currency', 'accounts', 'ready']

export default function Onboarding ({ onDone }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const key = STEPS[step]

  const finish = (to = '/') => {
    onDone()
    navigate(to)
  }

  const next = () => setStep((current) => Math.min(STEPS.length - 1, current + 1))
  const back = () => setStep((current) => Math.max(0, current - 1))

  // Each step starts at the top; the accounts list can leave the page scrolled.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-page py-6">
      <header className="flex items-center gap-3">
        {step > 0 && key !== 'ready' ? (
          <Button variant="ghost" size="icon" onClick={back} aria-label="Kembali">
            <ChevronLeftIcon className="h-5 w-5" />
          </Button>
        ) : (
          <span className="h-9 w-9" aria-hidden="true" />
        )}

        <Progress step={step} total={STEPS.length} />

        {key !== 'ready' ? (
          <Button variant="ghost" size="sm" onClick={() => finish()}>
            Lewati
          </Button>
        ) : (
          <span className="w-[58px]" aria-hidden="true" />
        )}
      </header>

      <div className="flex flex-1 flex-col pt-6" key={key}>
        {key === 'welcome' && <WelcomeStep onNext={next} />}
        {key === 'currency' && <CurrencyStep onNext={next} />}
        {key === 'accounts' && <AccountsStep onNext={next} />}
        {key === 'ready' && <ReadyStep onFinish={finish} />}
      </div>
    </main>
  )
}

function Progress ({ step, total }) {
  return (
    <div className="flex-1">
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step + 1}
        aria-label={`Langkah ${step + 1} dari ${total}`}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index <= step ? 'bg-brand' : 'bg-tint/15'
            }`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] leading-4 text-subtitle">
        Langkah {step + 1} dari {total}
      </p>
    </div>
  )
}

/** Title block shared by every step, so they all read at the same rank. */
function StepHeading ({ icon, title, children }) {
  return (
    <div className="mb-5">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-card bg-brand-soft text-[24px]">
        {icon}
      </div>
      <h1 className="text-page-title font-bold tracking-tight">{title}</h1>
      {children && <p className="mt-1.5 text-body text-subtitle">{children}</p>}
    </div>
  )
}

/** Primary action pinned to the bottom of the step, where the thumb already is. */
function StepFooter ({ children }) {
  return (
    <div className="mt-auto flex flex-col gap-gap pb-[env(safe-area-inset-bottom)] pt-6">
      {children}
    </div>
  )
}

function WelcomeStep ({ onNext }) {
  const { user } = useAuth()
  const { isLocal } = useStorage()
  const firstName = String(user?.name || '').trim().split(/\s+/)[0]

  const points = [
    {
      icon: isLocal ? '📱' : '📄',
      title: isLocal ? 'Tersimpan di perangkat ini' : 'Tersimpan di Google Drive kamu',
      body: isLocal
        ? 'Catatanmu tidak dikirim ke mana pun. Kamu bisa pindah ke Google kapan saja dari Pengaturan.'
        : 'Setiap transaksi ditulis ke spreadsheet "Hartaku - Expense Tracker" milikmu sendiri.'
    },
    {
      icon: '🏦',
      title: 'Satu tempat untuk semua akun',
      body: 'Tunai, bank, e-wallet, piutang, utang, sampai emas — dirangkum jadi total kekayaan.'
    },
    {
      icon: '⏱️',
      title: 'Siap dalam 1 menit',
      body: 'Pilih mata uang dan isi saldo akunmu sekarang. Semuanya bisa diubah lagi nanti.'
    }
  ]

  return (
    <>
      <StepHeading icon="👋" title={firstName ? `Hai, ${firstName}!` : 'Selamat datang di Hartaku'}>
        Kita siapkan Hartaku supaya angkanya langsung sesuai dengan keuanganmu.
      </StepHeading>

      <ul className="card space-y-4">
        {points.map((point) => (
          <li key={point.title} className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-tint/[0.05] text-[18px]" aria-hidden="true">
              {point.icon}
            </span>
            <div className="min-w-0">
              <p className="text-body font-semibold">{point.title}</p>
              <p className="text-caption text-subtitle">{point.body}</p>
            </div>
          </li>
        ))}
      </ul>

      <StepFooter>
        <Button size="lg" className="w-full justify-center" onClick={onNext}>
          Mulai
        </Button>
      </StepFooter>
    </>
  )
}

function CurrencyStep ({ onNext }) {
  const { settings, updateSettings } = useSettings()

  return (
    <>
      <StepHeading icon="💱" title="Pakai mata uang apa?">
        Dipakai untuk menampilkan semua nominal. Nilai yang sudah tercatat tidak dikonversi.
      </StepHeading>

      <div className="card-flush divide-y divide-hairline" role="radiogroup" aria-label="Mata uang">
        {CURRENCIES.map((currency) => {
          const selected = settings.currency === currency.code
          return (
            <button
              key={currency.code}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => updateSettings({ currency: currency.code })}
              className="flex w-full items-center gap-3 px-page py-3 text-left transition hover:bg-tint/[0.04]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body font-medium">{currency.label}</span>
                <span className="block text-caption text-subtitle">
                  {formatCurrency(150000, currency.code)}
                </span>
              </span>
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-brand bg-brand text-brand-fg' : 'border-hairline'
                }`}
                aria-hidden="true"
              >
                {selected && <CheckIcon className="h-3 w-3" />}
              </span>
            </button>
          )
        })}
      </div>

      <StepFooter>
        <Button size="lg" className="w-full justify-center" onClick={onNext}>
          Lanjut
        </Button>
      </StepFooter>
    </>
  )
}

let draftSeq = 0

function newDraft (kind = 'ewallet') {
  const preset = ACCOUNT_KINDS.find((item) => item.value === kind) || ACCOUNT_KINDS[0]
  draftSeq += 1
  return {
    key: `new-${draftSeq}`,
    id: null,
    name: '',
    kind: preset.value,
    icon: preset.icon,
    openingBalance: ''
  }
}

function fromAccount (account) {
  return {
    key: account.id,
    id: account.id,
    name: account.name,
    kind: account.kind,
    icon: account.icon,
    openingBalance: account.openingBalance ? String(account.openingBalance) : ''
  }
}

/**
 * The step that actually changes the records. Starter accounts are edited in
 * place rather than replaced, so nothing a returning user has pointed at them
 * is lost, and new rows only exist in this form until "Simpan" is pressed.
 */
function AccountsStep ({ onNext }) {
  const toast = useToast()
  const { settings } = useSettings()
  const { accounts, activeAccounts, editAccount, addAccounts } = useData()
  const [rows, setRows] = useState(() =>
    activeAccounts.length ? activeAccounts.map(fromAccount) : [newDraft('cash')]
  )
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const patch = (key, changes) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const total = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const value = parseAmount(row.openingBalance)
        return Number.isFinite(value) ? sum + value : sum
      }, 0),
    [rows]
  )

  const validate = () => {
    const found = {}
    const seen = new Map()
    // Archived accounts keep their names: a transaction points at an account
    // by name, so reusing one would quietly merge two histories.
    const taken = new Set(
      accounts
        .filter((account) => !rows.some((row) => row.id === account.id))
        .map((account) => account.name.toLowerCase())
    )

    rows.forEach((row) => {
      const name = row.name.trim()
      const lower = name.toLowerCase()
      const problems = {}

      if (!name) problems.name = 'Nama wajib diisi.'
      else if (name.length > LIMITS.accountName) problems.name = `Maksimal ${LIMITS.accountName} karakter.`
      else if (taken.has(lower) || seen.has(lower)) problems.name = 'Nama sudah dipakai.'
      seen.set(lower, row.key)

      if (row.openingBalance !== '' && !Number.isFinite(parseAmount(row.openingBalance))) {
        problems.openingBalance = 'Harus berupa angka.'
      }

      if (Object.keys(problems).length) found[row.key] = problems
    })

    setErrors(found)
    return !Object.keys(found).length
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const byId = new Map(accounts.map((account) => [account.id, account]))
      const edits = []
      const creates = []

      rows.forEach((row, index) => {
        const name = row.name.trim()
        const openingBalance = row.openingBalance === '' ? 0 : parseAmount(row.openingBalance)
        const existing = row.id && byId.get(row.id)

        if (existing) {
          if (existing.name !== name || Number(existing.openingBalance || 0) !== openingBalance) {
            edits.push({ ...existing, name, openingBalance })
          }
          return
        }

        creates.push({
          name,
          kind: row.kind,
          icon: row.icon,
          color: CATEGORY_COLORS[(accounts.length + index) % CATEGORY_COLORS.length],
          openingBalance,
          description: '',
          archived: false
        })
      })

      // One at a time: an account rename rewrites the rows that point at it,
      // and two of those racing over the same sheet is not worth the second saved.
      for (const account of edits) await editAccount(account)
      if (creates.length) await addAccounts(creates)

      onNext()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <StepHeading icon="💰" title="Berapa saldomu sekarang?">
        Isi saldo tiap akun hari ini supaya total kekayaanmu langsung benar. Kosongkan kalau belum tahu.
      </StepHeading>

      <div className="space-y-gap">
        {rows.map((row) => (
          <AccountRow
            key={row.key}
            row={row}
            errors={errors[row.key]}
            onChange={(changes) => patch(row.key, changes)}
            onRemove={
              row.id || rows.length === 1
                ? null
                : () => setRows((current) => current.filter((item) => item.key !== row.key))
            }
          />
        ))}
      </div>

      <div className="mt-gap flex flex-wrap gap-gap">
        {['ewallet', 'bank', 'debt'].map((kind) => {
          const preset = ACCOUNT_KINDS.find((item) => item.value === kind)
          return (
            <Button
              key={kind}
              variant="secondary"
              size="sm"
              onClick={() => setRows((current) => [...current, newDraft(kind)])}
            >
              <PlusIcon className="h-4 w-4" />
              {preset.label}
            </Button>
          )
        })}
      </div>

      <p className="hint">
        Akun yang tidak dipakai bisa diarsipkan nanti dari menu Kelola. Saldo utang boleh minus.
      </p>

      <StepFooter>
        <div className="flex items-baseline justify-between px-1">
          <span className="text-caption text-subtitle">Total saldo awal</span>
          <span className="amount text-card-title font-semibold">
            {formatCurrency(total, settings.currency)}
          </span>
        </div>
        <Button size="lg" className="w-full justify-center" onClick={handleSave} loading={saving}>
          Simpan &amp; lanjut
        </Button>
      </StepFooter>
    </>
  )
}

function AccountRow ({ row, errors = {}, onChange, onRemove }) {
  const { settings } = useSettings()
  const fresh = !row.id
  const parsed = parseAmount(row.openingBalance)

  return (
    <div className="card space-y-2 !py-3">
      <div className="flex items-center gap-gap">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-tint/[0.05] text-[20px]"
          aria-hidden="true"
        >
          {isImageIcon(row.icon) ? <img src={row.icon} alt="" className="h-full w-full object-cover" /> : row.icon}
        </span>

        <div className="min-w-0 flex-1">
          <input
            type="text"
            aria-label="Nama akun"
            maxLength={LIMITS.accountName}
            className={`field ${errors.name ? 'field-error' : ''}`}
            placeholder={fresh ? 'Contoh: GoPay' : 'Nama akun'}
            value={row.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>

        {onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label={`Hapus ${row.name || 'akun baru'}`}>
            <TrashIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-gap">
        {fresh ? (
          <select
            aria-label="Jenis akun"
            className="field w-[42%] shrink-0"
            value={row.kind}
            onChange={(event) => {
              const kind = ACCOUNT_KINDS.find((item) => item.value === event.target.value)
              onChange({ kind: event.target.value, icon: kind?.icon || row.icon })
            }}
          >
            {ACCOUNT_KINDS.map((kind) => (
              <option key={kind.value} value={kind.value}>
                {kind.icon} {kind.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="w-[42%] shrink-0 truncate pl-1 text-caption text-subtitle">
            {ACCOUNT_KINDS.find((kind) => kind.value === row.kind)?.label || 'Akun'}
          </span>
        )}

        <input
          type="text"
          inputMode="decimal"
          aria-label={`Saldo ${row.name || 'akun baru'}`}
          className={`field amount min-w-0 flex-1 text-right ${errors.openingBalance ? 'field-error' : ''}`}
          placeholder="0"
          value={row.openingBalance}
          onChange={(event) => onChange({ openingBalance: event.target.value })}
          onBlur={() => {
            // Tidied once the finger leaves, never mid-typing, so a half-typed
            // decimal is not reformatted out from under the cursor.
            if (row.openingBalance !== '' && Number.isFinite(parsed)) {
              onChange({ openingBalance: formatAmountInput(parsed, settings.currency) })
            }
          }}
        />
      </div>

      {(errors.name || errors.openingBalance) && (
        <p className="hint-error">{errors.name || errors.openingBalance}</p>
      )}
    </div>
  )
}

function ReadyStep ({ onFinish }) {
  const { isLocal } = useStorage()

  const actions = [
    {
      to: '/add',
      icon: <PlusIcon className="h-5 w-5" />,
      title: 'Catat transaksi pertama',
      body: 'Pengeluaran, pemasukan, atau transfer antar akun.'
    },
    {
      to: '/import',
      icon: <ScanIcon className="h-5 w-5" />,
      title: 'Import dari screenshot',
      body: 'Bukti transfer atau mutasi dibaca otomatis di perangkatmu.'
    }
  ]

  return (
    <>
      <StepHeading icon="🎉" title="Hartaku siap dipakai">
        Mulai dari satu transaksi. Makin rutin dicatat, makin jelas ke mana uangmu pergi.
      </StepHeading>

      <div className="card-flush divide-y divide-hairline">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => onFinish(action.to)}
            className="flex w-full items-center gap-3 px-page py-3 text-left transition hover:bg-tint/[0.04]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
              {action.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold">{action.title}</span>
              <span className="block text-caption text-subtitle">{action.body}</span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-subtitle">›</span>
          </button>
        ))}
      </div>

      <div className="mt-section space-y-2 rounded-control bg-tint/[0.04] p-3 text-caption text-subtitle">
        <p className="font-semibold text-ink">Tips berikutnya</p>
        <p>• Atur budget bulanan per kategori di <strong>Kelola → Budget</strong>.</p>
        {!isLocal && (
          <p>• Nyalakan <strong>Pantau email otomatis</strong> di Pengaturan untuk mencatat notifikasi transaksi bank.</p>
        )}
        <p>• Tambahkan Hartaku ke layar utama supaya bisa dibuka seperti aplikasi.</p>
      </div>

      <StepFooter>
        <Button variant="secondary" size="lg" className="w-full justify-center" onClick={() => onFinish('/')}>
          Lihat dashboard
        </Button>
      </StepFooter>
    </>
  )
}
