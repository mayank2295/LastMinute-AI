import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar, Bot, Grid, Bell, TrendingUp,
  ChevronRight, Check, Zap, AlertTriangle, Clock,
  ArrowRight, Shield, Cpu, GitBranch, PlayCircle, Compass,
} from 'lucide-react'
import { startDemo } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from '../components/ThemeToggle'
import Tour from '../components/Tour'

const LANDING_TOUR = [
  { title: 'Welcome to LastMinute AI 👋',
    body: "30-second tour of what makes this different. You can skip anytime." },
  { selector: '[data-tour="cta"]', title: 'In a deadline panic?',
    body: 'Hit this and the AI instantly reads your calendar and builds your rescue plan.' },
  { selector: '[data-tour="demo"]', title: 'Just exploring?',
    body: 'Try the full live demo with sample data — no Google login needed.' },
  { selector: '[data-tour="features"]', title: 'Real, working features',
    body: 'Live calendar sync, an agent that takes actions, auto-scheduling, and escalating reminders.' },
  { title: "That's it!",
    body: 'Click "Try live demo" to jump in, or sign in with Google for the full experience.' },
]

/* The product preview is a mock of the (dark) app UI — kept dark in both themes,
   like a real screenshot. */
function ProductPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.35 }}
      className="w-full max-w-4xl mx-auto mt-14 rounded-2xl overflow-hidden border border-white/10"
      style={{ boxShadow: '0 40px 90px rgba(0,0,0,0.45)' }}
    >
      <div style={{ animation: 'floatY 6s ease-in-out infinite' }}>
        <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1e1e] border-b border-white/10">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
          <div className="flex-1 mx-3 bg-[#2a2a2a] rounded px-3 py-1 text-[11px] text-gray-500 text-center">
            lastminute-ai-ummt2blwla-el.a.run.app/dashboard
          </div>
        </div>
        <div className="flex bg-[#0f0f0f]" style={{ minHeight: 360 }}>
          <div className="w-44 flex-shrink-0 bg-[#111] border-r border-white/10 p-3 hidden sm:block">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/10">
              <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-3 h-3 text-black" />
              </div>
              <span className="text-xs font-semibold text-white">LastMinute AI</span>
            </div>
            {[{ n: 'Dashboard', active: true }, { n: 'My Tasks' }, { n: 'Game Plan' }, { n: 'Focus Timer' }].map(item => (
              <div key={item.n}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] mb-0.5 ${
                  item.active ? 'bg-green-900/40 text-green-400 font-medium' : 'text-gray-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.active ? 'bg-green-500' : 'bg-gray-700'}`} />
                {item.n}
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-11 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
              <span className="text-xs font-semibold text-white">Dashboard</span>
              <span className="text-[10px] text-green-400 bg-green-900/30 border border-green-600/20 px-2 py-0.5 rounded-full">Score 82/100</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border-b border-red-500/20 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" style={{ animation: 'pulse 1.5s infinite' }} />
              <span className="text-[11px] text-red-400 font-medium">URGENT — Final Report due in 1h 42m — act now</span>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
              <div className="flex gap-2 justify-end">
                <div className="bg-white text-gray-900 rounded-xl rounded-tr-sm px-3 py-2 text-[11px] max-w-[65%] leading-relaxed">
                  I have a final report due in 2 hours and 3 unfinished slides. Help me.
                </div>
                <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0 flex items-center justify-center text-[10px] text-white font-bold">M</div>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-green-900 border border-green-700 flex-shrink-0 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-green-400" />
                </div>
                <div className="bg-[#1a1a1a] border border-white/10 rounded-xl rounded-tl-sm px-3 py-2.5 text-[11px] max-w-[80%]">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    <span className="bg-green-900/60 text-green-400 border border-green-700/40 text-[9px] font-mono rounded px-1.5 py-0.5">✓ create_calendar_event</span>
                    <span className="bg-blue-900/60 text-blue-400 border border-blue-700/40 text-[9px] font-mono rounded px-1.5 py-0.5">✓ prioritize_tasks</span>
                    <span className="bg-purple-900/60 text-purple-400 border border-purple-700/40 text-[9px] font-mono rounded px-1.5 py-0.5">✓ set_reminder</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    Done. Blocked a 2-hour focus window, created 3 tasks ordered by impact.
                    Start with the executive summary — 20 minutes, and everything else unlocks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function Navbar({ onStart, onTour, user, onDashboard, C }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 relative z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-black" />
        </div>
        <span className="font-bold text-base tracking-tight" style={{ color: C.text }}>LastMinute AI</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: C.navText }}>
        <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
        <a href="#how"      className="hover:opacity-70 transition-opacity">How it works</a>
        <a href="#why"      className="hover:opacity-70 transition-opacity">Why us</a>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onTour}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm hover:opacity-70 transition-opacity"
          style={{ color: C.navText }}>
          <Compass className="w-4 h-4" /> Tour
        </button>
        <ThemeToggle />
        {user ? (
          <button onClick={onDashboard}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition-colors">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <Link to="/login"
              className="px-4 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
              style={{ color: C.navText, border: `1px solid ${C.navBorder}` }}>
              Sign in
            </Link>
            <button onClick={onStart}
              className="px-4 py-2 text-sm bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition-colors">
              Get started
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default function Landing() {
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user } = useAuth()
  const { isDark } = useTheme()

  // Theme-aware palette — drives the whole landing so the toggle visibly works.
  const C = isDark ? {
    heroBg: '#0a0a0a', panel: '#111114', sectionBg: '#0c0c0e', sectionAlt: '#0a0a0a',
    text: '#ffffff', sub: '#cbd5e1', faint: '#94a3b8',
    cardBg: '#16161a', cardBorder: 'rgba(255,255,255,0.09)',
    navText: '#cbd5e1', navBorder: 'rgba(255,255,255,0.22)',
    chipBg: 'rgba(255,255,255,0.06)', chipBorder: 'rgba(255,255,255,0.16)',
    glow: 'rgba(22,163,74,0.16)', grid: 'rgba(255,255,255,0.05)',
    blobA: 'rgba(22,163,74,0.30)', blobB: 'rgba(59,130,246,0.18)',
  } : {
    heroBg: '#f6faf8', panel: '#ffffff', sectionBg: '#ffffff', sectionAlt: '#f5f8f6',
    text: '#0a0a0a', sub: '#475569', faint: '#64748b',
    cardBg: '#ffffff', cardBorder: '#e5e7eb',
    navText: '#334155', navBorder: 'rgba(0,0,0,0.14)',
    chipBg: 'rgba(22,163,74,0.08)', chipBorder: 'rgba(22,163,74,0.28)',
    glow: 'rgba(22,163,74,0.12)', grid: 'rgba(0,0,0,0.05)',
    blobA: 'rgba(22,163,74,0.22)', blobB: 'rgba(59,130,246,0.12)',
  }

  const goDashboard = () => navigate('/dashboard')

  const handleStart = async () => {
    if (user) { goDashboard(); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/login')
      const { auth_url } = await resp.json()
      window.location.href = auth_url
    } catch { setLoading(false) }
  }

  const handleDemo = async () => {
    if (user) { goDashboard(); return }
    setDemoLoading(true)
    try {
      const d = await startDemo()
      login(d.session_id, d.email, d.name)
      navigate('/dashboard')
    } catch { setDemoLoading(false) }
  }

  const [runTour, setRunTour] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem('lm_landing_tour_done')) {
      const t = setTimeout(() => setRunTour(true), 1000)
      return () => clearTimeout(t)
    }
  }, [])
  const endTour = () => { localStorage.setItem('lm_landing_tour_done', '1'); setRunTour(false) }

  const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay },
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.sectionAlt }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: C.heroBg }}>
        {/* animated background effects */}
        <div className="lp-grid" style={{ color: C.grid }} />
        <div className="lp-blob" style={{ width: 480, height: 480, top: -120, left: -100, background: C.blobA }} />
        <div className="lp-blob" style={{ width: 420, height: 420, top: -60, right: -120, background: C.blobB, animationDelay: '4s' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 60% 45% at 50% 18%, ${C.glow} 0%, transparent 70%)` }} />

        <Navbar onStart={handleStart} onTour={() => setRunTour(true)} user={user} onDashboard={goDashboard} C={C} />

        <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-6 text-center">
          <motion.div {...fadeUp(0)}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium mb-8"
            style={{ background: C.chipBg, border: `1px solid ${C.chipBorder}`, color: '#16a34a' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" style={{ animation: 'pulse 1.5s infinite' }} />
            Live · Google Gemini + Google Calendar + Cloud Run
          </motion.div>

          <motion.h1 {...fadeUp(0.08)}
            className="font-extrabold leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(44px, 7vw, 76px)', color: C.text }}>
            Stop panicking.<br />
            <span className="text-green-500">Start executing.</span>
          </motion.h1>

          <motion.p {...fadeUp(0.16)}
            className="leading-relaxed mb-10 max-w-2xl mx-auto" style={{ fontSize: 18, color: C.sub }}>
            LastMinute AI reads your Google Calendar, identifies what's on fire, and builds your
            action plan — right now. From crisis to focused execution in&nbsp;10&nbsp;seconds.
          </motion.p>

          <motion.div {...fadeUp(0.24)}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleStart} disabled={loading} data-tour="cta"
              className="flex items-center gap-2.5 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-60"
              style={{ fontSize: 16, boxShadow: '0 8px 30px rgba(239,68,68,0.3)' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {loading ? 'Connecting…' : 'I have a deadline — save me'}
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleDemo} disabled={demoLoading} data-tour="demo"
              className="flex items-center gap-2.5 px-7 py-4 rounded-xl font-medium transition-colors disabled:opacity-60"
              style={{ fontSize: 15, color: C.text, border: `1px solid ${C.navBorder}` }}>
              <PlayCircle className="w-5 h-5 flex-shrink-0" />
              {demoLoading ? 'Loading demo…' : 'Try live demo — no login'}
            </motion.button>
          </motion.div>

          <div className="flex items-center justify-center gap-5 flex-wrap text-xs" style={{ color: C.faint }}>
            {['No login for demo', 'Real AI + Google Calendar', 'Free forever', 'Data stays in your account'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-500" /> {t}
              </span>
            ))}
          </div>

          <ProductPreview />
        </section>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <div className="py-6 px-6" style={{ background: C.panel, borderTop: `1px solid ${C.cardBorder}`, borderBottom: `1px solid ${C.cardBorder}` }}>
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-10 flex-wrap">
          {[
            { icon: Cpu,       label: 'Gemini function calling', sub: '5 real AI tools' },
            { icon: Calendar,  label: 'Google Calendar',         sub: 'live read & write' },
            { icon: Bell,      label: 'Push + email alerts',     sub: '24h → 2h → 1h → 30m' },
            { icon: GitBranch, label: 'Cloud Run',               sub: 'deployed & live' },
            { icon: Shield,    label: 'OAuth2 secured',          sub: 'no password stored' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.chipBg }}>
                <s.icon className="w-4 h-4 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: C.text }}>{s.label}</p>
                <p className="text-xs" style={{ color: C.faint }}>{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" className="py-24 px-6" style={{ background: C.sectionBg }}>
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0)} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">How it works</p>
            <h2 className="text-4xl font-bold" style={{ color: C.text }}>From panic to plan in 30 seconds</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '01', glow: 'rgba(22,163,74,0.15)', color: '#16a34a', title: 'Connect Google Calendar', desc: 'One click OAuth2 sign-in. The AI reads your real deadlines — not demo data, your actual schedule.' },
              { n: '02', glow: 'rgba(59,130,246,0.15)', color: '#3b82f6', title: "Tell the AI what's stressing you", desc: '"I have a presentation in 2 hours and haven\'t started." The AI already knows your calendar context.' },
              { n: '03', glow: 'rgba(239,68,68,0.15)', color: '#ef4444', title: 'AI executes — you focus', desc: 'Calendar events created, focus time blocked, tasks prioritised, reminders set. You execute the plan.' },
            ].map((s, i) => (
              <motion.div key={s.n} {...fadeUp(i * 0.1)} viewport={{ once: true }} className="text-center">
                <div className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center mx-auto mb-5"
                  style={{ background: s.glow, borderColor: s.color }}>
                  <span className="text-xl font-black" style={{ color: s.color }}>{s.n}</span>
                </div>
                <h3 className="text-lg font-bold mb-3" style={{ color: C.text }}>{s.title}</h3>
                <p className="leading-relaxed" style={{ color: C.sub }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" data-tour="features" className="py-24 px-6" style={{ background: C.sectionAlt }}>
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp(0)} viewport={{ once: true }} className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">Features</p>
            <h2 className="text-4xl font-bold" style={{ color: C.text }}>Built for deadlines, not to-do lists</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Calendar, ic: '#16a34a', title: 'Live Calendar Sync', desc: 'Real events from Google Calendar, not mock data. Countdowns, overdue flags, and urgency colours in real time.' },
              { icon: Bot, ic: '#3b82f6', title: 'Agentic Gemini AI', desc: 'Five real function-calling tools: create events, prioritise tasks, set reminders, schedule focus blocks, score your day.' },
              { icon: Grid, ic: '#a855f7', title: 'Smart Game Plan', desc: 'A ranked, time-bucketed action queue that tells you exactly what to do next. Persists to Firebase.' },
              { icon: Bell, ic: '#f97316', title: 'Escalating Alerts', desc: 'Push + email at 24h → 2h → 1h → 30 min before every deadline. Driven by Cloud Scheduler, no tab open needed.' },
              { icon: Clock, ic: '#ef4444', title: 'Mission Control Bar', desc: 'A persistent status bar that pulses red when you\'re under 2 hours from a deadline. Updates every 60 seconds.' },
              { icon: TrendingUp, ic: '#eab308', title: 'Productivity Score', desc: 'Calculated daily from completion rate, focus sessions, calendar load, and overdue tasks. Not vanity metrics.' },
            ].map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                whileHover={{ y: -4 }}
                className="rounded-2xl p-6 transition-shadow hover:shadow-lg"
                style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.ic}1f` }}>
                  <f.icon className="w-5 h-5" style={{ color: f.ic }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: C.text }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY NOT CHATGPT ───────────────────────────────────────────────── */}
      <section id="why" className="py-24 px-6" style={{ background: C.sectionBg }}>
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0)} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">Why not just use ChatGPT?</p>
            <h2 className="text-4xl font-bold" style={{ color: C.text }}>This actually does things</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { bad: 'ChatGPT tells you to "break tasks into smaller pieces"', good: 'Creates the actual calendar block and sets the reminder for you' },
              { bad: 'Generic advice that ignores your real schedule', good: 'Reads your live Google Calendar first — every answer is aware of your real availability' },
              { bad: 'You have to remember to go back and ask', good: 'Notifies you proactively at 24h, 2h, 1h, 30m — no babysitting required' },
            ].map((c, i) => (
              <motion.div key={i} {...fadeUp(i * 0.08)} viewport={{ once: true }}
                className="rounded-2xl p-6" style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}>
                <p className="text-sm line-through mb-4 leading-relaxed" style={{ color: C.faint }}>{c.bad}</p>
                <div className="h-px mb-4" style={{ background: C.cardBorder }} />
                <p className="text-sm font-medium leading-relaxed flex items-start gap-2" style={{ color: C.text }}>
                  <span className="text-green-500 font-bold flex-shrink-0">✓</span>{c.good}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 px-6 text-center" style={{ background: C.heroBg }}>
        <div className="lp-blob" style={{ width: 420, height: 420, bottom: -160, left: '50%', marginLeft: -210, background: C.blobA }} />
        <div className="max-w-2xl mx-auto relative z-10">
          <motion.h2 {...fadeUp(0)} viewport={{ once: true }}
            className="font-extrabold mb-5 leading-tight" style={{ fontSize: 'clamp(36px, 5vw, 54px)', color: C.text }}>
            Your next deadline is<br /><span className="text-red-500">already counting down.</span>
          </motion.h2>
          <p className="mb-10" style={{ fontSize: 18, color: C.sub }}>
            Every minute you wait is a minute you don't have a plan.
          </p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleStart} disabled={loading}
            className="inline-flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-10 py-5 rounded-xl font-bold transition-colors disabled:opacity-60"
            style={{ fontSize: 17, boxShadow: '0 8px 30px rgba(239,68,68,0.3)' }}>
            <AlertTriangle className="w-5 h-5" />
            {loading ? 'Connecting…' : 'Start for free'}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <p className="text-sm mt-5" style={{ color: C.faint }}>Google Calendar required · No credit card · Free forever</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="py-6 px-6" style={{ background: C.sectionAlt, borderTop: `1px solid ${C.cardBorder}` }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-black" />
            </div>
            <span className="text-sm font-semibold" style={{ color: C.text }}>LastMinute AI</span>
          </div>
          <p className="text-xs" style={{ color: C.faint }}>
            Built for BlockseBlock Hackathon · Google Gemini + Google APIs · Google Cloud Run
          </p>
          <Link to="/login" className="text-xs flex items-center gap-1 hover:opacity-70 transition-opacity" style={{ color: C.sub }}>
            Sign in <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>

      <Tour steps={LANDING_TOUR} run={runTour} onClose={endTour} />
    </div>
  )
}
