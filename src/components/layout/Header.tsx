import { useNavigate } from 'react-router-dom'
import { User, LogOut, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { NotificationBell } from '@/features/notifications/NotificationBell'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'CC'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {title && <h2 className="text-lg font-semibold text-foreground hidden sm:block">{title}</h2>}
        <div className="sm:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
            C
          </div>
          <span className="font-bold text-foreground">CareCircle</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px] min-w-[44px]"
              aria-label="User account menu"
            >
              <Avatar className="h-9 w-9">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.full_name || 'User avatar'} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Open user menu</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{profile?.full_name || 'My Account'}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile?.email}</p>
                <span className="inline-block mt-1 text-[11px] font-semibold text-primary capitalize">
                  Role: {profile?.role || 'user'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
