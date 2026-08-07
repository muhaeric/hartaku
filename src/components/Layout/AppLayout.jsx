import { Outlet } from 'react-router-dom'
import MobileNav from './MobileNav.jsx'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'
import ThemeBackdrop from './ThemeBackdrop.jsx'

export default function AppLayout () {
  return (
    // No transform, opacity or z-index on this element: the backdrop's negative
    // z-index has to escape to the root stacking context to sit behind the page.
    <div className="flex min-h-dvh">
      <ThemeBackdrop />
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        {/* pb clears the 56px tab bar plus the home indicator. */}
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-section px-page pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-1 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
