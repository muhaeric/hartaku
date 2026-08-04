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
        <h2 className="text-card-title font-semibold">{title}</h2>
        {hint && <p className="text-caption text-subtitle dark:text-subtitle-dark">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

/** Small caps-ish group label used above dividers inside a card. */
export function GroupLabel ({ children, trailing }) {
  return (
    <div className="flex items-center justify-between gap-3 px-page pb-1.5 pt-3">
      <span className="text-caption font-medium text-subtitle dark:text-subtitle-dark">
        {children}
      </span>
      {trailing && (
        <span className="amount text-caption font-semibold text-subtitle dark:text-subtitle-dark">
          {trailing}
        </span>
      )}
    </div>
  )
}
