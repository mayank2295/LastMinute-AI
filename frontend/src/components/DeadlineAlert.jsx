import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Bell, CheckCircle2 } from 'lucide-react'
import { parseISO, isValid } from 'date-fns'
import { subscribeToPush } from '../services/notifications'

function getUrgency(startTime) {
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return null
    const h = (dt - Date.now()) / 3_600_000
    if (h < 0)   return { label: 'Overdue',                    color: 'text-red',   bg: 'bg-red-light',   border: 'border-red/20' }
    if (h < 2)   return { label: `${Math.floor(h * 60)}m left`, color: 'text-red',   bg: 'bg-red-light',   border: 'border-red/20' }
    if (h < 24)  return { label: `${Math.floor(h)}h left`,      color: 'text-amber', bg: 'bg-amber-light', border: 'border-amber/20' }
    if (h < 72)  return { label: `${Math.floor(h / 24)}d left`, color: 'text-blue',  bg: 'bg-blue-light',  border: 'border-blue/20' }
    return null
  } catch { return null }
}

function Alert({ event, sessionId, onDismiss }) {
  const [dismissed, setDismissed] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [urgency, setUrgency] = useState(() => getUrgency(event.start_time))

  useEffect(() => {
    const id = setInterval(() => setUrgency(getUrgency(event.start_time)), 10_000)
    return () => clearInterval(id)
  }, [event.start_time])

  if (!urgency || dismissed) return null

  const handleSubscribe = async () => {
    const ok = await subscribeToPush(sessionId, event.title, event.start_time)
    if (ok) setSubscribed(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${urgency.bg} ${urgency.border}`}
    >
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${urgency.color}`} />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <p className="text-sm font-semibold text-ink truncate">{event.title}</p>
        <span className={`text-xs font-mono flex-shrink-0 ${urgency.color}`}>{urgency.label}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {subscribed ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green" />
        ) : (
          <button
            onClick={handleSubscribe}
            title="Set push reminders"
            className={`${urgency.color} opacity-60 hover:opacity-100 transition-opacity`}
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => { setDismissed(true); onDismiss?.(event.id) }}
          className="text-ink-4 hover:text-ink transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

export default function DeadlineAlert({ events = [], sessionId }) {
  const [dismissed, setDismissed] = useState(new Set())

  const urgent = events.filter(ev => {
    if (dismissed.has(ev.id)) return false
    if (!ev.start_time?.includes('T')) return false
    try {
      const h = (parseISO(ev.start_time) - Date.now()) / 3_600_000
      return h < 72
    } catch { return false }
  })

  if (urgent.length === 0) return null

  return (
    <div className="space-y-1.5 px-4 pt-2.5 pb-1">
      <AnimatePresence mode="popLayout">
        {urgent.slice(0, 3).map(ev => (
          <Alert
            key={ev.id}
            event={ev}
            sessionId={sessionId}
            onDismiss={id => setDismissed(prev => new Set([...prev, id]))}
          />
        ))}
      </AnimatePresence>
      {urgent.length > 3 && (
        <p className="text-xs text-ink-4 text-right px-1">+{urgent.length - 3} more deadlines</p>
      )}
    </div>
  )
}
