export function Spinner ({ className = 'h-6 w-6' }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-brand-500 border-t-transparent ${className}`}
      role="status"
      aria-label="Memuat"
    />
  )
}

export function LoadingBlock ({ label = 'Memuat…' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <Spinner />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function SkeletonCard () {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  )
}

export function EmptyState ({ icon = '🗂️', title, description, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-4xl" aria-hidden="true">
        {icon}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState ({ message, onRetry }) {
  return (
    <div className="card border-expense/30 bg-expense/5">
      <h3 className="font-semibold text-expense">Gagal memuat data</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="tap mt-3 rounded-xl bg-expense px-4 text-sm font-semibold text-white"
        >
          Coba lagi
        </button>
      )}
    </div>
  )
}
