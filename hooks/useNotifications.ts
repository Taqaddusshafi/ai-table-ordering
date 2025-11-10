import { useCallback, useEffect, useState } from 'react'

// Extend NotificationOptions to include vibrate (mobile support)
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[]
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      try {
        const result = await Notification.requestPermission()
        setPermission(result)
        return result === 'granted'
      } catch (error) {
        console.error('Error requesting notification permission:', error)
        return false
      }
    }

    return false
  }, [])

  const showNotification = useCallback(
    (title: string, options?: ExtendedNotificationOptions) => {
      if (!('Notification' in window)) {
        console.log('Browser does not support notifications')
        return
      }

      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            ...options,
          } as NotificationOptions)

          // Auto-close after 10 seconds
          setTimeout(() => {
            notification.close()
          }, 10000)

          return notification
        } catch (error) {
          console.error('Error showing notification:', error)
        }
      } else {
        console.log('Notification permission not granted')
      }
    },
    []
  )

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
  }
}
