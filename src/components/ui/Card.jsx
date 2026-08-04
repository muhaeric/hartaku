export function Card ({ as: Tag = 'section', flush = false, className = '', ...props }) {
  return <Tag className={`${flush ? 'card-flush' : 'card'} ${className}`} {...props} />
}

/**
 * Section title with an optional trailing slot. Kept separate from Card so a
 * list can sit flush inside its container while the heading keeps page padding.
 */
export function SectionHeader ({ title, hint, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-section-title font-semibold">{title}</h2>
        {hint && (
          <p className="text-[11px] leading-4 text-subtitle dark:text-subtitle-dark">{hint}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/** Small caps-ish group label used above dividers inside a card. */
export function GroupLabel ({ children, trailing }) {
  return (
    <div className="flex items-center justify-between gap-3 px-page pb-1 pt-2.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-subtitle dark:text-subtitle-dark">
        {children}
      </span>
      {trailing && (
        <span className="amount text-[11px] font-semibold text-subtitle dark:text-subtitle-dark">
          {trailing}
        </span>
      )}
    </div>
  )
}
