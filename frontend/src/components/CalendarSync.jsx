import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, RefreshCw, ExternalLink, MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow, parseISO, isValid, format } from 'date-fns'
import { useCalendar } from '../hooks/useCalendar'

function urgencyClass(startTime) {
  if (!startTime) return 'urgency-low'
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return 'urgency-low'
    const hours = (dt - Date.now()) / 3_600_000
    if (hours < 2)  return 'urgency-critical'
    if (hours < 24) return 'urgency-high'
    if (hours < 72) return 'urgency-medium'
    return 'urgency-low'
  } catch { return 'urgency-low' }
}

function CountdownTimer({ startTime }) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    const update = () => {
      try {
        const dt = parseISO(startTime)
        if (!isValid(dt)) return setLabel('')
        const diff = dt - Date.now()
        if (diff < 0) return setLabel('Started')
        const h = Math.floor(diff / 3_600_000)
        const m = Math.floor((diff % 3_600_000) / 60_000)
        const s = Math.floor((diff % 60_000) / 1_000)
        if (h > 0)  setLabel(`${h}h ${m}m`)
        else        setLabel(`${m}m ${s}s`)
      } catch { setLabel('') }
    }
    update()
    const id = setInterval(update, 1_000)
    return () => clearInterval(id)
  }, [startTime])

  return <span>{label}</span>
}

function EventCard({ event }) {
  const urg = urgencyClass(event.start_time)
  const hasTime = event.start_time?.includes('T')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className={`panel p-3 border-l-2 ${
        urg === 'urgency-critical' ? 'border-l-red-alert' :
        urg === 'urgency-high'     ? 'border-l-orange-warn' :
        urg === 'urgency-medium'   ? 'border-l-yellow-note' :
                                     'border-l-green-ok'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white leading-snug flex-1">{event.title}</p>
        {event.html_link && (
          <a
            href={event.html_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted hover:text-blue-glow transition-colors flex-shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {hasTime && (
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            {format(parseISO(event.start_time), 'EEE, MMM d · h:mm a')}
          </span>
        )}
        {event.location && (
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <MapPin className="w-3 h-3" />
            {event.location}
          </span>
        )}
      </div>

      {hasTime && (
        <div className={`mt-2 text-xs font-mono px-2 py-0.5 rounded-full inline-block border ${urg}`}>
          <CountdownTimer startTime={event.start_time} />
        </div>
      )}
    </motion.div>
  )
}

export default function CalendarSync({ sessionId }) {
  const { data: events = [], isLoading, isError, refetch, isFetching } = useCalendar(sessionId)

  const sorted = [...events].sort((a, b) => {
    const ta = a.start_time ? new Date(a.start_time).getTime() : Infinity
    const tb = b.start_time ? new Date(b.start_time).getTime() : Infinity
    return ta - tb
  })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue-glow" />
        <span className="text-sm font-semibold text-white">Calendar</span>
        <span className="text-xs text-text-muted ml-1">Next 7 days</span>
        <button
          onClick={() => refetch()}
          className="ml-auto text-text-muted hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="panel p-3 animate-pulse">
                <div className="h-3 bg-panel-light rounded w-3/4 mb-2" />
                <div className="h-2 bg-panel-light rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-6">
            <p className="text-red-alert/80 text-sm">Failed to load calendar</p>
            <button onClick={() => refetch()} className="btn-ghost text-xs mt-2">Retry</button>
          </div>
        )}

        {!isLoading && !isError && sorted.length === 0 && (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 text-border mx-auto mb-2" />
            <p className="text-text-muted text-sm">No events in the next 7 days</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {sorted.map(ev => <EventCard key={ev.id} event={ev} />)}
        </AnimatePresence>
      </div>

      {!isLoading && events.length > 0 && (
        <div className="px-4 py-2 border-t border-border text-xs text-text-muted">
          {events.length} event{events.length !== 1 ? 's' : ''} · Auto-refreshes every 5 min
        </div>
      )}
    </div>
  )
}
