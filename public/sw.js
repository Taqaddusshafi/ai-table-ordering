// Service Worker for notifications and background sync
const CACHE_NAME = 'restaurant-v1'

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
  
  const urlToOpen = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url.includes('/table/') && 'focus' in client) {
            return client.focus()
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Handle messages from the main thread to show notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, url } = event.data
    
    self.registration.showNotification(title, {
      body: body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: url },
      actions: [
        { action: 'view', title: 'View Order' }
      ]
    })
  }
})

// Handle push notifications (for future server-sent push)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {}
  const title = data.title || 'Order Update'
  const options = {
    body: data.body || 'Your order status has changed',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    silent: false,
    data: data
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// Handle notification action clicks
self.addEventListener('notificationaction', (event) => {
  event.notification.close()
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus()
          }
        }
        return clients.openWindow('/')
      })
    )
  }
})
