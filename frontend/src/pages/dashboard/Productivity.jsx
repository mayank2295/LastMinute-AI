import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getProductivity, getTasks, getFocusSessions } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { TrendingUp, CheckCircle2, Timer, CalendarClock, Lightbulb } from 'lucide-react'

/* Animated count-up for the headline score */
function useCountUp(target, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (target == null) return
    let start, raf
    const step = (t) => {
      if (!start) start = t
      const p = Math.min((t - start) / ms, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3)))) // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function scoreColor(score) {
  return score >= 80 ? '#2563eb' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
}

function ScoreGauge({ score }) {
  const shown = useCountUp(score)
  const r     = 52
  const circ  = Math.PI * r  // half circle
  const pct   = (shown || 0) / 100
  const color = scoreColor(shown || 0)

  return (
    <div className="flex flex-col items-center">
      <svg className="w-44 overflow-visible" viewBox="0 0 120 68">
        <path d={`M 14 60 A ${r} ${r} 0 0 1 106 60`}
          fill="none" stroke="#f3f4f6" strokeWidth="9" strokeLinecap="round" />
        <path d={`M 14 60 A ${r} ${r} 0 0 1 106 60`}
          fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
        <text x="60" y="54" textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score != null ? shown : '–'}</text>
        <text x="60" y="66" textAnchor="middle" fontSize="8" fill="#9ca3af">out of 100</text>
      </svg>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-white border border-border rounded-2xl shadow-sm p-4"
    >
      <div className="flex items-center gap-2 text-muted mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-primary leading-none">{value}</p>
      {sub && <p className="text-xs text-muted mt-1.5">{sub}</p>}
    </motion.div>
  )
}

/* 7-day focus-minutes bar chart */
function FocusTrend({ sessions }) {
  const days = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      out.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        isToday: i === 0,
        minutes: 0,
      })
    }
    for (const s of sessions || []) {
      const key = (s.completed_at || '').slice(0, 10)
      const day = out.find(d => d.key === key)
      if (day) day.minutes += s.duration_minutes || 0
    }
    return out
  }, [sessions])

  const max = Math.max(60, ...days.map(d => d.minutes))
  const total = days.reduce((a, d) => a + d.minutes, 0)

  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-primary">Focus time — last 7 days</p>
        <span className="text-xs text-muted">{Math.floor(total / 60)}h {total % 60}m total</span>
      </div>
      <div className="flex items-end justify-between gap-2 h-32">
        {days.map((d, i) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            {d.minutes > 0 && (
              <span className="text-[10px] font-semibold text-muted">{d.minutes}m</span>
            )}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(d.minutes / max * 100, d.minutes > 0 ? 6 : 2)}%` }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
              className={`w-full max-w-[38px] rounded-md ${d.minutes > 0 ? (d.isToday ? 'bg-accent' : 'bg-blue-200') : 'bg-gray-100'}`}
            />
            <span className={`text-[11px] ${d.isToday ? 'font-bold text-accent' : 'text-muted'}`}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BreakdownBar({ label, display, value, max, color, delay = 0 }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1.5">
        <span>{label}</span>
        <span className="font-semibold text-primary">{display}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value / max * 100, 100)}%` }}
          transition={{ duration: 0.7, delay, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  )
}

export default function Productivity() {
  const { user } = useAuth()
  const sid = user?.sessionId

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productivity', sid],
    queryFn: () => getProductivity(sid),
    enabled: !!user,
    refetchInterval: 60_000,
  })
  const { data: taskData } = useQuery({
    queryKey: ['tasks', sid],
    queryFn: () => getTasks(sid),
    enabled: !!user,
    select: d => d.tasks || [],
  })
  const { data: focusData } = useQuery({
    queryKey: ['focus-sessions', sid],
    queryFn: () => getFocusSessions(sid),
    enabled: !!user,
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
    </div>
  )

  if (isError) return (
    <div className="p-6 text-center text-sm text-muted">
      <p>Failed to load productivity data</p>
      <button onClick={() => refetch()} className="btn-outline text-xs mt-3 py-1 px-3">Retry</button>
    </div>
  )

  const { score, analysis, recommendations, meeting_load, focus_time_available } = data || {}
  const meetingPct = Math.round((meeting_load || 0) * 100)
  const focusH = Math.floor((focus_time_available || 0) / 60)
  const focusM = (focus_time_available || 0) % 60

  const tasks = taskData || []
  const done = tasks.filter(t => t.completed).length
  const sessions = focusData?.sessions || []
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayMin = sessions
    .filter(s => (s.completed_at || '').slice(0, 10) === todayKey)
    .reduce((a, s) => a + (s.duration_minutes || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-primary">Productivity</h2>
          <p className="text-sm text-muted">{analysis}</p>
        </div>
        <span className="text-xs text-muted hidden sm:block">Updates every 60s</span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Score" value={`${score ?? '–'}/100`}
          sub={score >= 70 ? 'On track' : score >= 40 ? 'Room to improve' : 'Needs attention'} />
        <StatCard icon={CheckCircle2} label="Tasks done" value={`${done}/${tasks.length}`}
          sub={tasks.length ? `${Math.round(done / tasks.length * 100)}% complete` : 'No tasks yet'} delay={0.05} />
        <StatCard icon={Timer} label="Focus today" value={`${todayMin}m`}
          sub={`${sessions.length} session${sessions.length === 1 ? '' : 's'} this week`} delay={0.1} />
        <StatCard icon={CalendarClock} label="Free to focus" value={`${focusH}h ${focusM}m`}
          sub={`Meetings fill ${meetingPct}% of today`} delay={0.15} />
      </div>

      {/* Score + breakdown */}
      <div className="bg-white border border-border rounded-2xl shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={score} />
        <div className="flex-1 w-full space-y-4">
          <BreakdownBar label="Focus time available" display={`${focusH}h ${focusM}m`}
            value={focus_time_available || 0} max={480} color="#2563eb" />
          <BreakdownBar label="Meeting load" display={`${meetingPct}%`}
            value={meetingPct} max={100} color={meetingPct > 60 ? '#dc2626' : '#f97316'} delay={0.1} />
          <BreakdownBar label="Overall score" display={`${score}/100`}
            value={score || 0} max={100} color={scoreColor(score || 0)} delay={0.2} />
        </div>
      </div>

      {/* Weekly focus trend */}
      <FocusTrend sessions={sessions} />

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold text-primary">AI Recommendations</p>
          </div>
          <div className="space-y-2.5">
            {recommendations.map((rec, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 + i * 0.08 }}
                className="flex items-start gap-2.5 text-sm text-muted leading-snug">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                {rec}
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
