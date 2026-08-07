import { Link } from 'react-router-dom'
import { isImageIcon } from '../../lib/accountIcon.js'
import { ChevronRightIcon } from './icons.jsx'

/**
 * The one row shape used by accounts, transactions, categories and gold.
 *
 * Height is driven by content, not padding: a two-line row lands at ~56px and a
 * three-line one at ~64px, which is the budget the brief asks for. The trailing
 * column never shrinks, so an amount can never wrap or be ellipsised - the title
 * gives up width first.
 *
 * One scale for every row in the app: **13 title / 13 amount / 11 second line**,
 * with the group heading above them at 15. Even 2px steps, and each step has a
 * job - heading, row, qualifier. The rank of a row comes from the heading it
 * sits under, never from shrinking the row itself, so a list does not change
 * size depending on which screen it landed on.
 *
 * The amount matches its title in size and is set medium, not semibold. A long
 * rupiah figure is already the widest thing in the row - tabular figures give
 * every digit the width of a `0` - so bolding it as well made the column shout
 * down everything it was meant to describe.
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
        <span className="block truncate text-caption font-medium">{title}</span>
        {(subtitle || meta) && (
          <span className="block truncate text-[11px] leading-4 text-subtitle">
            {subtitle}
            {subtitle && meta && ' · '}
            {meta}
          </span>
        )}
      </span>

      {(trailing || trailingSub) && (
        <span className="shrink-0 text-right">
          {trailing && (
            <span className="block text-caption font-medium amount">{trailing}</span>
          )}
          {trailingSub && (
            <span className="block text-[11px] leading-4 amount text-subtitle">
              {trailingSub}
            </span>
          )}
        </span>
      )}

      {/* Rows that navigate say so - there is no hover state on a phone. */}
      {to && (
        <span className="-mr-1 shrink-0 text-subtitle/70" aria-hidden="true">
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      )}
    </>
  )

  const shared = `flex w-full items-center gap-2.5 px-page py-2 text-left ${
    interactive ? 'transition hover:bg-tint/[0.04]' : ''
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

/**
 * Coloured tile used as the leading element of most rows. Accounts can carry an
 * uploaded picture instead of an emoji, so the tile takes either - the picture
 * fills the tile and keeps its rounded corners, and the tint stays behind it as
 * the frame for logos that do not reach the edges.
 */
export function RowIcon ({ icon, color, size = 'md' }) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-[14px] text-[22px]' : 'h-8 w-8 rounded-[10px] text-[15px]'

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden ring-1 ring-inset ring-tint/10 ${box}`}
      style={color ? { backgroundColor: `${color}1f` } : undefined}
      aria-hidden="true"
    >
      {isImageIcon(icon) ? (
        <img src={icon} alt="" className="h-full w-full object-cover" />
      ) : (
        icon
      )}
    </span>
  )
}
