import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Pill, Calendar, Users, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: typeof LayoutDashboard
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Medications', href: '/medications', icon: Pill },
  { name: 'Appointments', href: '/appointments', icon: Calendar },
  { name: 'Care Circle', href: '/care-circle', icon: Users },
  { name: 'Profile', href: '/profile', icon: User },
]

export function Sidebar() {
  const { profile } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'CC'

  return (
    <aside
      className={cn(
        'relative hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 select-none z-20',
        collapsed ? 'w-20' : 'w-64'
      )}
      aria-label="Main sidebar navigation"
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
              C
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-foreground">CareCircle</h1>
              <p className="text-xs text-muted-foreground">Better care, together</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white font-bold text-lg">
            C
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto" aria-label="Sidebar navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-foreground hover:bg-muted focus-visible:bg-muted'
                )
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Profile summary at bottom */}
      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <Avatar className="h-10 w-10 shrink-0">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || 'User'}</p>
              <div className="mt-0.5">
                <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                  {profile?.role || 'Guest'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
