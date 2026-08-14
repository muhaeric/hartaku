import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { useStorage } from '../../context/StorageContext.jsx'
import { ExternalIcon, RefreshIcon } from '../ui/icons.jsx'
import { pageTitle } from './navigation.js'

export default function Navbar () {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const { isLocal } = useStorage()
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
    <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-page pb-2 pt-2">
        {/* Page title carries the hierarchy, so the bar itself stays chrome-free. */}
        <h1 className="flex-1 truncate text-page-title font-bold tracking-tight">
          {pageTitle(pathname)}
        </h1>

        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          aria-label={staleSince ? 'Data tersimpan, coba muat ulang' : 'Muat ulang data'}
          className="tap relative flex items-center justify-center rounded-control text-subtitle transition hover:bg-tint/5 disabled:opacity-40"
        >
          <RefreshIcon className={loading ? 'h-[19px] w-[19px] animate-spin' : 'h-[19px] w-[19px]'} />
          {/* Cached numbers are on screen and the refresh failed - say so quietly. */}
          {staleSince && !loading && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning ring-2 ring-canvas"
              aria-hidden="true"
            />
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={isLocal ? 'Menu penyimpanan' : 'Menu akun'}
            aria-expanded={menuOpen}
            className="tap flex items-center justify-center rounded-full"
          >
            {isLocal ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-[15px] text-brand-onsoft">
                📱
              </span>
            ) : user?.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-caption font-semibold text-brand-fg">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {menuOpen && isLocal ? (
            /* No session, so nothing to sign out of. What this menu owes the
               user is where the data is and how to get a copy of it out. */
            <div className="absolute right-0 z-20 mt-1 w-60 animate-fade-in overflow-hidden rounded-control border border-hairline bg-surface shadow-lg">
              <div className="border-b border-hairline px-3 py-2.5">
                <p className="truncate text-body font-semibold">Penyimpanan device</p>
                <p className="text-caption text-subtitle">
                  Tanpa akun — data ada di browser ini
                </p>
              </div>

              <Link
                to="/settings"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2.5 text-body font-medium text-brand transition hover:bg-tint/5"
              >
                Cadangkan atau pindah ke Google
              </Link>
            </div>
          ) : menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-60 animate-fade-in overflow-hidden rounded-control border border-hairline bg-surface shadow-lg">
              <div className="border-b border-hairline px-3 py-2.5">
                <p className="truncate text-body font-semibold">{user?.name}</p>
                <p className="truncate text-caption text-subtitle">
                  {user?.email}
                </p>
              </div>

              {workbook && (
                <a
                  href={workbook.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2.5 text-body text-subtitle transition hover:bg-tint/5"
                >
                  <ExternalIcon className="h-4 w-4" />
                  Buka spreadsheet
                </a>
              )}

              <button
                type="button"
                onClick={signOut}
                className="w-full px-3 py-2.5 text-left text-body font-medium text-expense transition hover:bg-tint/5"
              >
                Keluar
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
