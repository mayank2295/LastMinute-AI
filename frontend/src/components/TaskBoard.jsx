import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, Zap, Star, AlertTriangle, Minus, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, completeTask } from '../services/api'

const QUADRANTS = [
  {
    id: 'urgent_important',
    label: 'Do First',
    sublabel: 'Urgent & Important',
    icon: Zap,
    accent: 'text-red-alert',
    border: 'border-red-alert/30',
    bg: 'bg-red-alert/5',
    dot: 'bg-red-alert',
  },
  {
    id: 'important',
    label: 'Schedule',
    sublabel: 'Not Urgent, Important',
    icon: Star,
    accent: 'text-blue-glow',
    border: 'border-blue/30',
    bg: 'bg-blue/5',
    dot: 'bg-blue-glow',
  },
  {
    id: 'urgent',
    label: 'Delegate',
    sublabel: 'Urgent, Not Important',
    icon: AlertTriangle,
    accent: 'text-orange-warn',
    border: 'border-orange-warn/30',
    bg: 'bg-orange-warn/5',
    dot: 'bg-orange-warn',
  },
  {
    id: 'neither',
    label: 'Eliminate',
    sublabel: 'Not Urgent, Not Important',
    icon: Minus,
    accent: 'text-text-muted',
    border: 'border-border',
    bg: 'bg-panel-light/30',
    dot: 'bg-text-muted',
  },
]

function TaskItem({ task, onComplete, accent }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className={`flex items-start gap-2 group ${task.completed ? 'opacity-40' : ''}`}
    >
      <button
        onClick={() => !task.completed && onComplete(task.id)}
        className={`flex-shrink-0 mt-0.5 ${accent} opacity-70 hover:opacity-100 transition-opacity`}
      >
        {task.completed
          ? <CheckCircle2 className="w-4 h-4" />
          : <Circle className="w-4 h-4" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium leading-snug ${task.completed ? 'line-through text-text-muted' : 'text-white'}`}>
          {task.title}
        </p>
        {task.deadline && (
          <p className="text-xs text-text-muted mt-0.5 truncate">
            Due: {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
        {task.urgency_score != null && (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-text-muted">U:{task.urgency_score?.toFixed(1)}</span>
            <span className="text-xs text-text-muted">I:{task.importance_score?.toFixed(1)}</span>
            {task.effort_estimate && (
              <span className="text-xs text-text-muted">{task.effort_estimate}m</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

function Quadrant({ q, tasks, onComplete }) {
  const Icon = q.icon
  return (
    <div className={`panel ${q.bg} ${q.border} p-3 flex flex-col min-h-[140px]`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-1.5 h-1.5 rounded-full ${q.dot}`} />
        <Icon className={`w-3.5 h-3.5 ${q.accent}`} />
        <div>
          <p className={`text-xs font-bold ${q.accent}`}>{q.label}</p>
          <p className="text-xs text-text-muted">{q.sublabel}</p>
        </div>
        <span className="ml-auto text-xs text-text-muted">{tasks.length}</span>
      </div>

      <div className="space-y-2 flex-1">
        <AnimatePresence>
          {tasks.length === 0 && (
            <p className="text-xs text-text-muted italic">No tasks here</p>
          )}
          {tasks.map(t => (
            <TaskItem key={t.id} task={t} onComplete={onComplete} accent={q.accent} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function TaskBoard({ sessionId, refreshTrigger }) {
  const qc = useQueryClient()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['tasks', sessionId, refreshTrigger],
    queryFn: () => getTasks(sessionId),
    enabled: !!sessionId,
    select: d => d.tasks || [],
  })

  const completeMutation = useMutation({
    mutationFn: (taskId) => completeTask(sessionId, taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', sessionId] }),
  })

  const tasks = data || []

  const byQuadrant = QUADRANTS.reduce((acc, q) => {
    acc[q.id] = tasks.filter(t => t.priority === q.id)
    return acc
  }, {})

  const total = tasks.length
  const done  = tasks.filter(t => t.completed).length

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Zap className="w-4 h-4 text-blue-glow" />
        <span className="text-sm font-semibold text-white">Priority Matrix</span>
        {total > 0 && (
          <span className="text-xs text-text-muted ml-1">
            {done}/{total} done
          </span>
        )}
        <button
          onClick={() => refetch()}
          className="ml-auto text-text-muted hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="panel p-3 animate-pulse h-32">
                <div className="h-2 bg-panel-light rounded w-1/2 mb-3" />
                <div className="h-2 bg-panel-light rounded w-3/4 mb-2" />
                <div className="h-2 bg-panel-light rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {total === 0 && (
              <div className="text-center py-6">
                <p className="text-text-muted text-sm">
                  No tasks yet — tell the AI what you need to accomplish
                </p>
              </div>
            )}
            {total > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {QUADRANTS.map(q => (
                  <Quadrant
                    key={q.id}
                    q={q}
                    tasks={byQuadrant[q.id] || []}
                    onComplete={(id) => completeMutation.mutate(id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {total > 0 && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-glow rounded-full transition-all duration-700"
                style={{ width: `${total ? (done / total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">
              {total ? Math.round((done / total) * 100) : 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
