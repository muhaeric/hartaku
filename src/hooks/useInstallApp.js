import { useCallback, useSyncExternalStore } from 'react'

let installPrompt = null
let relatedAppInstalled = false
let relatedAppsChecking =
  typeof navigator !== 'undefined' && typeof navigator.getInstalledRelatedApps === 'function'
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

export function resolveInstallStatus ({
  standalone = false,
  relatedInstalled = false,
  checking = false,
  promptAvailable = false,
  ios = false,
  safari = false
} = {}) {
  if (standalone || relatedInstalled) return 'installed'
  if (checking) return 'checking'
  if (promptAvailable) return 'available'
  if (ios) return safari ? 'ios-safari' : 'ios-other'
  return 'manual'
}

function snapshot () {
  return resolveInstallStatus({
    standalone: isStandalone(),
    relatedInstalled: relatedAppInstalled,
    checking: relatedAppsChecking,
    promptAvailable: Boolean(installPrompt),
    ios: isIos(),
    safari: isSafari()
  })
}

function subscribe (listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

if (typeof window !== 'undefined') {
  if (relatedAppsChecking) {
    navigator.getInstalledRelatedApps()
      .then((apps) => {
        relatedAppInstalled = apps.some((app) => app.platform === 'webapp')
      })
      .catch(() => {})
      .finally(() => {
        relatedAppsChecking = false
        emitChange()
      })
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt = event
    emitChange()
  })

  window.addEventListener('appinstalled', () => {
    installPrompt = null
    relatedAppInstalled = true
    relatedAppsChecking = false
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
    const choice = result || await prompt.userChoice || { outcome: 'dismissed' }
    if (choice.outcome === 'accepted') {
      relatedAppInstalled = true
      relatedAppsChecking = false
      emitChange()
    }
    return choice
  }, [])

  return { status, requestInstall }
}
