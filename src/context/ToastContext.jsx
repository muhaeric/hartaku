import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

const TONES = {
  success: 'bg-income text-white',
  error: 'bg-expense text-white',
  info: 'bg-ink text-white dark:bg-surface-dark dark:text-ink-dark'
}

export function ToastProvider ({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (message, tone = 'info') => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, tone }])
      setTimeout(() => dismiss(id), 3500)
    },
    [dismiss]
  )

  const value = useMemo(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error')
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-page lg:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={`pointer-events-auto max-w-md animate-slide-up rounded-control px-4 py-2.5 text-body font-medium shadow-lg ${TONES[toast.tone]}`}
          >
            {toast.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast () {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
