// Service Worker for notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(clients.claim())
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data?.url || '/')
        }
      })
  )
})

// Handle push notifications (for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'Order Update'
  const options = {
    body: data.body || 'Your order status has changed',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    silent: false,
    data: data
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})
