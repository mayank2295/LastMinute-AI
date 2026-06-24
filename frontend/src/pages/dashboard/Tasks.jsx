import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, completeTask } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle2, Circle, Calendar, RefreshCw, CheckSquare } from 'lucide-react'

const PRIORITY_META = {
  urgent_important: { label: 'Do First',  cls: 'badge-red' },
  important:        { label: 'Schedule',  cls: 'badge-yellow' },
  urgent:           { label: 'Delegate',  cls: 'badge-orange' },
  neither:          { label: 'Eliminate', cls: 'badge-gray' },
}

function TaskRow({ task, onDone }) {
  const meta = PRIORITY_META[task.priority] || { label: task.priority || '—', cls: 'badge-gray' }
  return (
    <div className={`flex items-start gap-3 py-3 border-b border-border last:border-0 group ${task.completed ? 'opacity-40' : ''}`}>
      <button
        onClick={() => !task.completed && onDone(task.id)}
        className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
      >
        {task.completed
          ? <CheckCircle2 className="w-4 h-4 text-accent" />
          : <Circle className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.completed ? 'line-through text-muted' : 'text-primary font-medium'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted mt-0.5 line-clamp-1">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={meta.cls}>{meta.label}</span>
          {task.deadline && (
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(task.deadline).toLocaleDateString(undefined, { month:'short', day:'numeric' })}
            </span>
          )}
          {task.effort_estimate && (
            <span className="text-[11px] text-muted">{task.effort_estimate}m</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Tasks() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['tasks', user?.sessionId],
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => d.tasks || [],
  })

  const doneMut = useMutation({
    mutationFn: id => completeTask(user.sessionId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', user?.sessionId] }),
  })

  const tasks   = data || []
  const active  = tasks.filter(t => !t.completed)
  const done    = tasks.filter(t => t.completed)
  const total   = tasks.length
  const doneCnt = done.length

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted">{active.length} active · {doneCnt} completed</p>
        <button onClick={() => refetch()} className="btn-outline text-xs py-1 px-3 flex items-center gap-1.5">
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-[11px] text-muted mb-1.5">
            <span>Progress</span>
            <span>{Math.round((doneCnt / total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${total ? (doneCnt / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-14" />)}</div>
      )}

      {isError && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">Failed to load tasks</p>
          <button onClick={() => refetch()} className="btn-outline text-xs mt-3 py-1 px-3">Retry</button>
        </div>
      )}

      {!isLoading && !isError && tasks.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-primary mb-1">No tasks yet</p>
          <p className="text-xs text-muted">Ask the AI to prioritize your tasks: "I need to finish X, Y, Z by tomorrow"</p>
        </div>
      )}

      {/* Active tasks */}
      {active.length > 0 && (
        <div className="bg-white border border-border rounded-xl px-4 mb-4">
          {active.map(t => <TaskRow key={t.id} task={t} onDone={id => doneMut.mutate(id)} />)}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-2">Completed</p>
          <div className="bg-white border border-border rounded-xl px-4">
            {done.map(t => <TaskRow key={t.id} task={t} onDone={() => {}} />)}
          </div>
        </div>
      )}
    </div>
  )
}
