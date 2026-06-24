import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const WORK_MINS  = 25
const BREAK_MINS = 5

function Ring({ pct }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  return (
    <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke="#16a34a" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  )
}

export default function FocusTimer() {
  const { user } = useAuth()
  const [mode, setMode]     = useState('work')   // 'work' | 'break'
  const [secs, setSecs]     = useState(WORK_MINS * 60)
  const [running, setRunning] = useState(false)
  const [cycles, setCycles]   = useState(0)
  const [activeTask, setActiveTask] = useState(null)
  const intervalRef = useRef(null)

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', user?.sessionId],
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => (d.tasks || []).filter(t => !t.completed),
  })
  const tasks = tasksData || []

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            const isWork = mode === 'work'
            if (isWork) setCycles(c => c + 1)
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(isWork ? '✅ Pomodoro complete! Take a break.' : '🎯 Break over. Back to work!', {
                body: activeTask ? `Task: ${activeTask}` : '',
                icon: '/favicon.ico',
              })
            }
            const next = isWork ? 'break' : 'work'
            setMode(next)
            return (next === 'work' ? WORK_MINS : BREAK_MINS) * 60
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode, activeTask])

  const reset = () => {
    setRunning(false)
    setSecs((mode === 'work' ? WORK_MINS : BREAK_MINS) * 60)
  }

  const requestNotifPerm = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const total = (mode === 'work' ? WORK_MINS : BREAK_MINS) * 60
  const pct   = secs / total
  const mm    = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss    = String(secs % 60).padStart(2, '0')

  return (
    <div className="p-6 max-w-xl mx-auto flex flex-col gap-6">
      {/* Timer card */}
      <div className="bg-white border border-border rounded-xl p-8 flex flex-col items-center gap-6">
        <div className="flex gap-3">
          {['work', 'break'].map(m => (
            <button
              key={m}
              onClick={() => { if (!running) { setMode(m); setSecs((m==='work'?WORK_MINS:BREAK_MINS)*60) } }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors
                ${mode === m ? 'bg-primary text-white' : 'bg-subtle text-muted hover:bg-gray-200'}`}
            >
              {m === 'work' ? `Work · ${WORK_MINS}m` : `Break · ${BREAK_MINS}m`}
            </button>
          ))}
        </div>

        {/* Ring */}
        <div className="relative flex items-center justify-center">
          <Ring pct={pct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-primary font-mono">{mm}:{ss}</span>
            <span className="text-xs text-muted mt-0.5 capitalize">{mode} session</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={reset} className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-subtle transition-colors">
            <RotateCcw className="w-4 h-4 text-muted" />
          </button>
          <button
            onClick={() => { requestNotifPerm(); setRunning(r => !r) }}
            className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center hover:bg-gray-800 transition-colors shadow-sm"
          >
            {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
            <span className="text-xs font-bold text-muted">{cycles}</span>
          </div>
        </div>

        <p className="text-xs text-muted">{cycles} pomodoro{cycles !== 1 ? 's' : ''} completed today</p>
      </div>

      {/* Task selector */}
      <div className="bg-white border border-border rounded-xl p-4">
        <p className="text-xs font-semibold text-primary mb-3">Working on</p>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted">No active tasks. Ask the AI to create tasks first.</p>
        ) : (
          <div className="space-y-1.5">
            {tasks.slice(0, 6).map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTask(activeTask === t.title ? null : t.title)}
                className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border text-xs transition-colors
                  ${activeTask === t.title ? 'border-accent bg-accent-light text-accent-text' : 'border-border hover:bg-subtle text-primary'}`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${activeTask === t.title ? 'text-accent' : 'text-gray-300'}`} />
                {t.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
