import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { ExternalIcon, RefreshIcon } from '../ui/icons.jsx'
import { PAGE_TITLES } from './navigation.js'

export default function Navbar () {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const { workbook, reload, loading, staleSince } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur dark:bg-canvas-dark/90">
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-page pb-2 pt-3">
        {/* Page title carries the hierarchy, so the bar itself stays chrome-free. */}
        <h1 className="flex-1 truncate text-page-title font-bold tracking-tight">
          {PAGE_TITLES[pathname] || 'Hartaku'}
        </h1>

        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          aria-label={staleSince ? 'Data tersimpan, coba muat ulang' : 'Muat ulang data'}
          className="tap relative flex items-center justify-center rounded-control text-subtitle transition hover:bg-black/5 disabled:opacity-40 dark:text-subtitle-dark dark:hover:bg-white/5"
        >
          <RefreshIcon className={loading ? 'h-[19px] w-[19px] animate-spin' : 'h-[19px] w-[19px]'} />
          {/* Cached numbers are on screen and the refresh failed - say so quietly. */}
          {staleSince && !loading && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning ring-2 ring-canvas dark:ring-canvas-dark"
              aria-hidden="true"
            />
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Menu akun"
            aria-expanded={menuOpen}
            className="tap flex items-center justify-center rounded-full"
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-caption font-semibold text-white">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-20 mt-1 w-60 animate-fade-in overflow-hidden rounded-control border border-hairline bg-surface shadow-lg dark:border-hairline-dark dark:bg-surface-dark">
              <div className="border-b border-hairline px-3 py-2.5 dark:border-hairline-dark">
                <p className="truncate text-body font-semibold">{user?.name}</p>
                <p className="truncate text-caption text-subtitle dark:text-subtitle-dark">
                  {user?.email}
                </p>
              </div>

              {workbook && (
                <a
                  href={workbook.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-body text-subtitle transition hover:bg-black/5 dark:text-subtitle-dark dark:hover:bg-white/5"
                >
                  <ExternalIcon className="h-4 w-4" />
                  Buka spreadsheet
                </a>
              )}

              <button
                type="button"
                onClick={signOut}
                className="w-full px-3 py-2.5 text-left text-body font-medium text-expense transition hover:bg-black/5 dark:hover:bg-white/5"
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
