'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useBrowserNotifications } from '@/hooks/useNotifications'
import { Bell } from 'lucide-react'

export default function AdminNotificationListener() {
  const { showNotification, requestPermission } = useBrowserNotifications()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    requestPermission()

    const supabase = createClient()

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('admin_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const order = payload.new as any
          const message = `New order from Table #${order.table_id.slice(0, 8)}`

          // Show toast with action
          toast.success(message, {
            duration: 10000,
            icon: '🔔',
          })

          // Browser notification
          showNotification('New Order! 🎉', {
            body: message,
            tag: order.id,
            requireInteraction: true,
          })

          // Play alert sound
          playAlertSound()

          // Increment unread count
          setUnreadCount((prev) => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
    }
  }, [])

  return (
    <div className="relative">
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  )
}

function playAlertSound() {
  const audio = new Audio('/alert.mp3') // Add to public folder
  audio.volume = 0.7
  audio.play().catch((e) => console.log('Sound play failed:', e))
}
