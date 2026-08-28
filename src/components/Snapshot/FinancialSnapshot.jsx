import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../../context/DataContext.jsx'
import { useGoldPrice } from '../../hooks/useGoldPrice.js'
import { currentMonthKey, monthLabel, monthLabelShort } from '../../lib/dates.js'
import { buildFinancialSnapshot } from '../../lib/financialSnapshot.js'
import Button from '../ui/Button.jsx'
import { Card, SectionHeader } from '../ui/Card.jsx'

const SOFT_COLORS = ['#6277f2', '#21a484', '#e59a31', '#a674e8', '#ee6f79', '#42a7cf']

function capitalize (value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function percent (value) {
  return value === null || value === undefined ? '—' : `${value}%`
}

function ringGradient (items) {
  let cursor = 0
  const stops = items.map((item, index) => {
    const start = cursor
    cursor += item.percentage
    return `${item.color || SOFT_COLORS[index % SOFT_COLORS.length]} ${start}% ${cursor}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

export default function FinancialSnapshot () {
  const { transactions, categories, accounts, goldLots, budgets } = useData()
  const { quote } = useGoldPrice()
  const month = currentMonthKey()
  const snapshot = useMemo(
    () => buildFinancialSnapshot({
      transactions,
      categories,
      accounts,
      goldLots,
      budgets,
      goldPrice: quote?.buybackPerGram,
      month
    }),
    [transactions, categories, accounts, goldLots, budgets, quote, month]
  )

  return <FinancialSnapshotView snapshot={snapshot} month={month} />
}

export function FinancialSnapshotView ({ snapshot, month }) {
  if (!snapshot.hasAnyData) return <EmptySnapshot month={month} />

  return (
    <div className="snapshot-page space-y-5 pb-2">
      <SnapshotHeader month={month} />

      {snapshot.score !== null && <HealthScore snapshot={snapshot} />}

      {snapshot.spending.length > 0 && (
        <SnapshotSection
          eyebrow="Pola bulan ini"
          title="Ke Mana Uangku Pergi?"
          description="Proporsi pengeluaran berdasarkan transaksi yang kamu catat."
        >
          <BreakdownDonut items={snapshot.spending} centerLabel="Pengeluaran" summary={snapshot.spendingSummary} />
        </SnapshotSection>
      )}

      {snapshot.savingTrend.some((item) => item.value !== null) && (
        <SnapshotSection
          eyebrow="Perjalanan"
          title="Perjalanan Menabungku"
          description="Tingkat menabung dari pemasukan yang tercatat."
        >
          <SavingJourney trend={snapshot.savingTrend} change={snapshot.progressChange} />
        </SnapshotSection>
      )}

      {snapshot.assets.length > 0 && (
        <SnapshotSection
          eyebrow="Komposisi"
          title="Komposisi Hartaku"
          description="Porsi aset yang tercatat, tanpa menampilkan nilainya."
        >
          <AssetComposition items={snapshot.assets} />
        </SnapshotSection>
      )}

      {snapshot.achievements.length > 0 && (
        <section className="space-y-3">
          <SectionHeader title="Pencapaianku" hint="Jejak baik yang sudah kamu bangun" />
          <AchievementGrid items={snapshot.achievements} />
        </section>
      )}

      {snapshot.insight && <InsightCard insight={snapshot.insight} />}

      <ShareSection snapshot={snapshot} month={month} />
    </div>
  )
}

function SnapshotHeader ({ month }) {
  return (
    <header className="relative overflow-hidden rounded-[24px] border border-brand/15 bg-gradient-to-br from-brand-soft via-surface to-surface px-5 py-5">
      <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-brand/10 blur-2xl" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand">Financial Snapshot</p>
          <h2 className="mt-1 text-[25px] font-bold leading-tight tracking-[-0.03em]">Ringkasan Keuanganku</h2>
          <p className="mt-1 text-body text-subtitle">{capitalize(monthLabel(month))}</p>
        </div>
        <HartakuMark />
      </div>
    </header>
  )
}

function HartakuMark ({ inverse = false }) {
  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${inverse ? 'text-white' : 'text-ink'}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-[12px] ${inverse ? 'bg-white/15' : 'bg-brand text-brand-fg'}`} aria-hidden="true">
        <LogoIcon className="h-5 w-5" />
      </span>
      <span className="hidden text-caption font-bold sm:inline">Hartaku</span>
    </div>
  )
}

function HealthScore ({ snapshot }) {
  const indicators = [
    { label: 'Tingkat Menabung', value: snapshot.indicators.saving, display: percent(snapshot.indicators.saving) },
    { label: 'Kontrol Pengeluaran', value: snapshot.indicators.control, display: percent(snapshot.indicators.control) },
    { label: 'Konsistensi Mencatat', value: snapshot.indicators.consistency, display: percent(snapshot.indicators.consistency) },
    { label: 'Diversifikasi Aset', value: null, display: snapshot.indicators.diversity }
  ].filter((item) => item.display !== null && item.display !== '—')

  return (
    <Card className="relative overflow-hidden border-brand/20 p-0">
      <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-brand/10 to-transparent" aria-hidden="true" />
      <div className="relative px-5 pb-5 pt-6">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-brand">Skor Kesehatan Keuangan</p>
        <div className="mx-auto mt-4 flex w-fit flex-col items-center">
          <ScoreRing score={snapshot.score} />
          <h3 className="mt-3 text-center text-[20px] font-bold tracking-tight">{snapshot.scoreLabel}</h3>
          <p className="mt-1 max-w-xs text-center text-caption text-subtitle">{snapshot.encouragement}</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {indicators.map((item) => (
            <div key={item.label} className="rounded-[14px] border border-hairline bg-canvas/60 p-3">
              <p className="text-[11px] leading-4 text-subtitle">{item.label}</p>
              <p className="mt-1 text-card-title font-bold tabular-nums">{item.display}</p>
              {item.value !== null && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${item.value}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function ScoreRing ({ score }) {
  return (
    <div
      className="relative flex h-44 w-44 items-center justify-center rounded-full shadow-[0_18px_45px_rgba(67,97,238,0.18)]"
      style={{ background: `conic-gradient(rgb(var(--brand)) ${score * 3.6}deg, rgb(var(--brand) / 0.12) 0deg)` }}
      role="img"
      aria-label={`Skor kesehatan keuangan ${score} dari 100`}
    >
      <div className="absolute inset-[13px] rounded-full bg-surface" />
      <div className="relative text-center">
        <span className="block text-[48px] font-extrabold leading-none tracking-[-0.06em] tabular-nums">{score}</span>
        <span className="mt-1 block text-caption font-semibold text-subtitle">dari 100</span>
      </div>
    </div>
  )
}

function SnapshotSection ({ eyebrow, title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        <h2 className="mt-0.5 text-section-title font-bold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-caption text-subtitle">{description}</p>
      </div>
      <Card>{children}</Card>
    </section>
  )
}

function BreakdownDonut ({ items, centerLabel, summary }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? items : items.slice(0, 3)
  const remaining = Math.max(0, items.length - 3)

  return (
    <div>
      <div className="grid grid-cols-[116px_1fr] items-center gap-4 sm:grid-cols-[132px_1fr]">
      <div className="relative mx-auto h-28 w-28 sm:h-32 sm:w-32">
        <div className="absolute inset-0 rounded-full" style={{ background: ringGradient(items) }} aria-hidden="true" />
        <div className="absolute inset-[16px] flex flex-col items-center justify-center rounded-full bg-surface text-center sm:inset-[18px]">
          <span className="text-[9px] text-subtitle">{centerLabel}</span>
          <span className="text-caption font-bold">100%</span>
        </div>
      </div>
        <div className="min-w-0">
          <ul className="space-y-1">
            {visible.map((item, index) => (
              <li key={item.name} className="flex min-h-8 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-canvas text-[13px]" aria-hidden="true">{item.icon}</span>
                <span className="min-w-0 flex-1 truncate text-caption font-medium">{item.name}</span>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color || SOFT_COLORS[index % SOFT_COLORS.length] }} aria-hidden="true" />
                <span className="w-9 text-right text-caption font-bold tabular-nums">{formatShare(item.percentage)}</span>
              </li>
            ))}
          </ul>

          {remaining > 0 && (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
              className="mt-1.5 text-[11px] font-bold text-brand hover:text-brand-hover"
            >
              {expanded ? 'Tampilkan lebih sedikit' : `Lihat ${remaining} kategori lainnya`}
            </button>
          )}
        </div>
      </div>

      {summary && (
        <div className="mt-4 border-t border-hairline pt-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-brand-soft text-[13px] text-brand-onsoft" aria-hidden="true">✦</span>
            <p className="text-caption leading-5 text-subtitle">{summary}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function formatShare (value) {
  if (!(value > 0)) return '—'
  if (value < 1) return '<1%'
  return `${Math.round(value)}%`
}

function SavingJourney ({ trend, change }) {
  return (
    <div>
      <div className="flex h-44 items-end gap-2" role="img" aria-label={`Tren tingkat menabung: ${trend.map((item) => `${monthLabelShort(item.month)} ${percent(item.value === null ? null : Math.round(item.value))}`).join(', ')}`}>
        {trend.map((item, index) => {
          const current = index === trend.length - 1
          const value = item.value === null ? null : Math.round(item.value)
          return (
            <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col justify-end text-center">
              <span className={`mb-1 text-[10px] font-bold tabular-nums ${current ? 'text-brand' : 'text-subtitle'}`}>{percent(value)}</span>
              <div className="relative mx-auto flex h-28 w-full max-w-10 items-end overflow-hidden rounded-t-[10px] bg-brand/8">
                {value !== null && (
                  <span
                    className={`block w-full rounded-t-[10px] ${current ? 'bg-brand' : 'bg-brand/35'}`}
                    style={{ height: `${Math.max(5, value)}%` }}
                  />
                )}
              </div>
              <span className={`mt-1.5 truncate text-[10px] ${current ? 'font-bold text-ink' : 'text-subtitle'}`}>{monthLabelShort(item.month).split(' ')[0]}</span>
            </div>
          )
        })}
      </div>

      {change !== null && (
        <div className={`mt-4 flex items-center gap-2 rounded-control px-3 py-2.5 ${change >= 0 ? 'bg-income/10 text-income' : 'bg-brand-soft text-brand-onsoft'}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface" aria-hidden="true">{change >= 0 ? '↗' : '→'}</span>
          <p className="text-caption font-semibold">
            {change >= 0 ? '+' : ''}{change} poin dibanding awal periode
          </p>
        </div>
      )}
    </div>
  )
}

function AssetComposition ({ items }) {
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-hairline" role="img" aria-label={`Komposisi aset: ${items.map((item) => `${item.label} ${item.percentage}%`).join(', ')}`}>
        {items.map((item) => (
          <span
            key={item.key}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.key}
            className={`flex items-center gap-3 rounded-[14px] border p-3 ${item.featured ? 'border-[#d89b28]/35 bg-[#d89b28]/10' : 'border-hairline bg-canvas/50'}`}
          >
            <span className="text-xl" aria-hidden="true">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-caption text-subtitle">{item.label}</p>
              <p className="text-card-title font-bold tabular-nums">{item.percentage}%</p>
            </div>
            {item.featured && <span className="rounded-full bg-[#d89b28]/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#9a6810]">Emas</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AchievementGrid ({ items }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <Card key={item.label} className="min-h-32 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-brand-soft text-lg" aria-hidden="true">{item.icon}</span>
          <p className="mt-3 text-[21px] font-extrabold leading-none tracking-tight tabular-nums">
            {item.value} <span className="text-caption font-semibold text-subtitle">{item.unit}</span>
          </p>
          <p className="mt-1.5 text-caption text-subtitle">{item.label}</p>
        </Card>
      ))}
    </div>
  )
}

function InsightCard ({ insight }) {
  return (
    <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-[#17234e] via-[#293c82] to-[#536ce1] p-5 text-white shadow-[0_18px_44px_rgba(34,51,112,0.22)]">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border-[24px] border-white/5" aria-hidden="true" />
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/65">Insight Bulan Ini</p>
      <div className="relative mt-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/12 text-xl" aria-hidden="true">✦</span>
        <p className="text-[17px] font-semibold leading-6">“{insight}”</p>
      </div>
    </section>
  )
}

function ShareSection ({ snapshot, month }) {
  const [sharing, setSharing] = useState(false)
  const [message, setMessage] = useState('')
  const [active, setActive] = useState(0)
  const track = useRef(null)
  const variants = useMemo(() => shareVariants(snapshot), [snapshot])
  const selected = variants[active]

  const go = (index) => {
    const node = track.current
    if (!node) return
    node.scrollTo({ left: index * node.clientWidth, behavior: 'smooth' })
  }

  const onScroll = useCallback(() => {
    const node = track.current
    if (!node) return
    setActive(Math.max(0, Math.min(2, Math.round(node.scrollLeft / (node.clientWidth || 1)))))
  }, [])

  const share = async () => {
    setSharing(true)
    setMessage('')
    try {
      const blob = await renderShareImage(month, selected)
      const file = new File([blob], `hartaku-${selected.key}-${month}.png`, { type: 'image/png' })
      const payload = {
        title: selected.shareTitle,
        text: selected.shareText,
        files: [file]
      }

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share(payload)
      } else if (navigator.share) {
        await navigator.share({ title: payload.title, text: payload.text })
      } else {
        downloadBlob(blob, file.name)
        setMessage('Gambar ringkasan berhasil diunduh.')
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('Belum bisa membagikan. Coba lagi sebentar.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <section className="space-y-4 overflow-hidden pt-1">
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand">Siap dibagikan</p>
        <h2 className="mt-1 text-[21px] font-bold tracking-tight">Pilih cara kamu bercerita</h2>
        <p className="mx-auto mt-1 max-w-sm text-caption text-subtitle">Tiga gaya Story, tiga sudut progres. Geser lalu bagikan yang paling kamu banget.</p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-[14px] bg-tint/5 p-1" role="tablist" aria-label="Pilih gaya kartu Story">
        {variants.map((variant, index) => (
          <button
            key={variant.key}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => go(index)}
            className={`min-w-0 rounded-[11px] px-1.5 py-2 text-[10px] font-bold transition ${active === index ? 'bg-surface text-ink shadow-sm' : 'text-subtitle hover:text-ink'}`}
          >
            {variant.shortName}
          </button>
        ))}
      </div>

      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Carousel pilihan kartu Story"
      >
        {variants.map((variant, index) => (
          <div
            key={variant.key}
            className="w-full shrink-0 snap-center px-1"
            role="group"
            aria-roledescription="slide"
            aria-label={`${variant.name}, ${index + 1} dari ${variants.length}`}
          >
            <ShareCard variant={variant} month={month} index={index} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(Math.max(0, active - 1))}
          disabled={active === 0}
          aria-label="Kartu sebelumnya"
          className="tap flex items-center justify-center rounded-full border border-hairline text-subtitle disabled:opacity-25"
        >
          <span className="text-xl" aria-hidden="true">‹</span>
        </button>
        <div className="flex items-center gap-2">
          {variants.map((variant, index) => (
            <button key={variant.key} type="button" onClick={() => go(index)} aria-label={`Lihat ${variant.name}`} aria-current={active === index} className="flex h-7 w-7 items-center justify-center">
              <span className={`h-1.5 rounded-full transition-all ${active === index ? 'w-5 bg-brand' : 'w-1.5 bg-tint/20'}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(Math.min(variants.length - 1, active + 1))}
          disabled={active === variants.length - 1}
          aria-label="Kartu berikutnya"
          className="tap flex items-center justify-center rounded-full border border-hairline text-subtitle disabled:opacity-25"
        >
          <span className="text-xl" aria-hidden="true">›</span>
        </button>
      </div>

      <div className="rounded-control border border-hairline bg-canvas/45 px-3 py-2.5 text-center" aria-live="polite">
        <p className="text-caption font-bold">{selected.name}</p>
        <p className="mt-0.5 text-[11px] leading-4 text-subtitle">{selected.description}</p>
      </div>

      <Button className="w-full justify-center shadow-[0_12px_28px_rgba(67,97,238,0.24)]" size="lg" loading={sharing} onClick={share}>
        <ShareIcon className="h-5 w-5" />
        Bagikan varian ini
      </Button>
      {message && <p className="text-center text-caption text-subtitle" role="status">{message}</p>}
    </section>
  )
}

function ShareCard ({ variant, month, index }) {
  return (
    <div
      className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-[28px] p-5 text-white shadow-[0_22px_55px_rgba(15,23,52,0.28)]"
      style={{ background: `linear-gradient(155deg, ${variant.colors.join(', ')})` }}
    >
      {variant.key === 'progress' && <div className="absolute -right-24 top-24 rotate-[-18deg] text-[70px] font-black tracking-[-0.08em] text-white/[0.055]" aria-hidden="true">LEVEL UP</div>}
      {variant.key === 'assets' && (
        <>
          <div className="absolute -right-14 -top-14 h-52 w-52 rounded-full border-[30px] border-[#d9ac52]/10" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-[#48c99a]/10 blur-2xl" aria-hidden="true" />
        </>
      )}
      <div className="relative flex h-full flex-col rounded-[19px] border border-white/10 bg-black/10 p-5 backdrop-blur-[1px]">
        <div className="flex items-center justify-between">
          <HartakuMark inverse />
          <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white/65">0{index + 1} · {monthLabelShort(month)}</span>
        </div>
        <div className={`mt-7 ${variant.key === 'progress' ? 'text-center' : ''}`}>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: variant.accent }}>{variant.eyebrow}</p>
          <p className="mt-2 text-[49px] font-black leading-none tracking-[-0.065em] tabular-nums">{variant.heroValue}<span className="ml-1 text-[15px] font-bold tracking-normal text-white/50">{variant.heroSuffix}</span></p>
          <p className="mt-2 text-[13px] font-semibold leading-5 text-white/78">{variant.heroLabel}</p>
        </div>
        <div className="my-auto grid grid-cols-2 gap-2">
          {variant.metrics.map((item) => (
            <div key={item.label} className="rounded-[14px] border border-white/10 bg-white/[0.06] p-3">
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              <p className="mt-2 text-[19px] font-bold leading-none tabular-nums">{item.value}</p>
              <p className="mt-1.5 text-[9px] leading-3 text-white/55">{item.label}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[13px] font-semibold leading-5">{variant.closing}</p>
          <div className="mt-4 h-px bg-white/10" />
          <p className="mt-3 text-[9px] font-medium tracking-wide text-white/45">HARTAKU · Kelola uang. Kenali hartamu.</p>
        </div>
      </div>
    </div>
  )
}

function shareMetrics (share) {
  return [
    share.saving !== null && { icon: '↗', value: `${share.saving}%`, label: 'Tingkat menabung' },
    share.streak > 0 && { icon: '🔥', value: `${share.streak} hari`, label: 'Streak mencatat' },
    share.transactions > 0 && { icon: '▦', value: share.transactions, label: 'Transaksi dicatat' },
    share.gold !== null && { icon: '●', value: `${share.gold}%`, label: 'Aset emas' },
    share.consistency !== null && { icon: '✦', value: `${share.consistency}%`, label: 'Konsistensi mencatat' }
  ].filter(Boolean).slice(0, 4)
}

function shareVariants (snapshot) {
  const share = snapshot.share
  const progressValue = snapshot.progressChange !== null ? Math.abs(snapshot.progressChange) : share.score
  const growthAvailable = share.assetGrowth !== null

  return [
    {
      key: 'safe',
      shortName: 'Ringkasan',
      name: 'Aman & lengkap',
      description: 'Skor, persentase, dan pencapaian—tanpa nominal atau detail sensitif.',
      colors: ['#263b86', '#172455', '#0c132d'],
      canvas: ['#263b86', '#172455', '#0c132d'],
      accent: '#aebcff',
      eyebrow: 'RINGKASAN KEUANGANKU',
      heroValue: share.score ?? share.consistency ?? '—',
      heroSuffix: share.score !== null ? '/ 100' : '%',
      heroLabel: snapshot.scoreLabel || 'Kebiasaan baik sedang dibangun',
      metrics: shareMetrics(share),
      closing: 'Pelan-pelan, aku sedang membangun kebiasaan finansial yang lebih baik.',
      shareTitle: 'Ringkasan Keuanganku',
      shareText: 'Aku sedang membangun kebiasaan finansial yang lebih baik bersama Hartaku.'
    },
    {
      key: 'progress',
      shortName: 'Level Up',
      name: 'Progress yang bikin bangga',
      description: 'Lebih berani: skor kebiasaan, nilai progres, dan milestone terbaikmu.',
      colors: ['#43166a', '#922769', '#df654e'],
      canvas: ['#43166a', '#922769', '#df654e'],
      accent: '#ffd0a8',
      eyebrow: 'FINANCIAL LEVEL UP',
      heroValue: share.score ?? progressValue ?? '—',
      heroSuffix: share.score !== null ? '/ 100' : 'poin',
      heroLabel: snapshot.progressChange !== null
        ? `${snapshot.progressChange >= 0 ? '+' : ''}${snapshot.progressChange} poin tingkat menabung dalam 6 bulan`
        : 'Kebiasaan finansialku terus naik level',
      metrics: [
        share.consistency !== null && { icon: '✦', value: `${share.consistency}%`, label: 'Nilai konsistensi' },
        share.activeMonths > 0 && { icon: '◫', value: `${share.activeMonths} bln`, label: 'Aktif mencatat' },
        share.transactions > 0 && { icon: '▦', value: share.transactions, label: 'Transaksi ditaklukkan' },
        share.streak > 0 && { icon: '🔥', value: `${share.streak} hari`, label: 'Streak terbaik' }
      ].filter(Boolean).slice(0, 4),
      closing: 'Ternyata aku sudah sejauh ini. Next level, here I come.',
      shareTitle: 'Financial Level Up',
      shareText: 'Kebiasaan finansialku naik level bersama Hartaku.'
    },
    {
      key: 'assets',
      shortName: 'Aset',
      name: 'Hartaku makin bertumbuh',
      description: 'Total jenis aset, komposisi, dan pertumbuhannya—tetap tanpa nominal.',
      colors: ['#16473d', '#0d2d29', '#071a18'],
      canvas: ['#16473d', '#0d2d29', '#071a18'],
      accent: '#e5bd68',
      eyebrow: 'MY WEALTH IS GROWING',
      heroValue: growthAvailable ? `${share.assetGrowth >= 0 ? '+' : ''}${share.assetGrowth}%` : share.assetTypes,
      heroSuffix: growthAvailable ? '' : 'jenis aset',
      heroLabel: growthAvailable ? 'Pertumbuhan Hartaku dalam 6 bulan' : 'Pondasi aset yang sedang aku bangun',
      metrics: [
        share.assetTypes > 0 && { icon: '◆', value: share.assetTypes, label: 'Jenis aset tercatat' },
        share.largestAsset && { icon: '◒', value: `${share.largestAsset.percentage}%`, label: share.largestAsset.label },
        share.gold !== null && { icon: '●', value: `${share.gold}%`, label: 'Porsi emas' },
        share.saving !== null && { icon: '↗', value: `${share.saving}%`, label: 'Tingkat menabung' }
      ].filter(Boolean).slice(0, 4),
      closing: 'Bukan soal angkanya. Ini tentang aset yang terus aku bangun.',
      shareTitle: 'Hartaku Makin Bertumbuh',
      shareText: 'Sedikit demi sedikit, Hartaku terus bertumbuh.'
    }
  ]
}

function EmptySnapshot ({ month }) {
  return (
    <div className="space-y-4">
      <SnapshotHeader month={month} />
      <Card className="flex min-h-80 flex-col items-center justify-center px-6 py-10 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-brand-soft text-3xl" aria-hidden="true">✦</span>
        <h2 className="mt-5 text-[20px] font-bold">Ringkasanmu sedang disiapkan</h2>
        <p className="mt-2 max-w-sm text-body text-subtitle">Catat beberapa transaksi dulu. Hartaku akan mengubahnya menjadi pola, progres, dan pencapaian yang mudah dipahami.</p>
        <Link to="/add" className="mt-6 inline-flex h-11 items-center rounded-control bg-brand px-5 text-body font-semibold text-brand-fg transition hover:bg-brand-hover">Catat transaksi pertama</Link>
      </Card>
    </div>
  )
}

async function renderShareImage (month, variant) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const context = canvas.getContext('2d')
  const gradient = context.createLinearGradient(0, 0, 1080, 1920)
  gradient.addColorStop(0, variant.canvas[0])
  gradient.addColorStop(0.55, variant.canvas[1])
  gradient.addColorStop(1, variant.canvas[2])
  context.fillStyle = gradient
  context.fillRect(0, 0, 1080, 1920)

  context.strokeStyle = 'rgba(255,255,255,.13)'
  context.lineWidth = 3
  roundedRect(context, 72, 72, 936, 1776, 48)
  context.stroke()

  context.fillStyle = '#ffffff'
  context.font = '700 42px system-ui, sans-serif'
  context.fillText('HARTAKU', 130, 170)
  context.fillStyle = 'rgba(255,255,255,.55)'
  context.font = '700 28px system-ui, sans-serif'
  context.textAlign = 'right'
  context.fillText(monthLabelShort(month).toUpperCase(), 950, 170)
  context.textAlign = 'left'

  context.fillStyle = variant.accent
  context.font = '700 28px system-ui, sans-serif'
  context.fillText(variant.eyebrow, 130, 330)

  const y = 500
  context.fillStyle = '#ffffff'
  context.font = '800 144px system-ui, sans-serif'
  context.fillText(String(variant.heroValue), 125, y)
  const width = context.measureText(String(variant.heroValue)).width
  if (variant.heroSuffix) {
    context.fillStyle = 'rgba(255,255,255,.52)'
    context.font = '600 44px system-ui, sans-serif'
    context.fillText(variant.heroSuffix, 145 + width, y)
  }
  context.fillStyle = 'rgba(255,255,255,.78)'
  context.font = '600 34px system-ui, sans-serif'
  wrapText(context, variant.heroLabel, 130, y + 72, 800, 48)

  variant.metrics.forEach((item, index) => {
    const column = index % 2
    const row = Math.floor(index / 2)
    const x = 125 + column * 425
    const top = 720 + row * 300
    context.fillStyle = 'rgba(255,255,255,.07)'
    roundedRect(context, x, top, 380, 240, 32)
    context.fill()

    // Canvas does not inherit the page's emoji fallback stack. Draw the icon
    // explicitly with a colour-emoji font so the exported PNG matches the
    // Story preview instead of silently dropping every badge.
    context.fillStyle = '#ffffff'
    context.font = '44px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif'
    context.fillText(String(item.icon), x + 34, top + 62)

    context.fillStyle = '#ffffff'
    context.font = '700 58px system-ui, sans-serif'
    context.fillText(String(item.value), x + 34, top + 137)
    context.fillStyle = 'rgba(255,255,255,.56)'
    context.font = '500 27px system-ui, sans-serif'
    context.fillText(item.label, x + 34, top + 190)
  })

  context.fillStyle = '#ffffff'
  context.font = '600 38px system-ui, sans-serif'
  wrapText(context, variant.closing, 130, 1580, 800, 56)
  context.fillStyle = 'rgba(255,255,255,.45)'
  context.font = '600 26px system-ui, sans-serif'
  context.fillText('HARTAKU  ·  Kelola uang. Kenali hartamu.', 130, 1770)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Gagal membuat gambar')), 'image/png', 0.95)
  })
}

function roundedRect (context, x, y, width, height, radius) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function wrapText (context, text, x, y, width, lineHeight) {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = `${line}${word} `
    if (context.measureText(test).width > width && line) {
      context.fillText(line.trim(), x, y)
      line = `${word} `
      y += lineHeight
    } else line = test
  }
  context.fillText(line.trim(), x, y)
}

function downloadBlob (blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function LogoIcon ({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M5 17.5V11m5 6.5V6.5m5 11V9m4 8.5V4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="m4 8 5-4 5 3 6-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShareIcon ({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
    </svg>
  )
}
