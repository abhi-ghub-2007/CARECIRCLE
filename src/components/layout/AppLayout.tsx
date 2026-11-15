import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Pill, Calendar, Users, User } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const mobileNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Meds', href: '/medications', icon: Pill },
  { name: 'Appts', href: '/appointments', icon: Calendar },
  { name: 'Circle', href: '/care-circle', icon: Users },
  { name: 'Profile', href: '/profile', icon: User },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased">
      {/* Skip to main content link for screen readers */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-lg outline-none ring-2 ring-ring"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
        <Header />

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 outline-none">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-16 px-2 shadow-lg"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full py-1 text-xs font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 mb-1" aria-hidden="true" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      <Toaster />
    </div>
  )
}
export default AppLayout
