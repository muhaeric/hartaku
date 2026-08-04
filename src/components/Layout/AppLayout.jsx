import { Outlet } from 'react-router-dom'
import MobileNav from './MobileNav.jsx'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'

export default function AppLayout () {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        {/* Bottom padding clears the mobile tab bar. */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
