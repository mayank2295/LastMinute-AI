import { useQuery } from '@tanstack/react-query'
import { getCalendarEvents } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Calendar as CalIcon, ExternalLink, RefreshCw, Clock } from 'lucide-react'
import { format, parseISO, isValid, isToday, isTomorrow, startOfDay, addDays } from 'date-fns'

function daysBetween(start, end) {
  const days = []
  let cur = start
  while (cur <= end) { days.push(cur); cur = addDays(cur, 1) }
  return days
}

function EventRow({ ev }) {
  const hasTime = ev.start_time?.includes('T')
  let h = null
  if (hasTime) {
    try { h = (parseISO(ev.start_time) - Date.now()) / 3_600_000 } catch {}
  }
  const barColor = h == null ? 'bg-gray-200'
    : h < 0 ? 'bg-red-500' : h < 2 ? 'bg-red-400'
    : h < 24 ? 'bg-orange-400' : 'bg-green-400'

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0 group">
      <div className={`w-1 rounded-full self-stretch flex-shrink-0 ${barColor}`} style={{ minHeight: 24 }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-primary truncate">{ev.title}</p>
        {hasTime && (
          <p className="text-[11px] text-muted mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(parseISO(ev.start_time), 'h:mm a')}
            {ev.end_time?.includes('T') && ` – ${format(parseISO(ev.end_time), 'h:mm a')}`}
          </p>
        )}
      </div>
      {ev.html_link && (
        <a href={ev.html_link} target="_blank" rel="noopener noreferrer"
           className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <ExternalLink className="w-3.5 h-3.5 text-muted hover:text-primary" />
        </a>
      )}
    </div>
  )
}

function DaySection({ date, events }) {
  const label = isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEEE, MMMM d')
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <p className={`text-xs font-bold ${isToday(date) ? 'text-accent' : 'text-primary'}`}>{label}</p>
        {isToday(date) && <span className="badge-green text-[10px] px-1.5 py-0">Today</span>}
        <span className="ml-auto text-[10px] text-muted">{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="bg-white border border-border rounded-xl px-3">
        {events.length === 0
          ? <p className="text-xs text-muted py-3 italic">No events scheduled</p>
          : events.map(ev => <EventRow key={ev.id} ev={ev} />)
        }
      </div>
    </div>
  )
}

export default function Calendar() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['calendar', user?.sessionId, 7],
    queryFn: () => getCalendarEvents(user.sessionId, 7),
    enabled: !!user,
    refetchInterval: 5 * 60_000,
    select: d => d.events || [],
  })
  const events = data || []

  const today = startOfDay(new Date())
  const days  = daysBetween(today, addDays(today, 6))

  const byDay = days.map(day => ({
    date: day,
    events: events.filter(ev => {
      if (!ev.start_time) return false
      try {
        const d = startOfDay(parseISO(ev.start_time))
        return d.getTime() === day.getTime()
      } catch { return false }
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
  }))

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-xs text-muted">{events.length} events in the next 7 days</p>
        <button onClick={() => refetch()} className="btn-outline text-xs py-1 px-3 flex items-center gap-1.5">
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Sync
        </button>
      </div>

      {isLoading && (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      )}

      {isError && (
        <div className="text-center py-12">
          <CalIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-muted mb-3">Connect Google Calendar to see your events</p>
          <button onClick={() => refetch()} className="btn-outline text-xs py-1 px-3">Retry</button>
        </div>
      )}

      {!isLoading && !isError && byDay.map(({ date, events: evs }) => (
        <DaySection key={date.toISOString()} date={date} events={evs} />
      ))}
    </div>
  )
}
