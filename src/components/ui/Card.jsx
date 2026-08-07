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
          <p className="text-[11px] leading-4 text-subtitle">{hint}</p>
        )}
      </div>
      {action}
    </div>
  )
}

/**
 * Group heading used above dividers inside a card, carrying the group's own
 * total - the same shape as the day heading on the transaction list, and for
 * the same reason.
 *
 * The rank comes from the tinted band and the weight, not from the type size:
 * a heading that has to be two steps larger than its rows to read as a heading
 * ends up shouting over the very numbers it introduces. So it sits at the row
 * size in semibold, on a band, and the rows read as its breakdown.
 */
export function GroupLabel ({ children, trailing }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline bg-tint/[0.03] px-page py-1">
      <span className="min-w-0 truncate text-caption font-semibold">{children}</span>
      {trailing && <span className="amount shrink-0 text-caption font-semibold">{trailing}</span>}
    </div>
  )
}
