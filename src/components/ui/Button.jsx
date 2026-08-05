const VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-500/50',
  secondary:
    'border border-hairline bg-surface text-ink hover:bg-canvas disabled:opacity-50 dark:border-hairline-dark dark:bg-surface-dark dark:text-ink-dark dark:hover:bg-white/5',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:bg-brand-500/15 dark:text-brand-200 dark:hover:bg-brand-500/25',
  danger: 'bg-expense text-white hover:brightness-95 disabled:opacity-50',
  ghost:
    'text-subtitle hover:bg-black/5 disabled:opacity-50 dark:text-subtitle-dark dark:hover:bg-white/5'
}

const SIZES = {
  // Compact by default - full-width chunky buttons are what the brief moved away from.
  // `xs` exists for rows of four actions on a 375px screen, where `sm`'s padding
  // is the difference between four labelled buttons and four bare icons.
  xs: 'h-9 px-2 text-caption gap-1',
  sm: 'h-9 px-3 text-caption gap-1.5',
  md: 'h-11 px-4 text-body gap-2',
  lg: 'h-12 px-5 text-body gap-2',
  icon: 'h-9 w-9 justify-center'
}

export default function Button ({
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center rounded-control font-semibold transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  )
}
