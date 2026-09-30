import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import {
  ONBOARDING,
  onboardingDecision,
  readOnboarding,
  subscribeOnboarding,
  writeOnboarding
} from '../../lib/onboarding.js'
import Button from '../ui/Button.jsx'
import { ChevronLeftIcon, PlusIcon } from '../ui/icons.jsx'

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

const STEPS = ['welcome', 'transactions', 'gold', 'ready']

/**
 * A tour, not a setup: nothing here writes to the records. The starter
 * accounts and categories are already in place, so the walkthrough only has
 * to show where the two main jobs - recording money and tracking gold - live.
 */
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

  // Each step starts at the top, whatever the previous one was scrolled to.
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
        {key === 'transactions' && <TransactionsStep onNext={next} />}
        {key === 'gold' && <GoldStep onNext={next} />}
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

/** Icon, title and one line each - the same card on every step. */
function PointList ({ points }) {
  return (
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

function NextButton ({ onClick, children = 'Lanjut' }) {
  return (
    <StepFooter>
      <Button size="lg" className="w-full justify-center" onClick={onClick}>
        {children}
      </Button>
    </StepFooter>
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
      title: 'Kenalan dalam 1 menit',
      body: 'Lihat sekilas cara mencatat transaksi dan mengelola emas. Bisa dilewati kapan saja.'
    }
  ]

  return (
    <>
      <StepHeading icon="👋" title={firstName ? `Hai, ${firstName}!` : 'Selamat datang di Hartaku'}>
        Pencatat keuangan pribadi yang ringan, dengan data yang tetap milikmu.
      </StepHeading>

      <PointList points={points} />

      <NextButton onClick={onNext}>Mulai</NextButton>
    </>
  )
}

function TransactionsStep ({ onNext }) {
  const { isLocal } = useStorage()

  const points = [
    {
      icon: '➕',
      title: 'Catat lewat tombol Tambah',
      body: 'Pengeluaran, pemasukan, atau transfer antar akun — pilih jumlah, akun, dan kategori.'
    },
    {
      icon: '🏷️',
      title: 'Kategori dan tag',
      body: 'Kelompokkan transaksi, lalu lihat pengeluaran terbesar per kategori, tag, atau akun di Beranda.'
    },
    {
      icon: '🧾',
      title: 'Import dari screenshot',
      body: 'Bukti transfer atau daftar mutasi dibaca otomatis. Gambarnya diproses di perangkatmu.'
    },
    isLocal
      ? {
          icon: '📊',
          title: 'Budget bulanan',
          body: 'Pasang batas per kategori di Kelola → Budget, dan pantau sisanya di Beranda.'
        }
      : {
          icon: '✉️',
          title: 'Pantau email otomatis',
          body: 'Notifikasi transaksi dari bank di Gmail diubah jadi transaksi, tinggal kamu setujui.'
        }
  ]

  return (
    <>
      <StepHeading icon="💸" title="Catat setiap transaksi">
        Semua uang masuk dan keluar tercatat rapi, lalu diringkas per bulan.
      </StepHeading>

      <PointList points={points} />

      <NextButton onClick={onNext} />
    </>
  )
}

function GoldStep ({ onNext }) {
  const points = [
    {
      icon: '🪙',
      title: 'Logam mulia dan perhiasan',
      body: 'Catat setiap pembelian: gram, harga beli, dan untuk perhiasan, kadarnya (24K sampai 8K).'
    },
    {
      icon: '📈',
      title: 'Nilai terkini otomatis',
      body: 'Nilainya dihitung dari harga buyback harian, lengkap dengan untung atau ruginya.'
    },
    {
      icon: '💼',
      title: 'Masuk ke total kekayaan',
      body: 'Emasmu ikut dihitung di Beranda. Pilih akun pembayarnya, saldonya langsung terpotong.'
    }
  ]

  return (
    <>
      <StepHeading icon="🥇" title="Kelola investasi emas">
        Buka dari menu <strong className="font-semibold text-ink">Kelola → Emas</strong>.
      </StepHeading>

      <PointList points={points} />

      <NextButton onClick={onNext} />
    </>
  )
}

function ReadyStep ({ onFinish }) {
  const actions = [
    {
      to: '/add',
      icon: <PlusIcon className="h-5 w-5" />,
      title: 'Catat transaksi pertama',
      body: 'Pengeluaran, pemasukan, atau transfer antar akun.'
    },
    {
      to: '/manage?tab=gold',
      icon: <span className="text-[18px]" aria-hidden="true">🥇</span>,
      title: 'Catat emas',
      body: 'Tambahkan logam mulia atau perhiasan yang kamu punya.'
    }
  ]

  return (
    <>
      <StepHeading icon="🎉" title="Hartaku siap dipakai">
        Mulai dari satu catatan. Makin rutin dicatat, makin jelas ke mana uangmu pergi.
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

      <p className="hint text-center">
        Panduan ini bisa dibuka lagi dari Pengaturan → Panduan awal.
      </p>

      <StepFooter>
        <Button variant="secondary" size="lg" className="w-full justify-center" onClick={() => onFinish('/')}>
          Lihat dashboard
        </Button>
      </StepFooter>
    </>
  )
}
