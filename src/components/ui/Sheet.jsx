import { useEffect, useState } from 'react'
import { CloseIcon } from './icons.jsx'

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Replaces the old modal so
 * every overlay in the app has the same geometry and dismiss behaviour.
 */
export default function Sheet ({ open, title, description, onClose, children, footer, size = 'md' }) {
  const [keyboard, setKeyboard] = useState(0)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  /*
   * A `position: fixed` sheet is anchored to the layout viewport, which the
   * on-screen keyboard does not shrink - so the keyboard opens straight over
   * the bottom of the sheet, hiding the field being typed into and whatever
   * buttons sat under it. The visual viewport does shrink, and the difference
   * between the two is exactly how much of the sheet is buried.
   *
   * `offsetTop` is part of it: iOS scrolls the visual viewport up to reveal a
   * focused field, and without that term the sheet drifts by however far it
   * scrolled.
   */
  useEffect(() => {
    const viewport = window.visualViewport
    if (!open || !viewport) return undefined

    const sync = () =>
      setKeyboard(Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop)))

    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)

    return () => {
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
      setKeyboard(0)
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center sm:items-center"
      style={{ paddingBottom: keyboard || undefined }}
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex w-full animate-slide-up flex-col rounded-t-sheet bg-surface shadow-xl sm:rounded-sheet ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
        /* The cap has to come down by the same amount the sheet moved up, or a
           tall sheet pushed clear of the keyboard runs off the top instead. */
        style={{ maxHeight: `calc(92dvh - ${keyboard}px)` }}
      >
        {/* Grab handle: the affordance people look for on a sheet. */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-hairline" />
        </div>

        <header className="flex items-start justify-between gap-3 px-page pb-3 pt-3">
          <div className="min-w-0">
            <h2 className="text-card-title font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-caption text-subtitle">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="tap -mr-2 -mt-1 flex items-center justify-center rounded-control text-subtitle transition hover:bg-tint/5"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-page pb-page">{children}</div>

        {footer && (
          <footer className="border-t border-hairline px-page py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
