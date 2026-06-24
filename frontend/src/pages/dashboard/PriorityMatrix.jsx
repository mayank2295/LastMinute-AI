import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getTasks, completeTask, deleteTask } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  CheckCircle2, Circle, Timer, Trash2, Flame,
  AlertTriangle, CalendarClock, ListChecks, ArrowRight,
} from 'lucide-react'

/* ─── Time helpers ────────────────────────────────────────────────────────── */
function hoursLeft(deadline) {
  if (!deadline) return Infinity
  const ms = new Date(deadline) - Date.now()
  return ms / 3_600_000
}

function countdown(deadline) {
  if (!deadline) return { text: 'No deadline', color: 'badge-gray' }
  const h = hoursLeft(deadline)
  if (h < 0)  return { text: `${Math.abs(Math.round(h))}h overdue`, color: 'badge-red' }
  if (h < 1)  return { text: `${Math.max(1, Math.round(h * 60))}m left`, color: 'badge-red' }
  if (h < 24) return { text: `${Math.floor(h)}h left`, color: 'badge-orange' }
  if (h < 48) return { text: 'Tomorrow', color: 'badge-yellow' }
  return { text: `${Math.ceil(h / 24)}d left`, color: 'badge-blue' }
}

function priorityBorder(p) {
  return {
    urgent_important: 'border-l-red-500',
    urgent:           'border-l-orange-500',
    important:        'border-l-blue-500',
    neither:          'border-l-gray-300',
  }[p] || 'border-l-gray-300'
}

function whyNow(task) {
  const h = hoursLeft(task.deadline)
  if (h < 0)  return 'Overdue — clear this immediately'
  if (h < 2)  return 'Due within 2 hours — highest priority'
  if (h < 24) return 'Due today — start before it becomes a crisis'
  if (task.priority === 'urgent_important') return 'Critical & important — protect time for this'
  if (h < 48) return 'Due tomorrow — get ahead now'
  return 'On your radar — chip away when you have a gap'
}

/* ─── Buckets (time horizon) ──────────────────────────────────────────────── */
const BUCKETS = [
  { id: 'overdue',  label: 'Overdue',     icon: AlertTriangle, color: 'text-red-600',    test: h => h < 0 },
  { id: 'today',    label: 'Due today',   icon: Flame,         color: 'text-orange-600', test: h => h >= 0 && h < 24 },
  { id: 'tomorrow', label: 'Tomorrow',    icon: CalendarClock, color: 'text-yellow-600', test: h => h >= 24 && h < 48 },
  { id: 'week',     label: 'This week',   icon: CalendarClock, color: 'text-blue-600',   test: h => h >= 48 && h < 168 },
  { id: 'later',    label: 'Later / no deadline', icon: ListChecks, color: 'text-gray-500', test: h => h >= 168 },
]

function bucketFor(task) {
  const h = hoursLeft(task.deadline)
  if (h === Infinity) return 'later'
  return BUCKETS.find(b => b.test(h))?.id || 'later'
}

