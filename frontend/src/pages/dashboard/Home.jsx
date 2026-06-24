import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import DeadlineList from '../../components/DeadlineList'
import ChatAgent from '../../components/ChatAgent'
import { getBriefing, planMyDay, brainDump } from '../../services/api'
import {
  X, Zap, AlertTriangle, Clock, Sparkles, CalendarCheck,
  Loader2, Brain, ExternalLink,
} from 'lucide-react'

/* ─── Plan My Day — the agentic showcase ──────────────────────────────────── */
function PlanMyDay({ sessionId, isDemo, onTasksUpdated }) {
  const [loading, setLoading] = useState(false)
  const [plan, setPlan]       = useState(null)
  const [err, setErr]         = useState('')
  const [auto, setAuto]       = useState(false)
  const ranRef = useRef(false)

  const run = async (isAuto = false) => {
    setLoading(true); setErr(''); setPlan(null); setAuto(isAuto)
    try {
      const p = await planMyDay(sessionId)
      setPlan(p)
      onTasksUpdated?.()
    } catch (e) {
      setErr(e.message || 'Could not generate plan')
    } finally {
      setLoading(false)
    }
  }

  // AUTOMATION: proactively plan the day once per day, no click needed.
  useEffect(() => {
    if (!sessionId || ranRef.current) return
    const key = `lm_autoplan_${sessionId}_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return
    ranRef.current = true
    localStorage.setItem(key, '1')
    const t = setTimeout(() => run(true), 1200)
    return () => clearTimeout(t)
  }, [sessionId])

  return (
    <div className="bg-white border border-border rounded-xl p-4" data-tour="plan">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Plan my day</p>
            <p className="text-xs text-muted">AI reads your calendar &amp; auto-blocks focus time</p>
          </div>
        </div>
        <button onClick={() => run(false)} disabled={loading} className="btn-primary text-sm py-2 px-4 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Planning…' : 'Plan my day'}
        </button>
      </div>

      {loading && auto && (
        <p className="text-xs text-accent mt-3 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Auto-planning your day…
        </p>
      )}
      {err && <p className="text-xs text-red-500 mt-3">{err}</p>}

      {plan && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="mt-4 space-y-3"
        >
          {auto && (
            <span className="badge-green text-xs">⚡ Auto-generated for you today</span>
          )}
          <div className="bg-accent-light border border-accent-border rounded-lg p-3">
            <p className="text-sm text-accent-text leading-relaxed whitespace-pre-wrap">{plan.brief}</p>
          </div>

          {plan.focus_block ? (
            <a
              href={plan.focus_block.html_link || '#'}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800">
                  Focus block auto-created: {plan.focus_block.task}
                </p>
                <p className="text-xs text-blue-600">Added to your Google Calendar</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            </a>
          ) : isDemo ? (
            <p className="text-xs text-muted">
              In demo mode the AI plans your day but doesn&apos;t write to a real calendar. Sign in with Google to enable auto-scheduling.
            </p>
          ) : null}

          <p className="text-xs text-muted flex items-center gap-1.5">
            <span className="badge-green">{plan.provider === 'gemini' ? 'Powered by Gemini' : 'AI'}</span>
            {plan.events_today} event(s) · {plan.open_tasks} open task(s)
          </p>
        </motion.div>
      )}
    </div>
  )
}

/* ─── Brain Dump modal ────────────────────────────────────────────────────── */
function BrainDumpModal({ sessionId, onClose, onDone }) {
  const [text, setText]     = useState('')
  const [loading, setLoad]  = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr]       = useState('')

  const submit = async () => {
    if (!text.trim()) return
    setLoad(true); setErr('')
    try {
      const r = await brainDump(sessionId, text.trim())
      if (r.error) { setErr(r.error); setLoad(false); return }
      setResult(r)
      onDone?.()
    } catch (e) {
      setErr(e.message || 'Failed to process')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Brain className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-primary">Brain dump</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              <p className="text-sm text-muted">
                Type everything on your mind — messy is fine. The AI will extract tasks,
                infer deadlines, estimate effort, and prioritise them automatically.
              </p>
              <textarea
                autoFocus value={text} onChange={e => setText(e.target.value)}
                rows={6}
                placeholder="e.g. 2000-word essay due Friday, viva prep for Monday, reply to professor's email, laundry, book train tickets…"
                className="w-full text-sm border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary resize-none"
              />
              {err && <p className="text-xs text-red-500">{err}</p>}
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-primary mb-3">
                Extracted &amp; prioritised {result.count} task(s):
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {result.tasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5 border border-border rounded-lg px-3 py-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      t.priority === 'urgent_important' ? 'bg-red-500' :
                      t.priority === 'urgent' ? 'bg-orange-500' :
                      t.priority === 'important' ? 'bg-yellow-400' : 'bg-gray-300'
                    }`} />
                    <span className="flex-1 text-sm text-primary truncate">{t.title}</span>
                    {t.effort_estimate && <span className="badge-gray">{t.effort_estimate}m</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-5">
          <button onClick={onClose} className="btn-outline py-2 px-5 text-sm">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={submit} disabled={loading || !text.trim()}
              className="btn-primary py-2 px-5 text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {loading ? 'Processing…' : 'Extract tasks'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Morning brief strip ─────────────────────────────────────────────────── */
function MorningBrief({ sessionId, onDismiss }) {
  const { data, isLoading } = useQuery({
    queryKey: ['briefing', sessionId],
    queryFn: () => getBriefing(sessionId),
    staleTime: 10 * 60_000,
  })

  if (isLoading) return <div className="flex-shrink-0 h-14 skeleton rounded-xl" />
  if (!data || data.error) return null

  const { greeting, first_name, critical_count, high_count, total_events, productivity_score } = data
  const scoreColor = productivity_score >= 70 ? 'text-accent' : productivity_score >= 40 ? 'text-orange-500' : 'text-red-500'
  const urgentCount = (critical_count || 0) + (high_count || 0)

  return (
    <div className="flex-shrink-0 bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
        <Zap className="w-4 h-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary">{greeting}, {first_name}!</p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-muted">{total_events || 0} events in the next 3 days</span>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium">
              <AlertTriangle className="w-3 h-3" />{urgentCount} urgent
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${scoreColor}`}>
            <Clock className="w-3 h-3" />Score {productivity_score}/100
          </span>
        </div>
      </div>
      <button onClick={onDismiss} className="flex-shrink-0 text-gray-300 hover:text-gray-500" title="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

const BRIEF_DISMISSED_KEY = 'lm_brief_dismissed_date'

export default function Home() {
  const { user, isDemo } = useAuth()
  const qc = useQueryClient()

  const today = new Date().toDateString()
  const [showBrief, setShowBrief] = useState(() => localStorage.getItem(BRIEF_DISMISSED_KEY) !== today)
  const [showDump, setShowDump]   = useState(false)

  const dismissBrief = () => {
    localStorage.setItem(BRIEF_DISMISSED_KEY, today)
    setShowBrief(false)
  }

  const handleTasksUpdated = () => {
    qc.invalidateQueries({ queryKey: ['tasks',        user?.sessionId] })
    qc.invalidateQueries({ queryKey: ['productivity', user?.sessionId] })
    qc.invalidateQueries({ queryKey: ['calendar',     user?.sessionId] })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left column — brief, plan, deadlines */}
        <div className="hidden lg:flex flex-col w-[300px] xl:w-[320px] border-r border-border flex-shrink-0 bg-surface overflow-y-auto p-3 gap-3">
          {showBrief && user && <MorningBrief sessionId={user.sessionId} onDismiss={dismissBrief} />}

          {user && (
            <PlanMyDay sessionId={user.sessionId} isDemo={isDemo} onTasksUpdated={handleTasksUpdated} />
          )}

          <button
            onClick={() => setShowDump(true)}
            data-tour="braindump"
            className="btn-outline text-sm py-2.5 justify-center"
          >
            <Brain className="w-4 h-4" /> Brain dump
          </button>

          <div className="bg-white border border-border rounded-xl overflow-hidden flex-1 min-h-[200px]">
            <DeadlineList />
          </div>
        </div>

        {/* Right — chat agent */}
        <div className="flex-1 overflow-hidden" data-tour="chat">
          <ChatAgent onTasksUpdated={handleTasksUpdated} />
        </div>
      </div>

      {showDump && user && (
        <BrainDumpModal
          sessionId={user.sessionId}
          onClose={() => setShowDump(false)}
          onDone={handleTasksUpdated}
        />
      )}
    </div>
  )
}
