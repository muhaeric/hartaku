import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navigation.js'

/** Bottom tab bar - the primary navigation below `lg`. */
export default function MobileNav () {
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {NAV_ITEMS.map(({ to, label, icon: NavIcon, end, highlight }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'tap flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition',
                  isActive
                    ? 'text-brand-600 dark:text-brand-500'
                    : 'text-slate-500 dark:text-slate-400'
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={
                      highlight
                        ? 'flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm'
                        : ''
                    }
                  >
                    <NavIcon className={highlight ? 'h-5 w-5' : 'h-6 w-6'} />
                  </span>
                  <span className={isActive && !highlight ? 'font-semibold' : ''}>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
