self.addEventListener('push', (event) => {
  if (!event.data) return
  try {
    const { title, body, icon, badge, vibrate, data } = event.data.json()
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/icon-192.png',
        badge: badge || '/badge.png',
        vibrate: vibrate || [200, 100, 200],
        data,
        requireInteraction: true,
      })
    )
  } catch (e) {
    event.waitUntil(
      self.registration.showNotification('LastMinute AI', {
        body: event.data.text(),
        icon: '/icon-192.png',
      })
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow('/')
    })
  )
})
