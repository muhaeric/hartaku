import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreIcon } from './icons.jsx'

/** Roughly one menu row. Only used to decide whether the menu opens up or down. */
const ROW_HEIGHT = 42

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

    const height = items.length * ROW_HEIGHT + 8
    const below = window.innerHeight - rect.bottom
    const right = Math.max(8, window.innerWidth - rect.right)

    // Flip above the button when the space underneath cannot hold the menu and
    // the space above can - the bottom row of a list is exactly that case.
    setPlacement(
      below < height && rect.top > below
        ? { right, bottom: window.innerHeight - rect.top + 4 }
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
        className="tap flex items-center justify-center rounded-control text-subtitle transition hover:bg-black/5 dark:text-subtitle-dark dark:hover:bg-white/10"
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
            className="fixed z-40 w-44 animate-fade-in overflow-hidden rounded-control border border-hairline bg-surface shadow-lg dark:border-hairline-dark dark:bg-surface-dark"
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
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-body transition hover:bg-black/5 dark:hover:bg-white/5 ${
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
