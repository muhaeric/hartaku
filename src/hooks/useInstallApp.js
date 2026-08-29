import { useCallback, useSyncExternalStore } from 'react'

let installPrompt = null
const listeners = new Set()

function isStandalone () {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )
}

function isIos () {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isSafari () {
  if (typeof navigator === 'undefined') return false
  return /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
}

function emitChange () {
  listeners.forEach((listener) => listener())
}

function snapshot () {
  if (isStandalone()) return 'installed'
  if (installPrompt) return 'available'
  if (isIos()) return isSafari() ? 'ios-safari' : 'ios-other'
  return 'manual'
}

function subscribe (listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event
    emitChange()
  })

  window.addEventListener('appinstalled', () => {
    installPrompt = null
    emitChange()
  })

  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', emitChange)
}

export function useInstallApp () {
  const status = useSyncExternalStore(subscribe, snapshot, () => 'manual')

  const requestInstall = useCallback(async () => {
    if (!installPrompt) return { outcome: 'unavailable' }

    const prompt = installPrompt
    installPrompt = null
    emitChange()

    const result = await prompt.prompt()
    return result || prompt.userChoice || { outcome: 'dismissed' }
  }, [])

  return { status, requestInstall }
}
