import { useQuery } from '@tanstack/react-query'
import { getReminders } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Bell, Clock, CheckCircle2 } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'

function ReminderRow({ r }) {
  const deadline = r.deadline ? (() => {
    try { const d = parseISO(r.deadline); return isValid(d) ? format(d, 'MMM d, h:mm a') : r.deadline } catch { return r.deadline }
  })() : '—'

  const slots = [
    { key: 'reminder_24h_sent', label: '24 hours before' },
    { key: 'reminder_2h_sent',  label: '2 hours before' },
    { key: 'reminder_30m_sent', label: '30 mins before' },
  ]

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-primary">{r.task_title}</p>
          <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Due {deadline}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border
          ${r.reminder_30m_sent ? 'badge-green' : 'badge-yellow'}`}>
          {r.reminder_30m_sent ? 'Sent' : 'Pending'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {slots.map(s => (
          <div key={s.key} className={`flex items-center gap-1.5 text-[11px] font-medium
            ${r[s.key] ? 'text-accent' : 'text-muted'}`}>
            {r[s.key]
              ? <CheckCircle2 className="w-3.5 h-3.5" />
              : <Clock className="w-3.5 h-3.5" />
            }
            {s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Reminders() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reminders', user?.sessionId],
    queryFn: () => getReminders(user.sessionId),
    enabled: !!user,
    select: d => d.reminders || [],
  })
  const reminders = data || []

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{reminders.length} reminder{reminders.length !== 1 ? 's' : ''} scheduled</p>
        <button onClick={() => refetch()} className="btn-outline text-xs py-1 px-3">Refresh</button>
      </div>

      {isLoading && (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      )}

      {isError && (
        <div className="text-center py-12 text-sm text-muted">
          <p>Failed to load reminders</p>
          <button onClick={() => refetch()} className="btn-outline text-xs mt-3 py-1 px-3">Retry</button>
        </div>
      )}

      {!isLoading && !isError && reminders.length === 0 && (
        <div className="text-center py-16">
          <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-primary mb-1">No reminders set</p>
          <p className="text-xs text-muted">Ask the AI "set a reminder for my deadline" to create escalating push notifications.</p>
        </div>
      )}

      <div className="space-y-3">
        {reminders.map(r => <ReminderRow key={r.id} r={r} />)}
      </div>
    </div>
  )
}
