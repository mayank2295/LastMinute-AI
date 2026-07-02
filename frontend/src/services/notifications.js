import { getVapidKey, subscribeNotification, savePushSubscription } from './api'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    return reg
  } catch (e) {
    console.warn('[SW] Registration failed:', e)
    return null
  }
}

export async function subscribeToPush(sessionId, taskTitle, deadline) {
  try {
    // Prefer build-time VITE env var; fall back to fetching from backend
    let publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
    if (!publicKey) {
      const data = await getVapidKey()
      publicKey = data.public_key
    }
    if (!publicKey) return false

    const reg = await registerServiceWorker()
    if (!reg) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    if (taskTitle && deadline) {
      // Task-specific reminder (24h/2h/1h/30m escalation for one deadline)
      await subscribeNotification(sessionId, sub.toJSON(), taskTitle, deadline)
    } else {
      // General enable (Settings page) — store the subscription on the session
      await savePushSubscription(sessionId, sub.toJSON())
    }
    return true
  } catch (e) {
    console.warn('[Push] Subscribe failed:', e)
    return false
  }
}

export function showLocalNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon-192.png' })
  }
}
