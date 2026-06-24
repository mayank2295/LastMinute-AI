import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, completeTask, moveTask } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { CheckCircle2, Circle, Calendar } from 'lucide-react'

const QUADRANTS = [
  { id: 'urgent_important', label: 'Do First',  sub: 'Urgent & Important',        border: 'border-red-200',    header: 'bg-red-50',    dot: 'bg-red-400',    text: 'text-red-700' },
  { id: 'important',        label: 'Schedule',  sub: 'Not Urgent, Important',     border: 'border-blue-200',   header: 'bg-blue-50',   dot: 'bg-blue-400',   text: 'text-blue-700' },
  { id: 'urgent',           label: 'Delegate',  sub: 'Urgent, Not Important',     border: 'border-orange-200', header: 'bg-orange-50', dot: 'bg-orange-400', text: 'text-orange-700' },
  { id: 'neither',          label: 'Eliminate', sub: 'Not Urgent, Not Important', border: 'border-gray-200',   header: 'bg-gray-50',   dot: 'bg-gray-300',   text: 'text-gray-500' },
]

function TaskCard({ task, onDone, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(task.id) }}
      className={`flex items-start gap-2 p-2.5 rounded-lg border border-border bg-white hover:border-gray-300 cursor-grab active:cursor-grabbing transition-colors group select-none ${task.completed ? 'opacity-40' : ''}`}
    >
      <button
        onClick={e => { e.stopPropagation(); !task.completed && onDone(task.id) }}
        className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
      >
        {task.completed
          ? <CheckCircle2 className="w-4 h-4 text-accent" />
          : <Circle className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-snug ${task.completed ? 'line-through text-muted' : 'text-primary'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.deadline && (
            <span className="text-[10px] text-muted flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Quadrant({ q, tasks, onDone, onDragStart, onDrop }) {
  const [over, setOver] = useState(false)

  return (
    <div
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={e => { e.preventDefault(); onDrop(q.id); setOver(false) }}
      className={`flex flex-col border rounded-xl overflow-hidden transition-all ${q.border} ${over ? 'ring-2 ring-offset-1 ring-accent/50 scale-[1.01]' : ''}`}
    >
      <div className={`${q.header} px-4 py-3 border-b ${q.border} flex-shrink-0`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${q.dot}`} />
          <span className={`text-xs font-bold ${q.text}`}>{q.label}</span>
          <span className={`ml-auto text-xs font-medium ${q.text} opacity-70`}>{tasks.length}</span>
        </div>
        <p className="text-[10px] text-muted mt-0.5 ml-4">{q.sub}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[120px] bg-white">
        {tasks.length === 0 ? (
          <p className={`text-xs text-center py-4 transition-colors ${over ? 'text-accent font-medium' : 'text-muted italic'}`}>
            {over ? 'Drop here' : 'No tasks — drop here or ask the AI'}
          </p>
        ) : (
          tasks.map(t => (
            <TaskCard key={t.id} task={t} onDone={onDone} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  )
}

export default function PriorityMatrix() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [dragging, setDragging] = useState(null)

  const QKEY = ['tasks', user?.sessionId]

  const { data, isLoading } = useQuery({
    queryKey: QKEY,
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => d.tasks || [],
  })

  const doneMut = useMutation({
    mutationFn: id => completeTask(user.sessionId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QKEY }),
  })

  const moveMut = useMutation({
    mutationFn: ({ taskId, priority }) => moveTask(user.sessionId, taskId, priority),
    // Optimistic update — reflect the move instantly before the API responds
    onMutate: async ({ taskId, priority }) => {
      await qc.cancelQueries({ queryKey: QKEY })
      const snapshot = qc.getQueryData(QKEY)
      qc.setQueryData(QKEY, old => {
        if (!old) return old
        // The query uses `select: d => d.tasks || []` so the cache stores raw tasks array
        return old.map ? old.map(t => t.id === taskId ? { ...t, priority } : t)
                       : { ...old, tasks: (old.tasks || []).map(t => t.id === taskId ? { ...t, priority } : t) }
      })
      return { snapshot }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) qc.setQueryData(QKEY, ctx.snapshot)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: QKEY }),
  })

  const handleDrop = (quadrantId) => {
    if (dragging) {
      const task = (data || []).find(t => t.id === dragging)
      if (task && task.priority !== quadrantId) {
        moveMut.mutate({ taskId: dragging, priority: quadrantId })
      }
    }
    setDragging(null)
  }

  const tasks = data || []
  const total = tasks.length
  const done  = tasks.filter(t => t.completed).length

  const byQ = QUADRANTS.reduce((acc, q) => {
    acc[q.id] = tasks.filter(t => t.priority === q.id)
    return acc
  }, {})

  if (isLoading) return (
    <div className="p-6 grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-48 rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          {total > 0
            ? `${done}/${total} tasks complete · Drag cards between quadrants to reprioritize`
            : 'No tasks yet — ask the AI to plan your day'}
        </p>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-muted">{total ? Math.round((done / total) * 100) : 0}%</span>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {QUADRANTS.map(q => (
          <Quadrant
            key={q.id}
            q={q}
            tasks={byQ[q.id] || []}
            onDone={id => doneMut.mutate(id)}
            onDragStart={id => setDragging(id)}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}
