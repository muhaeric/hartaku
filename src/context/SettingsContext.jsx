import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { clearThemePhoto, readThemePhoto, writeThemePhoto } from '../lib/themePhoto.js'

const STORAGE_KEY = 'hartaku.settings'

const DEFAULT_SETTINGS = {
  theme: 'auto',
  /*
   * How much of the glass theme's picture is veiled. Safe at any value - the
   * panels carry their own contrast - so this is genuinely taste, and it starts
   * where the photo is clearly a photo rather than a texture.
   */
  glassScrim: 0.35,
  currency: 'IDR',
  dateFormat: 'DD/MM/YYYY',
  defaultType: 'expense',
  defaultCategory: '',
  defaultAccount: ''
}

const SettingsContext = createContext(null)

export function SettingsProvider ({ children }) {
  const [settings, updateSettings, resetSettings] = useLocalStorage(STORAGE_KEY, DEFAULT_SETTINGS)
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(settings.theme))
  const [themePhoto, setThemePhoto] = useState(readThemePhoto)

  /* Kept in state as well as storage so the backdrop repaints on change; the
     boolean says whether it survived, since a quota refusal is silent. */
  const saveThemePhoto = useCallback((dataUrl) => {
    if (!dataUrl) {
      clearThemePhoto()
      setThemePhoto('')
      return true
    }

    const stored = writeThemePhoto(dataUrl)
    if (stored) setThemePhoto(dataUrl)
    return stored
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const paint = () => {
      const next = resolveTheme(settings.theme, media)
      applyTheme(next)
      setResolvedTheme(next)
    }

    paint()
    // Only 'auto' has anything to follow; a named theme ignores the OS.
    if (settings.theme !== 'auto') return undefined

    media.addEventListener('change', paint)
    return () => media.removeEventListener('change', paint)
  }, [settings.theme])

  /* Written as an inline custom property so it overrides the stylesheet's
     fallback without the theme block having to know a setting exists. */
  useEffect(() => {
    const scrim = Number(settings.glassScrim)
    const safe = Number.isFinite(scrim) ? Math.min(0.85, Math.max(0, scrim)) : DEFAULT_SETTINGS.glassScrim

    document.documentElement.style.setProperty('--photo-scrim', String(safe))
  }, [settings.glassScrim])

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      resolvedTheme,
      themePhoto,
      saveThemePhoto,
      defaults: DEFAULT_SETTINGS
    }),
    [settings, updateSettings, resetSettings, resolvedTheme, themePhoto, saveThemePhoto]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings () {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used inside SettingsProvider')
  return context
}

/** 'auto' is the only setting that asks the OS; everything else is literal. */
function resolveTheme (theme, media) {
  if (theme !== 'auto') return theme
  const dark = (media ?? window.matchMedia('(prefers-color-scheme: dark)')).matches
  return dark ? 'dark' : 'light'
}

function applyTheme (theme) {
  const root = document.documentElement

  /*
   * Chromium keeps a transitioned property pinned to its old value when the
   * var() behind it changes, which left every element carrying a `transition`
   * painted in the previous theme. Reading `offsetHeight` between the two
   * attribute writes forces a style flush while transitions are suppressed -
   * see [data-theme-switching] in index.css. It is load-bearing, not
   * superstition.
   */
  root.dataset.themeSwitching = ''
  root.dataset.theme = theme
  void root.offsetHeight
  delete root.dataset.themeSwitching

  /*
   * Read the canvas back out of the stylesheet rather than keeping a second
   * copy of every palette here. A `media` attribute on the meta tag could only
   * ever follow the OS, so it got the status bar wrong for anyone who picked a
   * theme by hand - and it has no way at all to express Laut or Bunga.
   */
  const canvas = getComputedStyle(root).getPropertyValue('--canvas').trim()
  if (!canvas) return

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${canvas})`)
}
