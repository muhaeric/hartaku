import { useEffect, useId, useRef, useState } from 'react'
import { MoreIcon } from './icons.jsx'

/**
 * Row actions live behind this instead of sitting on every row - the brief's
 * point being that a list of edit/delete buttons is noise, not affordance.
 */
export default function KebabMenu ({ label = 'Aksi lainnya', items }) {
  const [open, setOpen] = useState(false)
  const wrapper = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!wrapper.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapper}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="tap flex items-center justify-center rounded-control text-subtitle transition hover:bg-black/5 dark:text-subtitle-dark dark:hover:bg-white/10"
      >
        <MoreIcon />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 animate-fade-in overflow-hidden rounded-control border border-hairline bg-surface shadow-lg dark:border-hairline-dark dark:bg-surface-dark"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
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
        </div>
      )}
    </div>
  )
}
