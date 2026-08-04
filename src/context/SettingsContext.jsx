import { createContext, useContext, useEffect, useMemo } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

const STORAGE_KEY = 'hartaku.settings'

const DEFAULT_SETTINGS = {
  theme: 'auto',
  currency: 'IDR',
  dateFormat: 'DD/MM/YYYY',
  defaultType: 'expense',
  defaultCategory: ''
}

const SettingsContext = createContext(null)

export function SettingsProvider ({ children }) {
  const [settings, updateSettings, resetSettings] = useLocalStorage(STORAGE_KEY, DEFAULT_SETTINGS)

  useEffect(() => applyTheme(settings.theme), [settings.theme])

  const value = useMemo(
    () => ({ settings, updateSettings, resetSettings, defaults: DEFAULT_SETTINGS }),
    [settings, updateSettings, resetSettings]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings () {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside SettingsProvider')
  return context
}

function applyTheme (theme) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  const paint = () => {
    const dark = theme === 'dark' || (theme === 'auto' && media.matches)
    document.documentElement.classList.toggle('dark', dark)
  }

  paint()
  if (theme !== 'auto') return undefined

  media.addEventListener('change', paint)
  return () => media.removeEventListener('change', paint)
}
