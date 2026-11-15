import { Bell, Pill, Calendar, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import type { Notification, NotificationType } from '@/types'

interface NotificationListProps {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  isLoading?: boolean
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'upcoming_medication':
    case 'unconfirmed_medication':
    case 'missed_medication':
      return <Pill className="h-5 w-5 text-primary" aria-hidden="true" />
    case 'upcoming_appointment':
      return <Calendar className="h-5 w-5 text-secondary" aria-hidden="true" />
    case 'caregiver_intervention':
      return <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
    case 'invitation':
      return <UserPlus className="h-5 w-5 text-accent" aria-hidden="true" />
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
  }
}

function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case 'upcoming_medication':
      return 'Medication Reminder'
    case 'unconfirmed_medication':
      return 'Unconfirmed Dose Alert'
    case 'missed_medication':
      return 'Missed Medication Alert'
    case 'upcoming_appointment':
      return 'Upcoming Appointment'
    case 'caregiver_intervention':
      return 'Caregiver Intervention Required'
    case 'invitation':
      return 'Care Circle Invitation'
    default:
      return 'Notification'
  }
}

export function NotificationList({ notifications, onMarkAsRead, isLoading }: NotificationListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3" role="status" aria-label="Loading notifications">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse flex items-start gap-3 p-2 rounded-md">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
        <CheckCircle className="h-10 w-10 text-muted-foreground/40 mb-2" aria-hidden="true" />
        <p className="font-medium text-foreground">All caught up</p>
        <p className="text-xs text-muted-foreground mt-1">No notifications right now.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border max-h-[400px] overflow-y-auto" role="list">
      {notifications.map((item) => {
        const isRead = item.delivery_status === 'delivered'
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onMarkAsRead(item.id)}
              className={`w-full text-left p-4 flex items-start gap-3 transition-colors hover:bg-muted/50 focus:outline-none focus:bg-muted ${
                !isRead ? 'bg-primary/5' : ''
              }`}
              aria-label={`${isRead ? 'Read' : 'Unread'}: ${getNotificationTitle(item.notification_type)}`}
            >
              <div className="shrink-0 mt-0.5">{getNotificationIcon(item.notification_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm ${!isRead ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                    {getNotificationTitle(item.notification_type)}
                  </p>
                  {!isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread indicator" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Scheduled for {formatRelativeTime(item.scheduled_at)}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
