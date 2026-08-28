import { Link } from 'react-router-dom'
import { currentMonthKey, monthLabel } from '../../lib/dates.js'

export default function SnapshotTeaser () {
  return (
    <Link
      to="/snapshot"
      className="group relative flex items-center gap-3 overflow-hidden rounded-[18px] border border-brand/20 bg-gradient-to-r from-brand-soft via-surface to-surface p-3.5 transition hover:border-brand/35"
    >
      <span className="absolute -right-5 -top-8 h-24 w-24 rounded-full bg-brand/10 blur-xl" aria-hidden="true" />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand text-xl text-brand-fg shadow-[0_8px_20px_rgba(67,97,238,0.24)]" aria-hidden="true">✦</span>
      <span className="relative min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-brand">Financial Snapshot</span>
        <span className="mt-0.5 block truncate text-body font-bold">Lihat ringkasan {monthLabel(currentMonthKey())}</span>
        <span className="block text-[11px] text-subtitle">Skor, progres, dan pencapaianmu</span>
      </span>
      <span className="relative text-xl text-brand transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
    </Link>
  )
}
