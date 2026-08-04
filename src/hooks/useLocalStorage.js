import { useCallback, useState } from 'react'

export function useLocalStorage (key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? { ...initialValue, ...JSON.parse(raw) } : initialValue
    } catch {
      return initialValue
    }
  })

  const update = useCallback(
    (patch) => {
      setValue((current) => {
        const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          // Storage full or blocked - keep the in-memory value.
        }
        return next
      })
    },
    [key]
  )

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
    setValue(initialValue)
  }, [key, initialValue])

  return [value, update, reset]
}
