import { useState } from 'react'
import { Bell } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationList } from './NotificationList'
import * as Popover from '@radix-ui/react-popover'

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, isLoading, markAsRead } = useNotifications(user?.id)
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center rounded-md p-2 text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-h-[44px] min-w-[44px]"
          aria-label={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'Notifications'
          }
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-fade-in"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-80 sm:w-96 rounded-lg border border-border bg-card shadow-lg outline-none data-[state=open]:animate-fade-in data-[state=closed]:animate-out"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                {unreadCount} new
              </span>
            )}
          </div>

          <NotificationList
            notifications={notifications}
            onMarkAsRead={markAsRead}
            isLoading={isLoading}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