/* ─── Task row ────────────────────────────────────────────────────────────── */
function TaskRow({ task, rank, onDone, onDelete, onFocus }) {
  const cd = countdown(task.deadline)
  return (
    <div className={`flex items-center gap-3 bg-white border border-border border-l-4 ${priorityBorder(task.priority)} rounded-lg px-3 py-2.5 hover:shadow-sm transition-shadow group`}>
      {rank != null && (
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-subtle text-muted text-xs font-bold flex items-center justify-center">
          {rank}
        </span>
      )}
      <button onClick={() => onDone(task.id)} className="flex-shrink-0 hover:scale-110 transition-transform">
        <Circle className="w-5 h-5 text-gray-300 hover:text-accent" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-primary truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={cd.color}>{cd.text}</span>
          {task.estimated_minutes && (
            <span className="badge-gray">{task.estimated_minutes >= 60 ? `${task.estimated_minutes / 60}h` : `${task.estimated_minutes}m`}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onFocus(task)} title="Start focus session"
          className="flex items-center gap-1 text-xs bg-primary text-white rounded-md px-2 py-1 hover:bg-gray-800 transition-colors">
          <Timer className="w-3 h-3" /> Focus
        </button>
        <button onClick={() => onDelete(task.id)} title="Delete"
          className="p-1.5 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function PriorityMatrix() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const QKEY = ['tasks', user?.sessionId]

  const { data, isLoading } = useQuery({
    queryKey: QKEY,
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => d.tasks || [],
  })

  const doneMut = useMutation({
    mutationFn: id => completeTask(user.sessionId, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QKEY })
      const snap = qc.getQueryData(QKEY)
      qc.setQueryData(QKEY, old => (old || []).map(t => t.id === id ? { ...t, completed: true } : t))
      return { snap }
    },
    onError: (_e, _v, ctx) => ctx?.snap && qc.setQueryData(QKEY, ctx.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: QKEY }),
  })

  const delMut = useMutation({
    mutationFn: id => deleteTask(user.sessionId, id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: QKEY })
      const snap = qc.getQueryData(QKEY)
      qc.setQueryData(QKEY, old => (old || []).filter(t => t.id !== id))
      return { snap }
    },
    onError: (_e, _v, ctx) => ctx?.snap && qc.setQueryData(QKEY, ctx.snap),
    onSettled: () => qc.invalidateQueries({ queryKey: QKEY }),
  })

  const tasks = data || []

  // Smart ranking: soonest deadline first; ties / no-deadline fall back to AI priority score.
  const ranked = useMemo(() => {
    return tasks
      .filter(t => !t.completed)
      .sort((a, b) => {
        const ha = hoursLeft(a.deadline), hb = hoursLeft(b.deadline)
        if (ha !== hb) return ha - hb
        return (b.priority_score || 0) - (a.priority_score || 0)
      })
  }, [tasks])

  const completed = tasks.filter(t => t.completed)
  const top = ranked[0]

  // Group ranked tasks (skip #1, it's the hero) into time buckets, preserving global rank
  const grouped = useMemo(() => {
    const g = {}
    ranked.forEach((t, i) => {
      const b = bucketFor(t)
      ;(g[b] = g[b] || []).push({ task: t, rank: i + 1 })
    })
    return g
  }, [ranked])

  const onFocus = (task) => navigate('/dashboard/timer')

  if (isLoading) return (
    <div className="p-6 space-y-3 max-w-3xl">
      <div className="skeleton h-28 rounded-xl" />
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-lg" />)}
    </div>
  )

  if (ranked.length === 0 && completed.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <ListChecks className="w-12 h-12 text-gray-200 mb-3" />
        <p className="text-base font-semibold text-primary mb-1">No tasks in your game plan yet</p>
        <p className="text-sm text-muted mb-5 max-w-sm">
          Use <b>Plan my day</b> or <b>Brain dump</b> on the Dashboard, or just tell the AI what you need to get done.
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm py-2 px-5">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-primary">Your game plan</h2>
          <p className="text-sm text-muted">
            {ranked.length} to do{ranked.length ? ` · ranked smartest-first by AI` : ''} · {completed.length} done
          </p>
        </div>
        {(ranked.length + completed.length) > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${Math.round(completed.length / (ranked.length + completed.length) * 100)}%` }} />
            </div>
            <span className="text-xs text-muted">
              {Math.round(completed.length / (ranked.length + completed.length) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* START HERE hero */}
      {top && (
        <div className="rounded-xl border-2 border-accent bg-accent-light p-5">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-accent-text">Start here</span>
          </div>
          <p className="text-xl font-bold text-primary leading-snug">{top.title}</p>
          <p className="text-sm text-accent-text mt-1">{whyNow(top)}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={countdown(top.deadline).color}>{countdown(top.deadline).text}</span>
            {top.estimated_minutes && (
              <span className="badge-gray">~{top.estimated_minutes >= 60 ? `${top.estimated_minutes / 60}h` : `${top.estimated_minutes}m`}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button onClick={() => onFocus(top)} className="btn-primary text-sm py-2 px-4">
              <Timer className="w-4 h-4" /> Start focus session
            </button>
            <button onClick={() => doneMut.mutate(top.id)} className="btn-outline text-sm py-2 px-4">
              <CheckCircle2 className="w-4 h-4" /> Mark done
            </button>
          </div>
        </div>
      )}

      {/* Time-bucketed queue */}
      {BUCKETS.map(b => {
        const items = (grouped[b.id] || []).filter(({ rank }) => rank !== 1) // hero already shown
        if (!items.length) return null
        return (
          <div key={b.id}>
            <div className="flex items-center gap-2 mb-2">
              <b.icon className={`w-4 h-4 ${b.color}`} />
              <span className={`text-xs font-bold uppercase tracking-widest ${b.color}`}>{b.label}</span>
              <span className="text-xs text-muted">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map(({ task, rank }) => (
                <TaskRow key={task.id} task={task} rank={rank}
                  onDone={id => doneMut.mutate(id)}
                  onDelete={id => delMut.mutate(id)}
                  onFocus={onFocus} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Completed (collapsed-ish) */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold uppercase tracking-widest text-accent-text">Completed ({completed.length})</span>
          </div>
          <div className="space-y-1.5">
            {completed.slice(0, 8).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-subtle opacity-60">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-sm text-muted line-through truncate">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
