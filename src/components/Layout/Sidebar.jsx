import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navigation.js'

/** Persistent navigation from `lg` up; hidden on phones and tablets. */
export default function Sidebar () {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-hairline bg-surface p-3 dark:border-hairline-dark dark:bg-surface-dark lg:block">
      <div className="mb-4 flex items-center gap-2 px-2 py-1">
        <span className="text-xl" aria-hidden="true">
          💸
        </span>
        <span className="text-card-title font-semibold">Hartaku</span>
      </div>

      <nav aria-label="Navigasi samping">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ to, label, icon: NavIcon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-2.5 rounded-control px-2.5 text-body font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                      : 'text-subtitle hover:bg-black/5 dark:text-subtitle-dark dark:hover:bg-white/5'
                  }`
                }
              >
                <NavIcon className="h-[19px] w-[19px]" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
