import { Link } from 'react-router-dom'

/**
 * The one row shape used by accounts, transactions, categories and gold.
 *
 * Height is driven by content, not padding: a two-line row lands at ~56px and a
 * three-line one at ~64px, which is the budget the brief asks for. The trailing
 * column never shrinks, so an amount can never wrap or be ellipsised - the title
 * gives up width first.
 */
export default function ListRow ({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  trailingSub,
  to,
  onClick,
  action,
  className = ''
}) {
  const interactive = Boolean(to || onClick)

  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-medium">{title}</span>
        {(subtitle || meta) && (
          <span className="block truncate text-[11px] leading-4 text-subtitle dark:text-subtitle-dark">
            {subtitle}
            {subtitle && meta && ' · '}
            {meta}
          </span>
        )}
      </span>

      {(trailing || trailingSub) && (
        <span className="shrink-0 text-right">
          {trailing && <span className="block text-amount font-semibold amount">{trailing}</span>}
          {trailingSub && (
            <span className="block text-[11px] leading-4 amount text-subtitle dark:text-subtitle-dark">
              {trailingSub}
            </span>
          )}
        </span>
      )}
    </>
  )

  const shared = `flex w-full items-center gap-2.5 px-page py-2 text-left ${
    interactive ? 'transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]' : ''
  } ${className}`

  return (
    <div className="flex items-stretch">
      {to ? (
        <Link to={to} className={shared}>
          {body}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={shared}>
          {body}
        </button>
      ) : (
        <div className={shared}>{body}</div>
      )}

      {action && <div className="flex shrink-0 items-center pr-2">{action}</div>}
    </div>
  )
}

/** Coloured emoji tile used as the leading element of most rows. */
export function RowIcon ({ icon, color }) {
  return (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[15px] ring-1 ring-inset ring-black/[0.06] dark:ring-white/10"
      style={color ? { backgroundColor: `${color}1f` } : undefined}
      aria-hidden="true"
    >
      {icon}
    </span>
  )
}
