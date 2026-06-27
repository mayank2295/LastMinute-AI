import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTasks, saveFocusSession, getFocusSessions } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const MODES = [
  { id: 'pomodoro',  label: 'Pomodoro', work: 25, brk: 5  },
  { id: 'deep',      label: 'Deep Work', work: 50, brk: 10 },
  { id: 'sprint',    label: 'Sprint',   work: 15, brk: 3  },
]

function Ring({ pct, isBreak }) {
  const r    = 90
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color  = isBreak ? '#3b82f6' : '#16a34a'
  return (
    <svg viewBox="0 0 220 220" width="220" height="220">
      <circle cx="110" cy="110" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
      <circle
        cx="110" cy="110" r={r} fill="none"
        stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '110px 110px' }}
      />
    </svg>
  )
}

export default function FocusTimer() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [modeIdx, setModeIdx] = useState(0)
  const [isBreak, setIsBreak] = useState(false)
  const [secs, setSecs]       = useState(MODES[0].work * 60)
  const [running, setRunning] = useState(false)
  const [cycles, setCycles]   = useState(0)
  const [activeTask, setActiveTask] = useState(null)
  const intervalRef = useRef(null)
  const mode = MODES[modeIdx]

  const today = new Date().toISOString().slice(0, 10)

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', user?.sessionId],
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => (d.tasks || []).filter(t => !t.completed),
  })

  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['focus-sessions', user?.sessionId, today],
    queryFn: () => getFocusSessions(user.sessionId, today),
    enabled: !!user,
  })

  const tasks    = tasksData || []
  const sessions = sessionsData?.sessions || []
  const totalMin = sessionsData?.total_minutes || 0

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecs(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            handleSessionComplete()
            return 0
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, isBreak, modeIdx])

  const handleSessionComplete = async () => {
    if (!isBreak) {
      setCycles(c => c + 1)
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus session complete! Take a break.', {
          body: activeTask || 'Great work!',
          icon: '/favicon.ico',
        })
      }
      // Save to Firestore
      try {
        await saveFocusSession(user.sessionId, {
          task_id: tasks.find(t => t.title === activeTask)?.id || '',
          task_title: activeTask || '',
          duration_minutes: mode.work,
          completed_at: new Date().toISOString(),
        })
        refetchSessions()
        qc.invalidateQueries({ queryKey: ['productivity', user?.sessionId] })
      } catch {}
    }
    // Switch mode
    const next = !isBreak
    setIsBreak(next)
    setSecs((next ? mode.brk : mode.work) * 60)
  }

  const changeMode = (idx) => {
    if (running) return
    setModeIdx(idx)
    setIsBreak(false)
    setSecs(MODES[idx].work * 60)
  }

  const reset = () => {
    setRunning(false)
    setIsBreak(false)
    setSecs(mode.work * 60)
  }

  const requestNotifPerm = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const total = (isBreak ? mode.brk : mode.work) * 60
  const pct   = secs / total
  const mm    = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss    = String(secs % 60).padStart(2, '0')

  const formatMin = (m) => m >= 60 ? `${Math.floor(m/60)}h ${m%60 ? m%60+'m' : ''}`.trim() : `${m}m`

  return (
    <div className="p-5 h-full flex flex-col gap-5 lg:flex-row lg:gap-6">
      {/* Left — Timer */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Mode selector */}
        <div className="bg-white border border-border rounded-2xl shadow-sm p-4">
          {!running && (
            <div className="flex gap-2 mb-5">
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => changeMode(i)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    modeIdx === i ? 'bg-primary text-white' : 'bg-subtle text-muted hover:bg-gray-100'
                  }`}
                >
                  {m.label} {m.work}/{m.brk}
                </button>
              ))}
            </div>
          )}

          {/* Ring */}
          <div className="flex flex-col items-center">
            <div className="relative inline-flex items-center justify-center">
              <Ring pct={pct} isBreak={isBreak} />
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-mono font-bold text-primary">{mm}:{ss}</span>
                <span className="text-xs text-muted mt-1 capitalize">
                  {isBreak ? 'Break' : 'Focus'} Session
                </span>
              </div>
            </div>

            {/* Pomodoro dots */}
            <div className="flex gap-2 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i < cycles % 4
                      ? 'bg-accent'
                      : i === cycles % 4 && running && !isBreak
                      ? 'bg-accent animate-pulse'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-5">
              <button
                onClick={reset}
                className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-subtle transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-muted" />
              </button>
              <button
                onClick={() => { requestNotifPerm(); setRunning(r => !r) }}
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-sm transition-all active:scale-95 ${
                  isBreak ? 'bg-blue-500 hover:bg-blue-600' : 'bg-primary hover:bg-gray-800'
                }`}
              >
                {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
              </button>
              <div className="w-11 h-11 rounded-full border border-border flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{cycles}</span>
              </div>
            </div>

            <p className="text-xs text-muted mt-3">{cycles} pomodoro{cycles !== 1 ? 's' : ''} completed</p>
          </div>
        </div>

        {/* Task selector */}
        <div className="bg-white border border-border rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Working on</p>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted">No active tasks — add one from My Tasks.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {tasks.slice(0, 8).map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTask(activeTask === t.title ? null : t.title)}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                    activeTask === t.title
                      ? 'border-accent bg-accent-light text-accent-text'
                      : 'border-border hover:bg-subtle text-primary'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.priority === 'urgent_important' ? 'bg-red-500' :
                    t.priority === 'urgent' ? 'bg-orange-500' :
                    t.priority === 'important' ? 'bg-yellow-400' : 'bg-gray-300'
                  }`} />
                  <span className="flex-1 truncate">{t.title}</span>
                  {activeTask === t.title && <span className="text-xs text-accent font-medium">Active</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — History */}
      <div className="w-full lg:w-72 flex flex-col gap-4">
        <div className="bg-white border border-border rounded-2xl shadow-sm p-4">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Today's sessions</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Focus time', value: formatMin(totalMin) },
              { label: 'Sessions',   value: sessions.length },
              { label: 'Pomodoros',  value: `${cycles} ` },
            ].map(s => (
              <div key={s.label} className="text-center bg-subtle rounded-lg p-2">
                <p className="text-base font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted">No sessions yet</p>
              <p className="text-xs text-muted mt-1">Start your first focus session</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary truncate">
                      {s.task_title || 'Focus session'}
                    </p>
                    <p className="text-xs text-muted">
                      {s.duration_minutes}m &middot; {new Date(s.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
