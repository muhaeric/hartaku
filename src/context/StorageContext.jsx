import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MODE, readStorageMode, writeStorageMode } from '../services/storage.js'

const StorageContext = createContext(null)

/**
 * Which backend this browser is using, and the two moves between them.
 *
 * Kept apart from `AuthContext` on purpose: in local mode there is no session
 * to speak of, and folding "where the data lives" into "who is signed in"
 * would make every screen ask the wrong question to find out.
 *
 * A pending migration is a third piece of state, and it has to survive a full
 * page load: choosing "pindah ke Google" hands the browser to Google's consent
 * screen, and what comes back is a cold start of the app.
 */

const MIGRATION_KEY = 'hartaku.migrateFromLocal'

function readPending () {
  try {
    return localStorage.getItem(MIGRATION_KEY) === '1'
  } catch {
    return false
  }
}

function writePending (pending) {
  try {
    if (pending) localStorage.setItem(MIGRATION_KEY, '1')
    else localStorage.removeItem(MIGRATION_KEY)
  } catch {
    // Without this the migration screen simply will not reappear; the local
    // data is untouched either way.
  }
}

export function StorageProvider ({ children }) {
  const [mode, setMode] = useState(readStorageMode)
  const [migrating, setMigrating] = useState(readPending)

  const chooseLocal = useCallback(() => {
    writeStorageMode(MODE.local)
    setMode(MODE.local)
  }, [])

  const chooseGoogle = useCallback(() => {
    writeStorageMode(MODE.google)
    setMode(MODE.google)
  }, [])

  /** Marks the intent before the OAuth redirect takes the page away. */
  const startMigration = useCallback((pending = true) => {
    writePending(pending)
    setMigrating(pending)
  }, [])

  const value = useMemo(
    () => ({
      mode,
      isLocal: mode === MODE.local,
      migrating,
      chooseLocal,
      chooseGoogle,
      startMigration
    }),
    [mode, migrating, chooseLocal, chooseGoogle, startMigration]
  )

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
}

export function useStorage () {
  const context = useContext(StorageContext)
  if (!context) throw new Error('useStorage must be used inside StorageProvider')
  return context
}
