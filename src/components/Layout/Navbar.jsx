import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { ExternalIcon, RefreshIcon } from '../ui/icons.jsx'
import { PAGE_TITLES } from './navigation.js'

export default function Navbar () {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const { workbook, reload, loading } = useData()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const onClickOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setMenuOpen(false)
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
        <h1 className="flex-1 truncate text-lg font-semibold">
          {PAGE_TITLES[pathname] || 'Hartaku'}
        </h1>

        <button
          type="button"
          onClick={() => reload()}
          disabled={loading}
          aria-label="Muat ulang data"
          className="tap flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
        >
          <RefreshIcon className={loading ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
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
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-semibold">{user?.name}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>

              {workbook && (
                <a
                  href={workbook.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ExternalIcon className="h-4 w-4" />
                  Buka spreadsheet
                </a>
              )}

              <button
                type="button"
                onClick={signOut}
                className="w-full px-4 py-3 text-left text-sm font-medium text-expense hover:bg-slate-50 dark:hover:bg-slate-800"
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
