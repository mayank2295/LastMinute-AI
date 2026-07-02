import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { getProductivity, getTasks, getFocusSessions } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { TrendingUp, CheckCircle2, Timer, CalendarClock, Lightbulb, Zap, ArrowRight } from 'lucide-react'

/* ─── Animated count-up ───────────────────────────────────────────────────── */
function useCountUp(target, ms = 1200) {
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

function scoreTheme(score) {
  if (score >= 80) return { from: '#22d3ee', to: '#2563eb', glow: 'rgba(37,99,235,0.55)',  label: 'Crushing it' }
  if (score >= 60) return { from: '#60a5fa', to: '#2563eb', glow: 'rgba(37,99,235,0.45)',  label: 'On track' }
  if (score >= 40) return { from: '#fbbf24', to: '#f97316', glow: 'rgba(249,115,22,0.45)', label: 'Room to improve' }
  return              { from: '#f87171', to: '#dc2626', glow: 'rgba(220,38,38,0.45)',  label: 'Needs attention' }
}

/* ─── Full-circle glowing ring gauge ──────────────────────────────────────── */
function RingGauge({ score }) {
  const shown = useCountUp(score)
  const R = 74
  const CIRC = 2 * Math.PI * R
  const pct = (score || 0) / 100
  const t = scoreTheme(score || 0)

  return (
    <div className="relative flex-shrink-0">
      <svg width="190" height="190" viewBox="0 0 190 190" className="overflow-visible -rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={t.from} />
            <stop offset="100%" stopColor={t.to} />
          </linearGradient>
        </defs>
        {/* track */}
        <circle cx="95" cy="95" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
        {/* subtle tick marks */}
        {[...Array(20)].map((_, i) => {
          const a = (i / 20) * 2 * Math.PI
          return <line key={i}
            x1={95 + Math.cos(a) * (R - 14)} y1={95 + Math.sin(a) * (R - 14)}
            x2={95 + Math.cos(a) * (R - 10)} y2={95 + Math.sin(a) * (R - 10)}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        })}
        {/* progress */}
        <motion.circle
          cx="95" cy="95" r={R} fill="none"
          stroke="url(#ringGrad)" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={{ strokeDashoffset: CIRC * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 10px ${t.glow})` }}
        />
      </svg>
      {/* center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-extrabold text-white tabular-nums leading-none">{score != null ? shown : '–'}</span>
        <span className="text-[11px] font-medium text-white/50 mt-1 uppercase tracking-widest">/ 100</span>
      </div>
    </div>
  )
}

/* ─── Slim gradient bar (for the hero breakdown) ──────────────────────────── */
function HeroBar({ label, display, value, max, from, to, delay = 0 }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold text-white tabular-nums">{display}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value / max * 100, 100)}%` }}
          transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${from}, ${to})` }}
        />
      </div>
    </div>
  )
}

/* ─── Stat card with hover lift + gradient icon chip ──────────────────────── */
function StatCard({ icon: Icon, label, value, sub, grad, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.18 } }}
      className="bg-white border border-border rounded-2xl shadow-sm p-4 cursor-default
                 hover:shadow-lg hover:border-accent/40 transition-[box-shadow,border-color]"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: grad }}>
        <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>
      <p className="text-2xl font-extrabold text-primary leading-none tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mt-2">{label}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </motion.div>
  )
}

/* ─── 7-day focus trend with gradient bars + hover tooltips ───────────────── */
function FocusTrend({ sessions }) {
  const navigate = useNavigate()
  const days = useMemo(() => {
    const out = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      out.push({ key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), isToday: i === 0, minutes: 0 })
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
  const empty = total === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-white border border-border rounded-2xl shadow-sm p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-bold text-primary">Focus time — last 7 days</p>
        <span className="text-xs text-muted tabular-nums">{Math.floor(total / 60)}h {total % 60}m total</span>
      </div>

      {empty ? (
        <div className="h-36 flex flex-col items-center justify-center text-center">
          <Zap className="w-8 h-8 text-accent/30 mb-2" />
          <p className="text-sm font-semibold text-primary">No focus sessions yet this week</p>
          <p className="text-xs text-muted mt-0.5 mb-3">Your deep-work minutes will chart here, day by day.</p>
          <button onClick={() => navigate('/dashboard/timer')} className="btn-primary text-xs py-1.5 px-4">
            <Timer className="w-3.5 h-3.5" /> Start a focus session <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-end justify-between gap-2 h-36">
          {days.map((d, i) => (
            <div key={d.key} className="relative flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              {/* tooltip */}
              <div className="absolute -top-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                              bg-primary text-white text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap z-10">
                {d.minutes ? `${Math.floor(d.minutes / 60) ? `${Math.floor(d.minutes / 60)}h ` : ''}${d.minutes % 60}m` : '0m'}
              </div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(d.minutes / max * 100, d.minutes > 0 ? 8 : 3)}%` }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[40px] rounded-lg group-hover:scale-x-110 transition-transform origin-bottom"
                style={{
                  background: d.minutes > 0
                    ? (d.isToday
                        ? 'linear-gradient(180deg, #22d3ee, #2563eb)'
                        : 'linear-gradient(180deg, #93c5fd, #3b82f6)')
                    : 'rgba(148,163,184,0.15)',
                  boxShadow: d.isToday && d.minutes > 0 ? '0 0 14px rgba(37,99,235,0.45)' : 'none',
                }}
              />
              <span className={`text-[11px] ${d.isToday ? 'font-bold text-accent' : 'text-muted'}`}>{d.label}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
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
      <div className="skeleton h-56 rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="skeleton h-48 rounded-2xl" />
    </div>
  )

  if (isError) return (
    <div className="p-6 text-center text-sm text-muted">
      <p>Failed to load productivity data</p>
      <button onClick={() => refetch()} className="btn-outline text-xs mt-3 py-1 px-3">Retry</button>
    </div>
  )

  const { score, analysis, recommendations, meeting_load, focus_time_available } = data || {}
  const t = scoreTheme(score || 0)
  const meetingPct = Math.round((meeting_load || 0) * 100)
  const focusH = Math.floor((focus_time_available || 0) / 60)
  const focusM = (focus_time_available || 0) % 60

  const tasks = taskData || []
  const done = tasks.filter(x => x.completed).length
  const sessions = focusData?.sessions || []
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayMin = sessions
    .filter(s => (s.completed_at || '').slice(0, 10) === todayKey)
    .reduce((a, s) => a + (s.duration_minutes || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">

      {/* ── HERO: dark gradient command deck ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e3a8a 130%)' }}
      >
        {/* ambient glow blobs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, animation: 'floatY 7s ease-in-out infinite' }} />
        <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full pointer-events-none opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 65%)', animation: 'floatY 9s ease-in-out infinite reverse' }} />
        {/* faint grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative flex flex-col sm:flex-row items-center gap-7">
          <RingGauge score={score} />
          <div className="flex-1 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full"
                style={{ background: t.from, boxShadow: `0 0 8px ${t.glow}`, animation: 'pulse-dot 2s infinite' }} />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Productivity score</span>
            </div>
            <p className="text-2xl font-extrabold text-white mb-1">{t.label}</p>
            <p className="text-xs text-white/50 mb-5">{analysis} · updates every 60s</p>
            <div className="space-y-3.5">
              <HeroBar label="Focus time available" display={`${focusH}h ${focusM}m`}
                value={focus_time_available || 0} max={480} from="#22d3ee" to="#2563eb" delay={0.15} />
              <HeroBar label="Meeting load" display={`${meetingPct}%`}
                value={meetingPct} max={100} from="#fbbf24" to="#f97316" delay={0.3} />
              <HeroBar label="Tasks completed" display={`${done}/${tasks.length}`}
                value={done} max={Math.max(tasks.length, 1)} from="#4ade80" to="#16a34a" delay={0.45} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Score" value={`${score ?? '–'}`}
          sub={t.label} grad="linear-gradient(135deg,#3b82f6,#1d4ed8)" delay={0.1} />
        <StatCard icon={CheckCircle2} label="Tasks done" value={`${done}/${tasks.length}`}
          sub={tasks.length ? `${Math.round(done / tasks.length * 100)}% complete` : 'No tasks yet'}
          grad="linear-gradient(135deg,#22c55e,#15803d)" delay={0.18} />
        <StatCard icon={Timer} label="Focus today" value={`${todayMin}m`}
          sub={`${sessions.length} session${sessions.length === 1 ? '' : 's'} this week`}
          grad="linear-gradient(135deg,#06b6d4,#0e7490)" delay={0.26} />
        <StatCard icon={CalendarClock} label="Free to focus" value={`${focusH}h ${focusM}m`}
          sub={`Meetings fill ${meetingPct}% of today`}
          grad="linear-gradient(135deg,#f59e0b,#d97706)" delay={0.34} />
      </div>

      {/* ── Weekly focus trend ── */}
      <FocusTrend sessions={sessions} />

      {/* ── Recommendations ── */}
      {recommendations?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="bg-white border border-border rounded-2xl shadow-sm p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <p className="text-sm font-bold text-primary">AI Recommendations</p>
          </div>
          <div className="space-y-2.5">
            {recommendations.map((rec, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.45 + i * 0.1 }}
                className="flex items-start gap-2.5 text-sm text-muted leading-snug">
                <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                {rec}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
