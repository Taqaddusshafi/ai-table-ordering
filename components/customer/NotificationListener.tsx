'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useBrowserNotifications } from '@/hooks/useNotifications'

interface NotificationListenerProps {
  sessionId: string
  tableId: string
}

export default function NotificationListener({
  sessionId,
  tableId,
}: NotificationListenerProps) {
  const { showNotification, requestPermission } = useBrowserNotifications()

  useEffect(() => {
    // Request browser notification permission
    requestPermission()

    const supabase = createClient()

    // Subscribe to order status changes
    const ordersChannel = supabase
      .channel(`orders_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const order = payload.new as any
          const statusMessages: Record<string, string> = {
            preparing: '👨‍🍳 Your order is being prepared!',
            ready: '✅ Your order is ready!',
            served: '🍽️ Enjoy your meal!',
          }

          const message = statusMessages[order.status]
          if (message) {
            // Show toast
            toast.success(message, { duration: 5000 })

            // Show browser notification
            showNotification('Order Update', {
              body: message,
              tag: order.id,
            })

            // Play sound (optional)
            playNotificationSound()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [sessionId, tableId])

  return null // This is a listener component
}

function playNotificationSound() {
  const audio = new Audio('/notification.mp3') // Add sound file to public folder
  audio.volume = 0.5
  audio.play().catch((e) => console.log('Sound play failed:', e))
}
