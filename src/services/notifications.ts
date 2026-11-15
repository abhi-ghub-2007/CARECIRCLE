import { supabase } from '@/lib/supabase'
import type { Notification } from '@/types'

export async function getNotifications(recipientUserId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_user_id', recipientUserId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as Notification[]
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getUnreadCount(recipientUserId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_user_id', recipientUserId)
    .is('read_at', null)

  if (error) {
    return 0
  }

  return count || 0
}
