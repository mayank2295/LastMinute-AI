import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, RefreshCw, Target } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, completeTask } from '../services/api'

const QUADRANTS = [
  {
    id: 'urgent_important',
    icon: '🔴', label: 'Do First',
    sub: 'Urgent & Important',
    header: 'bg-red-light border-red/20',
    headerText: 'text-red',
    bar: 'bg-red',
  },
  {
    id: 'important',
    icon: '🔵', label: 'Schedule',
    sub: 'Not Urgent, Important',
    header: 'bg-blue-light border-blue/20',
    headerText: 'text-blue',
    bar: 'bg-blue',
  },
  {
    id: 'urgent',
    icon: '🟡', label: 'Delegate',
    sub: 'Urgent, Not Important',
    header: 'bg-amber-light border-amber/20',
    headerText: 'text-amber',
    bar: 'bg-amber',
  },
  {
    id: 'neither',
    icon: '⚪', label: 'Eliminate',
    sub: 'Not Urgent, Not Important',
    header: 'bg-bg-subtle border-border-sm',
    headerText: 'text-ink-3',
    bar: 'bg-border-md',
  },
]

function TaskItem({ task, onComplete, barColor }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`flex items-start gap-2.5 py-2 group ${task.completed ? 'opacity-40' : ''}`}
    >
      <button
        onClick={() => !task.completed && onComplete(task.id)}
        className="flex-shrink-0 mt-0.5 transition-colors hover:scale-110 active:scale-95"
      >
        {task.completed
          ? <CheckCircle2 className="w-4 h-4 text-green" />
          : <Circle className={`w-4 h-4 ${barColor} opacity-60 group-hover:opacity-100`} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-snug ${task.completed ? 'line-through text-ink-4' : 'text-ink-2'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {task.deadline && (
            <span className="text-xs text-ink-4 font-mono">
              {new Date(task.deadline).toLocaleDateString(undefined, { month:'short', day:'numeric' })}
            </span>
          )}
          {task.effort_estimate && (
            <span className="text-xs text-ink-4">{task.effort_estimate}m</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function Quadrant({ q, tasks, onComplete }) {
  return (
    <div className="flex flex-col">
      {/* Quadrant header */}
      <div className={`rounded-t-xl border-x border-t px-3 py-2 ${q.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{q.icon}</span>
            <span className={`text-xs font-bold ${q.headerText}`}>{q.label}</span>
          </div>
          <span className="text-xs text-ink-4 font-medium">{tasks.length}</span>
        </div>
        <p className="text-xs text-ink-4 mt-0.5">{q.sub}</p>
      </div>

      {/* Tasks */}
      <div className="border border-t-0 border-border-sm rounded-b-xl px-3 bg-bg-card min-h-[80px]">
        {tasks.length === 0 ? (
          <p className="text-xs text-ink-4 italic py-3">No tasks yet</p>
        ) : (
          <AnimatePresence>
            {tasks.map(t => (
              <TaskItem
                key={t.id}
                task={t}
                onComplete={onComplete}
                barColor={q.headerText}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

export default function TaskBoard({ sessionId, refreshTrigger }) {
  const qc = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tasks', sessionId, refreshTrigger],
    queryFn:  () => getTasks(sessionId),
    enabled:  !!sessionId,
    select:   d => d.tasks || [],
  })

  const completeMut = useMutation({
    mutationFn: (taskId) => completeTask(sessionId, taskId),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['tasks', sessionId] }),
  })

  const tasks    = data || []
  const done     = tasks.filter(t => t.completed).length
  const total    = tasks.length
  const pct      = total ? Math.round((done / total) * 100) : 0

  const byQ = QUADRANTS.reduce((acc, q) => {
    acc[q.id] = tasks.filter(t => t.priority === q.id)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full bg-bg-card">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border-sm flex items-center gap-2">
        <Target className="w-4 h-4 text-blue" />
        <span className="font-semibold text-sm text-ink">Priority Matrix</span>
        {total > 0 && (
          <span className="text-xs text-ink-4">{done}/{total} done</span>
        )}
        <button onClick={() => refetch()} className="ml-auto btn-ghost p-1.5 rounded-lg">
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-blue' : 'text-ink-4'}`} />
        </button>
      </div>

      {/* Matrix */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-border-sm overflow-hidden">
                <div className="skeleton h-12 rounded-none" />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <Target className="w-8 h-8 text-ink-4 mx-auto mb-2" />
            <p className="text-sm text-ink-3">No tasks yet</p>
            <p className="text-xs text-ink-4 mt-1">Tell the AI what you need to get done</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {QUADRANTS.map(q => (
              <Quadrant
                key={q.id}
                q={q}
                tasks={byQ[q.id] || []}
                onComplete={id => completeMut.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 py-3 border-t border-border-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-ink-4">Overall progress</span>
            <span className="text-xs font-semibold text-ink">{pct}%</span>
          </div>
          <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
