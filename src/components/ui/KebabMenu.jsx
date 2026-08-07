import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreIcon } from './icons.jsx'

/** One menu row: 20px of line box plus `py-2.5`. Rounded up, so the estimate
 * errs towards flipping the menu rather than towards letting it overflow. */
const ROW_HEIGHT = 42

/** Breathing room kept between the menu and whatever bounds it. */
const MARGIN = 8

/**
 * Where the usable screen ends.
 *
 * `window.innerHeight` is not it on a phone: the tab bar is fixed over the
 * bottom of the viewport, and a menu measured against the full height happily
 * places itself underneath it. The bar marks itself so this can ask; when it is
 * hidden - `lg` and up - it measures zero and the full height is right again.
 */
function usableBottom () {
  const bar = document.querySelector('[data-bottom-bar]')?.getBoundingClientRect()
  return bar && bar.height > 0 ? bar.top : window.innerHeight
}

/**
 * Row actions live behind this instead of sitting on every row - the brief's
 * point being that a list of edit/delete buttons is noise, not affordance.
 *
 * The menu is rendered into `document.body` rather than beside its button. The
 * lists it appears in clip their contents so row backgrounds cannot bleed past
 * the card's rounded corners, and that same clipping used to swallow this menu
 * whole on the bottom row - which on a list with only one row meant the menu
 * never appeared at all.
 *
 * Being fixed-positioned, it is anchored to a rectangle measured once on open,
 * so anything that could move that rectangle closes it rather than letting the
 * menu drift away from the button it belongs to.
 */
export default function KebabMenu ({ label = 'Aksi lainnya', items }) {
  const [placement, setPlacement] = useState(null)
  const trigger = useRef(null)
  const menu = useRef(null)
  const menuId = useId()

  const open = Boolean(placement)

  const place = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return

    const height = items.length * ROW_HEIGHT + 2
    const right = Math.max(MARGIN, window.innerWidth - rect.right)
    const limit = usableBottom()

    // Flip above the button when the space underneath cannot hold the menu -
    // the bottom rows of a list are exactly that case - unless there is no room
    // up there either, which is what happens on a very short screen.
    const fitsBelow = rect.bottom + 4 + height <= limit - MARGIN
    const fitsAbove = rect.top - 4 - height >= MARGIN

    setPlacement(
      !fitsBelow && fitsAbove
        ? {
            right,
            // Clamped, so a button that is itself under the bar still gets a
            // menu above it rather than one hidden alongside it.
            bottom: Math.max(
              window.innerHeight - rect.top + 4,
              window.innerHeight - limit + MARGIN
            )
          }
        : { right, top: rect.bottom + 4 }
    )
  }

  useEffect(() => {
    if (!open) return undefined

    const close = () => setPlacement(null)

    const onPointerDown = (event) => {
      if (trigger.current?.contains(event.target)) return
      if (menu.current?.contains(event.target)) return
      close()
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    // Capturing, so a scroll inside any container counts, not just the page.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? setPlacement(null) : place())}
        className="tap flex items-center justify-center rounded-control text-subtitle transition hover:bg-tint/5"
      >
        <MoreIcon />
      </button>

      {open &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            style={placement}
            className="fixed z-40 w-44 animate-fade-in overflow-hidden rounded-control border border-hairline bg-surface shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPlacement(null)
                  item.onSelect()
                }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-body transition hover:bg-tint/5 ${
                  item.destructive ? 'text-expense' : ''
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}
