import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, isValid } from 'date-fns'
import { Zap, ArrowRight, Clock, Calendar, Loader2 } from 'lucide-react'
import { getBriefing } from '../services/api'

const URGENCY = {
  critical: { dot: 'bg-red',   badge: 'badge-red',   label: 'Critical' },
  high:     { dot: 'bg-amber', badge: 'badge-amber',  label: 'Due soon' },
  medium:   { dot: 'bg-blue',  badge: 'badge-blue',   label: 'Upcoming' },
  low:      { dot: 'bg-green', badge: 'badge-green',  label: 'Scheduled' },
  overdue:  { dot: 'bg-red',   badge: 'badge-red',    label: 'Overdue' },
}

function formatCountdown(startTime) {
  try {
    const dt = parseISO(startTime)
    if (!isValid(dt)) return ''
    const h = (dt - Date.now()) / 3_600_000
    if (h < 0) return 'Overdue'
    if (h < 1) return `${Math.floor(h * 60)}m left`
    if (h < 24) return `${Math.floor(h)}h left`
    return `${Math.floor(h / 24)}d left`
  } catch { return '' }
}

function DeadlineCard({ event, index }) {
  const u = URGENCY[event.urgency] || URGENCY.low
  const hasTime = event.start_time?.includes('T')
  const countdown = hasTime ? formatCountdown(event.start_time) : ''

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.6 + index * 0.15, duration: 0.4 }}
      className="card p-4 flex items-center gap-4 hover:shadow-card-md transition-shadow"
    >
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${u.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink truncate">{event.title}</p>
        {hasTime && (
          <p className="text-xs text-ink-3 mt-0.5 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(parseISO(event.start_time), 'EEE, MMM d · h:mm a')}
          </p>
        )}
      </div>
      {countdown && (
        <span className={`${u.badge} flex-shrink-0 font-mono`}>{countdown}</span>
      )}
    </motion.div>
  )
}

export default function MissionBrief({ sessionId, onAccept }) {
  const [stage, setStage] = useState('loading')   // loading | briefing | ready
  const [data, setData]   = useState(null)
  const [showGreeting, setShowGreeting]   = useState(false)
  const [showSituation, setShowSituation] = useState(false)
  const [showCards, setShowCards]         = useState(false)
  const [showStats, setShowStats]         = useState(false)
  const [showCta, setShowCta]             = useState(false)

  useEffect(() => {
    getBriefing(sessionId)
      .then(d => {
        setData(d)
        setStage('briefing')
        // Staged reveal
        setTimeout(() => setShowGreeting(true),   400)
        setTimeout(() => setShowSituation(true),  900)
        setTimeout(() => setShowCards(true),      1400)
        setTimeout(() => setShowStats(true),      1400 + (d.events?.length || 0) * 150 + 200)
        setTimeout(() => setShowCta(true),        1400 + (d.events?.length || 0) * 150 + 700)
      })
      .catch(() => {
        // If briefing fails just go straight to dashboard
        onAccept()
      })
  }, [sessionId])

  const freeH = data ? Math.floor(data.free_time_minutes / 60) : 0
  const freeM = data ? data.free_time_minutes % 60 : 0

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      {/* Subtle grid */}
      <div className="fixed inset-0 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-blue flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-ink">LastMinute AI</span>
        </div>

        {stage === 'loading' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Loader2 className="w-8 h-8 text-blue animate-spin mx-auto mb-4" />
            <p className="text-ink-3 text-sm">Analysing your calendar…</p>
          </motion.div>
        )}

        {stage === 'briefing' && data && (
          <div className="space-y-5">
            {/* Greeting */}
            <AnimatePresence>
              {showGreeting && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-ink-3 text-sm font-medium">{data.greeting}</p>
                  <h1 className="text-3xl font-extrabold text-ink mt-0.5">
                    {data.first_name}, here's your situation.
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Situation summary */}
            <AnimatePresence>
              {showSituation && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    {data.critical_count > 0 && (
                      <span className="badge-red text-sm px-3 py-1.5">
                        🔴 {data.critical_count} critical {data.critical_count === 1 ? 'deadline' : 'deadlines'}
                      </span>
                    )}
                    {data.high_count > 0 && (
                      <span className="badge-amber text-sm px-3 py-1.5">
                        🟡 {data.high_count} due today
                      </span>
                    )}
                    {data.medium_count > 0 && (
                      <span className="badge-blue text-sm px-3 py-1.5">
                        🔵 {data.medium_count} this week
                      </span>
                    )}
                    {data.critical_count === 0 && data.high_count === 0 && data.medium_count === 0 && (
                      <span className="badge-green text-sm px-3 py-1.5">✅ No critical deadlines</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Event cards */}
            {showCards && data.events?.length > 0 && (
              <div className="space-y-2">
                {data.events.map((ev, i) => (
                  <DeadlineCard key={ev.id} event={ev} index={i} />
                ))}
              </div>
            )}

            {showCards && data.events?.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="card p-5 text-center"
              >
                <p className="text-ink-3 text-sm">No upcoming events in the next 3 days.</p>
                <p className="text-ink-4 text-xs mt-1">Tell the AI what you need to accomplish.</p>
              </motion.div>
            )}

            {/* Stats row */}
            <AnimatePresence>
              {showStats && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-4 flex items-center gap-6"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-light flex items-center justify-center">
                      <Clock className="w-4 h-4 text-green" />
                    </div>
                    <div>
                      <p className="text-xs text-ink-3">Free time today</p>
                      <p className="font-bold text-ink text-sm">
                        {freeH > 0 ? `${freeH}h ${freeM}m` : `${freeM}m`}
                      </p>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-border-sm" />
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                      ${data.productivity_score >= 70 ? 'bg-green-light' :
                        data.productivity_score >= 40 ? 'bg-amber-light' : 'bg-red-light'}`}>
                      <Zap className={`w-4 h-4 ${
                        data.productivity_score >= 70 ? 'text-green' :
                        data.productivity_score >= 40 ? 'text-amber' : 'text-red'}`} />
                    </div>
                    <div>
                      <p className="text-xs text-ink-3">Productivity score</p>
                      <p className="font-bold text-ink text-sm">{data.productivity_score} / 100</p>
                    </div>
                  </div>
                  {data.recommendations?.[0] && (
                    <>
                      <div className="w-px h-8 bg-border-sm hidden sm:block" />
                      <p className="text-xs text-ink-3 hidden sm:block leading-snug flex-1">
                        💡 {data.recommendations[0]}
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA */}
            <AnimatePresence>
              {showCta && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <button
                    onClick={onAccept}
                    className="btn-primary w-full py-3.5 text-base shadow-card-md
                               hover:shadow-card-lg transition-shadow animate-glow-pulse"
                  >
                    Start My Mission Plan
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <p className="text-xs text-ink-4 text-center mt-2">
                    AI will create your action plan, schedule focus blocks, and set reminders
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
