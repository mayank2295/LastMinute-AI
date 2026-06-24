import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, RefreshCw, ExternalLink, Clock } from 'lucide-react'
import { format, parseISO, isValid, isToday, isTomorrow } from 'date-fns'
import { useCalendar } from '../hooks/useCalendar'

function getUrgencyStyle(startTime) {
  if (!startTime?.includes('T')) return { bar: 'bg-blue', text: 'text-ink-3' }
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return { bar: 'bg-blue', text: 'text-ink-3' }
    const h = (dt - Date.now()) / 3_600_000
    if (h < 0)   return { bar: 'bg-red',   text: 'text-red',   badge: 'badge-red',   label: 'Overdue' }
    if (h < 2)   return { bar: 'bg-red',   text: 'text-red',   badge: 'badge-red',   label: `${Math.floor(h*60)}m` }
    if (h < 24)  return { bar: 'bg-amber', text: 'text-amber', badge: 'badge-amber', label: `${Math.floor(h)}h` }
    if (h < 72)  return { bar: 'bg-blue',  text: 'text-blue',  badge: 'badge-blue',  label: `${Math.floor(h/24)}d` }
    return { bar: 'bg-green', text: 'text-ink-3' }
  } catch { return { bar: 'bg-blue', text: 'text-ink-3' } }
}

function dayLabel(startTime) {
  if (!startTime) return ''
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return ''
    if (isToday(dt))    return 'Today'
    if (isTomorrow(dt)) return 'Tomorrow'
    return format(dt, 'EEE, MMM d')
  } catch { return '' }
}

function EventRow({ event }) {
  const s = getUrgencyStyle(event.start_time)
  const hasTime = event.start_time?.includes('T')
  const [count, setCount] = useState('')

  useEffect(() => {
    if (!hasTime) return
    const update = () => {
      try {
        const dt = parseISO(event.start_time)
        const diff = dt - Date.now()
        if (diff < 0) { setCount('Now'); return }
        const h = Math.floor(diff / 3_600_000)
        const m = Math.floor((diff % 3_600_000) / 60_000)
        const sec = Math.floor((diff % 60_000) / 1_000)
        if (h > 0) setCount(`${h}h ${m}m`)
        else       setCount(`${m}m ${sec}s`)
      } catch {}
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [event.start_time, hasTime])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      className="flex items-start gap-3 py-3 border-b border-border-sm last:border-0 group"
    >
      {/* Urgency bar */}
      <div className={`flex-shrink-0 w-1 rounded-full self-stretch ${s.bar}`} style={{ minHeight: '32px' }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm text-ink leading-snug truncate">{event.title}</p>
          {event.html_link && (
            <a href={event.html_link} target="_blank" rel="noopener noreferrer"
               className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <ExternalLink className="w-3.5 h-3.5 text-ink-4 hover:text-blue" />
            </a>
          )}
        </div>
        {hasTime && (
          <p className="text-xs text-ink-4 mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(parseISO(event.start_time), 'h:mm a')}
            {event.end_time?.includes('T') && ` – ${format(parseISO(event.end_time), 'h:mm a')}`}
          </p>
        )}
      </div>

      {hasTime && count && (
        <span className={`font-mono text-xs flex-shrink-0 ${s.text}`}>{count}</span>
      )}
    </motion.div>
  )
}

export default function CalendarSync({ sessionId }) {
  const { data: events = [], isLoading, isError, refetch, isFetching } = useCalendar(sessionId)

  // Group events by day label
  const grouped = {}
  const sorted = [...events].sort((a, b) =>
    (new Date(a.start_time || 0)) - (new Date(b.start_time || 0))
  )
  for (const ev of sorted) {
    const lbl = dayLabel(ev.start_time) || 'Upcoming'
    if (!grouped[lbl]) grouped[lbl] = []
    grouped[lbl].push(ev)
  }

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border-sm flex items-center gap-2">
        <Calendar className="w-4 h-4 text-blue" />
        <span className="font-semibold text-sm text-ink">Calendar</span>
        <span className="text-xs text-ink-4">7 days</span>
        <button onClick={() => refetch()} className="ml-auto btn-ghost p-1.5 rounded-lg">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue' : 'text-ink-4'}`} />
        </button>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading && (
          <div className="space-y-3 pt-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="flex gap-3">
                <div className="skeleton w-1 h-12" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <p className="text-sm text-ink-3 mb-2">Failed to load calendar</p>
            <button onClick={() => refetch()} className="btn-secondary text-xs">Retry</button>
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="text-center py-10">
            <Calendar className="w-8 h-8 text-ink-4 mx-auto mb-2" />
            <p className="text-sm text-ink-3">No events in the next 7 days</p>
          </div>
        )}

        {Object.entries(grouped).map(([label, evs]) => (
          <div key={label} className="mt-4">
            <p className="label mb-2">{label}</p>
            <AnimatePresence mode="popLayout">
              {evs.map(ev => <EventRow key={ev.id} event={ev} />)}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {events.length > 0 && (
        <div className="px-4 py-2 border-t border-border-sm text-xs text-ink-4 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green" />
          {events.length} events · Live sync
        </div>
      )}
    </div>
  )
}
