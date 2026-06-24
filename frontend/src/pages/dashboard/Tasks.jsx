import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, createTask, completeTask, deleteTask } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle2, Circle, Calendar, Plus, Trash2, CheckSquare, X } from 'lucide-react'

const PRIORITY_OPTS = [
  { value: 'urgent_important', label: 'Critical', color: 'bg-red-500',    outline: 'border-red-300 text-red-700 bg-red-50' },
  { value: 'urgent',           label: 'High',     color: 'bg-orange-500', outline: 'border-orange-300 text-orange-700 bg-orange-50' },
  { value: 'important',        label: 'Medium',   color: 'bg-yellow-400', outline: 'border-yellow-300 text-yellow-700 bg-yellow-50' },
  { value: 'neither',          label: 'Low',      color: 'bg-gray-300',   outline: 'border-gray-300 text-gray-600 bg-gray-50' },
]

const TIME_OPTS = [
  { value: 30,  label: '30m' },
  { value: 60,  label: '1h'  },
  { value: 120, label: '2h'  },
  { value: 240, label: '4h'  },
  { value: 480, label: '8h'  },
]

const BORDER_COLOR = {
  urgent_important: 'border-l-red-500',
  urgent:           'border-l-orange-500',
  important:        'border-l-yellow-400',
  neither:          'border-l-gray-300',
}

const SOURCE_BADGE = {
  ai:       'badge-green',
  manual:   'badge-gray',
  calendar: 'badge-blue',
}

function formatDeadline(deadline) {
  if (!deadline) return null
  try {
    const dt = new Date(deadline)
    const now = new Date()
    const diffMs = dt - now
    const diffH  = diffMs / 3600000
    const diffD  = Math.floor(diffH / 24)
    const remH   = Math.floor(diffH % 24)

    let color = 'text-gray-400'
    if (diffH < 0)  color = 'text-red-600 font-medium'
    else if (diffH < 2)  color = 'text-red-500 font-medium'
    else if (diffH < 24) color = 'text-orange-500'
    else if (diffH < 72) color = 'text-yellow-600'

    const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    let remaining = ''
    if (diffH < 0)        remaining = `${Math.abs(Math.round(diffH))}h overdue`
    else if (diffH < 1)   remaining = `${Math.round(diffMs / 60000)}m left`
    else if (diffH < 24)  remaining = `${Math.floor(diffH)}h ${Math.floor((diffH%1)*60)}m left`
    else                  remaining = `${diffD}d ${remH}h left`

    return { text: `Due ${dateStr} · ${remaining}`, color }
  } catch {
    return null
  }
}

