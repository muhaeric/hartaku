import { useEffect } from 'react'
import { CloseIcon } from './icons.jsx'

/**
 * Bottom sheet on phones, centred dialog from `sm` up. Replaces the old modal so
 * every overlay in the app has the same geometry and dismiss behaviour.
 */
export default function Sheet ({ open, title, description, onClose, children, footer, size = 'md' }) {
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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex animate-fade-in items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92dvh] w-full animate-slide-up flex-col rounded-t-sheet bg-surface shadow-xl dark:bg-surface-dark sm:rounded-sheet ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        {/* Grab handle: the affordance people look for on a sheet. */}
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-hairline dark:bg-hairline-dark" />
        </div>

        <header className="flex items-start justify-between gap-3 px-page pb-3 pt-3">
          <div className="min-w-0">
            <h2 className="text-card-title font-semibold">{title}</h2>
            {description && (
              <p className="mt-0.5 text-caption text-subtitle dark:text-subtitle-dark">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="tap -mr-2 -mt-1 flex items-center justify-center rounded-control text-subtitle transition hover:bg-black/5 dark:hover:bg-white/5"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-page pb-page">{children}</div>

        {footer && (
          <footer className="border-t border-hairline px-page py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-hairline-dark sm:pb-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
