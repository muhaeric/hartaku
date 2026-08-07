import Button from './Button.jsx'

export function Spinner ({ className = 'h-5 w-5' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-brand border-t-transparent ${className}`}
      role="status"
      aria-label="Memuat"
    />
  )
}

export function LoadingBlock ({ label = 'Memuat…' }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-subtitle">
      <Spinner />
      <p className="text-caption">{label}</p>
    </div>
  )
}

function Bar ({ className = '' }) {
  return <span className={`block rounded bg-hairline ${className}`} />
}

/** Skeletons mirror the real layout so nothing jumps when data lands. */
export function SkeletonSummary () {
  return (
    <div className="card animate-shimmer space-y-3">
      <Bar className="h-3 w-20" />
      <Bar className="h-8 w-48" />
      <div className="flex gap-6 pt-1">
        <Bar className="h-3 w-16" />
        <Bar className="h-3 w-16" />
      </div>
    </div>
  )
}

export function SkeletonRows ({ rows = 4 }) {
  return (
    <div className="card-flush animate-shimmer divide-hairline">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-page py-3">
          <Bar className="h-9 w-9 shrink-0 rounded-[12px]" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Bar className="h-3.5 w-32" />
            <Bar className="h-3 w-20" />
          </span>
          <Bar className="h-3.5 w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Light empty state - no oversized card, per the brief. */
export function EmptyState ({ icon = '📄', title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-page py-10 text-center">
      <span className="text-[28px]" aria-hidden="true">
        {icon}
      </span>
      <p className="text-body font-medium">{title}</p>
      {description && (
        <p className="max-w-xs text-caption text-subtitle">{description}</p>
      )}
      {actionLabel && (
        <Button size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

export function ErrorState ({ message, onRetry }) {
  return (
    <div className="rounded-card border border-expense/25 bg-expense/[0.06] p-page">
      <p className="text-body font-semibold text-expense">Gagal memuat data</p>
      <p className="mt-1 text-caption text-subtitle">{message}</p>
      {onRetry && (
        <Button size="sm" variant="danger" className="mt-3" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}
