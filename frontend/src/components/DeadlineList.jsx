import { useState, useEffect } from 'react'
import { parseISO, isValid, format, isToday, isTomorrow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { getCalendarEvents } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { RefreshCw, Calendar } from 'lucide-react'

function countdown(startTime) {
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return null
    const diff = dt - Date.now()
    if (diff < 0) return { label: 'Overdue', cls: 'badge-red' }
    const h = diff / 3_600_000
    if (h < 2)  return { label: `${Math.floor(h * 60)}m left`, cls: 'badge-red' }
    if (h < 24) return { label: `${Math.floor(h)}h left`,      cls: 'badge-orange' }
    if (h < 72) return { label: `${Math.floor(h / 24)}d left`, cls: 'badge-yellow' }
    return null
  } catch { return null }
}

function dayLabel(startTime) {
  if (!startTime) return 'Upcoming'
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return 'Upcoming'
    if (isToday(dt))    return 'Today'
    if (isTomorrow(dt)) return 'Tomorrow'
    return format(dt, 'EEE, MMM d')
  } catch { return 'Upcoming' }
}

function borderColor(startTime) {
  if (!startTime?.includes('T')) return 'border-l-gray-200'
  try {
    const h = (parseISO(startTime) - Date.now()) / 3_600_000
    if (h < 0)  return 'border-l-red-500'
    if (h < 2)  return 'border-l-red-400'
    if (h < 24) return 'border-l-orange-400'
    if (h < 72) return 'border-l-yellow-400'
    return 'border-l-gray-200'
  } catch { return 'border-l-gray-200' }
}

function EventCard({ ev, tz }) {
  const [cd, setCd] = useState(() => countdown(ev.start_time))

  useEffect(() => {
    if (!ev.start_time?.includes('T')) return
    const id = setInterval(() => setCd(countdown(ev.start_time)), 10_000)
    return () => clearInterval(id)
  }, [ev.start_time])

  const hasTime = ev.start_time?.includes('T')
  // Render the wall-clock time in the user's calendar timezone so it matches Google Calendar.
  const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz })

  return (
    <div className={`bg-white border border-border border-l-4 ${borderColor(ev.start_time)} rounded-lg p-3`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-primary leading-snug truncate">{ev.title}</p>
        {cd && <span className={cd.cls}>{cd.label}</span>}
      </div>
      {hasTime && (
        <p className="text-[11px] text-muted mt-1">
          {fmt(ev.start_time)}
          {ev.end_time?.includes('T') && ` – ${fmt(ev.end_time)}`}
        </p>
      )}
    </div>
  )
}

export default function DeadlineList() {
  const { user, tz } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['calendar', user?.sessionId, 7],
    queryFn: () => getCalendarEvents(user.sessionId, 7),
    enabled: !!user,
    refetchInterval: 5 * 60_000,
    select: d => d.events || [],
  })

  const events = data || []

  // Group by day label
  const groups = {}
  const sorted = [...events].sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0))
  for (const ev of sorted) {
    const lbl = dayLabel(ev.start_time)
    if (!groups[lbl]) groups[lbl] = []
    groups[lbl].push(ev)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
        <p className="text-xs font-semibold text-primary">Upcoming deadlines</p>
        <button onClick={() => refetch()} className="p-1 rounded hover:bg-subtle transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 text-muted ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {isLoading && (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="skeleton h-14" />)}
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <p className="text-xs text-muted mb-2">Failed to load calendar</p>
            <button onClick={() => refetch()} className="btn-outline text-xs py-1 px-3">Retry</button>
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="text-center py-10">
            <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-muted">Connect Google Calendar to see your deadlines</p>
          </div>
        )}

        {Object.entries(groups).map(([label, evs]) => (
          <div key={label}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2">{label}</p>
            <div className="space-y-1.5">
              {evs.map(ev => <EventCard key={ev.id} ev={ev} tz={tz} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
