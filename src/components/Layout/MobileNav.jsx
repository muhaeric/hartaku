import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navigation.js'

/** Bottom tab bar - the primary navigation below `lg`. */
export default function MobileNav () {
  return (
    <nav
      aria-label="Navigasi utama"
      /* Marked so overlays can find where the usable screen actually ends:
         `window.innerHeight` runs on underneath this bar. */
      data-bottom-bar=""
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {NAV_ITEMS.map(({ to, label, icon: NavIcon, end, highlight }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-14 flex-col items-center justify-center gap-1 text-[11px] leading-none transition ${
                  isActive
                    ? 'font-semibold text-brand'
                    : 'text-subtitle'
                }`
              }
            >
              <span
                className={
                  highlight
                    ? 'flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-fg'
                    : 'flex h-[22px] items-center'
                }
              >
                <NavIcon className={highlight ? 'h-4 w-4' : 'h-[22px] w-[22px]'} />
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