function AddTaskModal({ sessionId, onClose, onAdded }) {
  const [title, setTitle]     = useState('')
  const [desc, setDesc]       = useState('')
  const [date, setDate]       = useState('')
  const [time, setTime]       = useState('')
  const [priority, setPriority] = useState('important')
  const [mins, setMins]       = useState(null)
  const [addCal, setAddCal]   = useState(true)
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  const submit = async () => {
    if (!title.trim()) { setErr('Title is required'); return }
    setSaving(true)
    setErr('')
    try {
      let deadline = ''
      if (date) {
        deadline = time ? `${date}T${time}:00` : `${date}T23:59:00`
      }
      const task = await createTask(sessionId, {
        title: title.trim(),
        description: desc.trim() || undefined,
        deadline: deadline || undefined,
        priority,
        estimated_minutes: mins || undefined,
        source: 'manual',
        add_to_calendar: addCal && !!deadline,
      })
      onAdded(task)
      onClose()
    } catch (e) {
      setErr(e.message || 'Failed to add task')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 className="text-lg font-semibold text-primary">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="What needs to be done?"
              className="w-full text-lg font-medium border-0 border-b-2 border-border focus:border-primary outline-none pb-2 placeholder-gray-300 transition-colors"
            />
          </div>

          {/* Description */}
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary resize-none placeholder-gray-300 transition-colors"
          />

          {/* Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted mb-1 block uppercase tracking-wide font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block uppercase tracking-wide font-medium">Time</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs text-muted mb-2 block uppercase tracking-wide font-medium">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITY_OPTS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    priority === p.value
                      ? `${p.outline} border-2`
                      : 'border-border text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${p.color}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estimated time */}
          <div>
            <label className="text-xs text-muted mb-2 block uppercase tracking-wide font-medium">Estimated time</label>
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setMins(mins === t.value ? null : t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    mins === t.value
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-gray-500 hover:border-gray-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add to calendar toggle */}
          {date && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setAddCal(v => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors ${addCal ? 'bg-accent' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${addCal ? 'left-5' : 'left-1'}`} />
              </div>
              <span className="text-sm text-primary">Automatically add to Google Calendar</span>
            </label>
          )}

          {err && <p className="text-xs text-red-500">{err}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-outline py-2 px-5 text-sm">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !title.trim()}
            className="btn-primary py-2 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onDone, onDelete }) {
  const [hovered, setHovered] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const borderCls = BORDER_COLOR[task.priority] || 'border-l-gray-300'
  const dl = formatDeadline(task.deadline)
  const srcBadge = SOURCE_BADGE[task.source] || 'badge-gray'
  const srcLabel = task.source === 'ai' ? 'AI' : task.source === 'calendar' ? 'Cal' : 'Manual'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirming(false) }}
      className={`relative border-l-4 ${borderCls} bg-white border border-border rounded-lg px-4 py-3 transition-shadow hover:shadow-sm ${task.completed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-base font-medium leading-snug ${task.completed ? 'line-through text-muted' : 'text-primary'}`}>
            {task.title}
          </p>
          {task.description && !task.completed && (
            <p className="text-xs text-muted mt-0.5 line-clamp-1">{task.description}</p>
          )}
          {dl && (
            <p className={`text-xs mt-1 ${dl.color}`}>{dl.text}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.priority && (
              <span className={`badge-${task.priority === 'urgent_important' ? 'red' : task.priority === 'urgent' ? 'orange' : task.priority === 'important' ? 'yellow' : 'gray'}`}>
                {task.priority === 'urgent_important' ? 'Critical' : task.priority === 'urgent' ? 'High' : task.priority === 'important' ? 'Medium' : 'Low'}
              </span>
            )}
            {task.estimated_minutes && (
              <span className="badge-gray">{task.estimated_minutes >= 60 ? `${task.estimated_minutes/60}h` : `${task.estimated_minutes}m`}</span>
            )}
            <span className={srcBadge}>{srcLabel}</span>
          </div>
        </div>
        <span className={`${srcBadge} flex-shrink-0 opacity-0`} />
      </div>

      {/* Hover actions */}
      {hovered && !task.completed && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <button
            onClick={() => onDone(task.id)}
            className="flex items-center gap-1 text-xs bg-accent-light text-accent-text border border-accent-border rounded-md px-2 py-1 hover:bg-green-100 transition-colors"
          >
            <CheckCircle2 className="w-3 h-3" /> Done
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="p-1.5 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onDelete(task.id)}
              className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 rounded-md px-2 py-1 hover:bg-red-100 transition-colors"
            >
              Confirm delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const FILTERS = ['All', 'Active', 'Completed', 'Overdue']

export default function Tasks() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('Active')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', user?.sessionId],
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => d.tasks || [],
  })

  const doneMut = useMutation({
    mutationFn: id => completeTask(user.sessionId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', user?.sessionId] }),
  })

  const deleteMut = useMutation({
    mutationFn: id => deleteTask(user.sessionId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', user?.sessionId] }),
  })

  const tasks   = data || []
  const now     = new Date()
  const active  = tasks.filter(t => !t.completed)
  const done    = tasks.filter(t => t.completed)
  const overdue = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < now)

  const filtered = useMemo(() => {
    if (filter === 'Active')    return active
    if (filter === 'Completed') return done
    if (filter === 'Overdue')   return overdue
    return tasks
  }, [filter, tasks])

  const handleAdded = () => {
    qc.invalidateQueries({ queryKey: ['tasks', user?.sessionId] })
  }

  if (isLoading) return (
    <div className="p-6 space-y-3 max-w-2xl">
      {[1,2,3,4].map(i => <div key={i} className="skeleton h-20 rounded-lg" />)}
    </div>
  )

  return (
    <div className="p-5 max-w-2xl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-muted">
          {active.length} active &middot; {done.length} completed
          {overdue.length > 0 && <span className="text-red-500 font-medium"> &middot; {overdue.length} overdue</span>}
        </p>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="flex gap-1 bg-subtle rounded-lg p-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  filter === f ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-primary'
                }`}
              >
                {f}
                {f === 'Overdue' && overdue.length > 0 && (
                  <span className="ml-1 text-red-400">{overdue.length}</span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-sm py-1.5 px-3"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {isError && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">Failed to load tasks</p>
          <button onClick={() => refetch()} className="btn-outline text-xs mt-3 py-1 px-3">Retry</button>
        </div>
      )}

      {!isError && filtered.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-base font-medium text-primary mb-1">
            {filter === 'All' ? 'No tasks yet' : `No ${filter.toLowerCase()} tasks`}
          </p>
          <p className="text-sm text-muted mb-5">
            {filter === 'All' ? 'Ask the AI agent or add one manually' : `Switch filter or add a new task`}
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm py-2 px-5">
            <Plus className="w-4 h-4" /> Add Your First Task
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(t => (
            <TaskCard
              key={t.id}
              task={t}
              onDone={id => doneMut.mutate(id)}
              onDelete={id => deleteMut.mutate(id)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <AddTaskModal
          sessionId={user.sessionId}
          onClose={() => setShowModal(false)}
          onAdded={handleAdded}
        />
      )}
    </div>
  )
}
