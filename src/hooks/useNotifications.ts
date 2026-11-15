import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  getNotifications,
  markNotificationAsRead,
  getUnreadCount,
} from '@/services/notifications'
import type { Notification } from '@/types'

export function useNotifications(recipientUserId?: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifs = useCallback(async () => {
    if (!recipientUserId) {
      setNotifications([])
      setUnreadCount(0)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const [list, count] = await Promise.all([
        getNotifications(recipientUserId),
        getUnreadCount(recipientUserId),
      ])
      setNotifications(list)
      setUnreadCount(count)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [recipientUserId])

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, delivery_status: 'delivered', delivered_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  useEffect(() => {
    fetchNotifs()

    if (!recipientUserId) return

    // Realtime notifications
    const channel = supabase
      .channel(`notifications:${recipientUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${recipientUserId}`,
        },
        () => {
          fetchNotifs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [recipientUserId, fetchNotifs])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch: fetchNotifs,
    markAsRead,
  }
}
