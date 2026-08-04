import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navigation.js'

/** Persistent navigation from `lg` up; hidden on phones and tablets. */
export default function Sidebar () {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:block">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="text-2xl" aria-hidden="true">
          💸
        </span>
        <span className="text-lg font-bold">Hartaku</span>
      </div>

      <nav aria-label="Navigasi samping">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: NavIcon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  [
                    'tap flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-500'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  ].join(' ')
                }
              >
                <NavIcon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
