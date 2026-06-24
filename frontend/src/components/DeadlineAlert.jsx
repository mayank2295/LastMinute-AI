import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Bell } from 'lucide-react'
import { parseISO, isValid } from 'date-fns'
import { subscribeToPush } from '../services/notifications'

function getUrgency(startTime) {
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return null
    const hours = (dt - Date.now()) / 3_600_000
    if (hours < 0)  return { level: 'overdue',   label: 'OVERDUE',       color: 'text-red-alert',   bg: 'bg-red-alert/10',   border: 'border-red-alert/50' }
    if (hours < 2)  return { level: 'critical',  label: `${Math.floor(hours * 60)}m left`,  color: 'text-red-alert',   bg: 'bg-red-alert/10',   border: 'border-red-alert/50' }
    if (hours < 24) return { level: 'high',      label: `${Math.floor(hours)}h left`,       color: 'text-orange-warn', bg: 'bg-orange-warn/10', border: 'border-orange-warn/50' }
    if (hours < 72) return { level: 'medium',    label: `${Math.floor(hours)}h left`,       color: 'text-yellow-note', bg: 'bg-yellow-note/10', border: 'border-yellow-note/50' }
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
    setSubscribed(ok)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${urgency.bg} ${urgency.border}`}
    >
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${urgency.color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{event.title}</p>
        <p className={`text-xs font-mono mt-0.5 ${urgency.color}`}>{urgency.label}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!subscribed && (
          <button
            onClick={handleSubscribe}
            title="Set push reminders"
            className={`${urgency.color} opacity-70 hover:opacity-100 transition-opacity`}
          >
            <Bell className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => { setDismissed(true); onDismiss?.(event.id) }}
          className="text-text-muted hover:text-white transition-colors"
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
    const hours = (parseISO(ev.start_time) - Date.now()) / 3_600_000
    return hours < 72
  })

  if (urgent.length === 0) return null

  return (
    <div className="space-y-2 px-4 pt-3">
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
        <p className="text-xs text-text-muted text-right px-1">
          +{urgent.length - 3} more upcoming deadlines
        </p>
      )}
    </div>
  )
}
