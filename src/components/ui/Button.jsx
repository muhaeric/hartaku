const VARIANTS = {
  primary: 'bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active disabled:bg-brand/50',
  secondary: 'border border-hairline bg-surface text-ink hover:bg-canvas disabled:opacity-50',
  soft: 'bg-brand-soft text-brand-onsoft hover:bg-brand-soft-hover disabled:opacity-50',
  danger: 'bg-expense text-surface hover:brightness-95 disabled:opacity-50',
  ghost: 'text-subtitle hover:bg-tint/5 disabled:opacity-50'
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
