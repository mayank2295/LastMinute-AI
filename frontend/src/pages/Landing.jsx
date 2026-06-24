import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar, Bot, Grid, Bell, TrendingUp,
  ChevronRight, Check, Zap, AlertTriangle, Clock,
  ArrowRight, Shield, Cpu, GitBranch, PlayCircle, Compass
} from 'lucide-react'
import { startDemo } from '../services/api'
import { useAuth } from '../context/AuthContext'
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

/* ─── Inline product preview ──────────────────────────────────────────────── */
function ProductPreview() {
  return (
    <div className="w-full max-w-4xl mx-auto mt-14 rounded-2xl overflow-hidden border border-white/10"
      style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1e1e1e] border-b border-white/10">
        <div className="w-3 h-3 rounded-full bg-red-500/80" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <div className="w-3 h-3 rounded-full bg-green-500/80" />
        <div className="flex-1 mx-3 bg-[#2a2a2a] rounded px-3 py-1 text-[11px] text-gray-500 text-center">
          lastminute-ai-ummt2blwla-el.a.run.app/dashboard
        </div>
      </div>
      {/* App shell */}
      <div className="flex bg-[#0f0f0f]" style={{ minHeight: 360 }}>
        {/* Sidebar */}
        <div className="w-44 flex-shrink-0 bg-[#111] border-r border-white/10 p-3 hidden sm:block">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/10">
            <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center flex-shrink-0">
              <Zap className="w-3 h-3 text-black" />
            </div>
            <span className="text-xs font-semibold text-white">LastMinute AI</span>
          </div>
          {[
            { n: 'Dashboard', active: true },
            { n: 'My Tasks' },
            { n: 'Game Plan' },
            { n: 'Focus Timer' },
          ].map(item => (
            <div
              key={item.n}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] mb-0.5 ${
                item.active ? 'bg-green-900/40 text-green-400 font-medium' : 'text-gray-600'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.active ? 'bg-green-500' : 'bg-gray-700'}`} />
              {item.n}
            </div>
          ))}
        </div>
        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-11 flex items-center justify-between px-4 border-b border-white/10 flex-shrink-0">
            <span className="text-xs font-semibold text-white">Dashboard</span>
            <span className="text-[10px] text-green-400 bg-green-900/30 border border-green-600/20 px-2 py-0.5 rounded-full">
              Score 82/100
            </span>
          </div>
          {/* Status bar — red/urgent */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-900/20 border-b border-red-500/20 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" style={{ animation: 'pulse 1.5s infinite' }} />
            <span className="text-[11px] text-red-400 font-medium">URGENT — Final Report due in 1h 42m — act now</span>
          </div>
          {/* Chat */}
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
                  <span className="bg-green-900/60 text-green-400 border border-green-700/40 text-[9px] font-mono rounded px-1.5 py-0.5">
                    ✓ create_calendar_event
                  </span>
                  <span className="bg-blue-900/60 text-blue-400 border border-blue-700/40 text-[9px] font-mono rounded px-1.5 py-0.5">
                    ✓ prioritize_tasks
                  </span>
                  <span className="bg-purple-900/60 text-purple-400 border border-purple-700/40 text-[9px] font-mono rounded px-1.5 py-0.5">
                    ✓ set_reminder
                  </span>
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
  )
}

/* ─── Navbar ──────────────────────────────────────────────────────────────── */
function Navbar({ onStart, onTour, user, onDashboard }) {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-black" />
        </div>
        <span className="font-bold text-white text-base tracking-tight">LastMinute AI</span>
      </div>
      <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#how"      className="hover:text-white transition-colors">How it works</a>
        <a href="#why"      className="hover:text-white transition-colors">Why us</a>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onTour}
          className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors">
          <Compass className="w-4 h-4" /> Tour
        </button>
        <ThemeToggle className="!border-white/20 !text-gray-300" />
        {user ? (
          <button onClick={onDashboard}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-500 text-black rounded-lg font-semibold hover:bg-green-400 transition-colors">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <>
            <Link to="/login"
              className="px-4 py-2 text-sm text-gray-300 border border-white/20 rounded-lg hover:bg-white/5 transition-colors">
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

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user } = useAuth()

  const goDashboard = () => navigate('/dashboard')

  const handleStart = async () => {
    // Already logged in? Just go to the dashboard.
    if (user) { goDashboard(); return }
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/login')
      const { auth_url } = await resp.json()
      window.location.href = auth_url
    } catch {
      setLoading(false)
    }
  }

  const handleDemo = async () => {
    if (user) { goDashboard(); return }
    setDemoLoading(true)
    try {
      const d = await startDemo()
      login(d.session_id, d.email, d.name)
      navigate('/dashboard')
    } catch {
      setDemoLoading(false)
    }
  }

  const [runTour, setRunTour] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem('lm_landing_tour_done')) {
      const t = setTimeout(() => setRunTour(true), 1000)
      return () => clearTimeout(t)
    }
  }, [])
  const endTour = () => { localStorage.setItem('lm_landing_tour_done', '1'); setRunTour(false) }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="bg-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(22,163,74,0.10) 0%, transparent 70%)' }} />

        <Navbar onStart={handleStart} onTour={() => setRunTour(true)} user={user} onDashboard={goDashboard} />

        <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-6 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-green-400 rounded-full px-4 py-2 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" style={{ animation: 'pulse 1.5s infinite' }} />
            Live · Claude AI + Google Calendar + Cloud Run
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
            className="font-extrabold text-white leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(44px, 7vw, 76px)' }}>
            Stop panicking.<br />
            <span className="text-green-400">Start executing.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }}
            className="text-gray-400 leading-relaxed mb-10 max-w-2xl mx-auto" style={{ fontSize: 18 }}>
            LastMinute AI reads your Google Calendar, identifies what's on fire,
            and builds your action plan — right now.
            From crisis to focused execution in&nbsp;10&nbsp;seconds.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-7">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleStart} disabled={loading}
              data-tour="cta"
              className="flex items-center gap-2.5 bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-xl font-bold transition-colors disabled:opacity-60"
              style={{ fontSize: 16, boxShadow: '0 8px 30px rgba(239,68,68,0.3)' }}
            >
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              {loading ? 'Connecting…' : 'I have a deadline — save me'}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleDemo} disabled={demoLoading}
              data-tour="demo"
              className="flex items-center gap-2.5 border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 px-7 py-4 rounded-xl font-medium transition-colors disabled:opacity-60"
              style={{ fontSize: 15 }}
            >
              <PlayCircle className="w-5 h-5 flex-shrink-0" />
              {demoLoading ? 'Loading demo…' : 'Try live demo — no login'}
            </motion.button>
          </motion.div>

          {/* Trust pills */}
          <div className="flex items-center justify-center gap-5 flex-wrap text-xs text-gray-600">
            {['No login for demo', 'Real AI + Google Calendar', 'Free forever', 'Data stays in your account'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-green-700" /> {t}
              </span>
            ))}
          </div>

          {/* Product preview */}
          <ProductPreview />
        </section>
      </div>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border-y border-white/10 py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-10 flex-wrap">
          {[
            { icon: Cpu,       label: '5 real AI tools',    sub: 'function calling' },
            { icon: Calendar,  label: 'Google Calendar',    sub: 'live read & write' },
            { icon: Bell,      label: 'Push notifications', sub: '24h → 2h → 30m' },
            { icon: GitBranch, label: 'Cloud Run',          sub: 'deployed & live' },
            { icon: Shield,    label: 'OAuth2 secured',     sub: 'no password stored' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <s.icon className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{s.label}</p>
                <p className="text-xs text-gray-600">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how" className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">How it works</p>
            <h2 className="text-4xl font-bold text-gray-900">From panic to plan in 30 seconds</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                n: '01', bg: 'bg-green-50 border-green-200', color: 'text-green-600',
                title: 'Connect Google Calendar',
                desc: 'One click OAuth2 sign-in. The AI reads your real deadlines — not demo data, your actual schedule.',
              },
              {
                n: '02', bg: 'bg-blue-50 border-blue-200', color: 'text-blue-600',
                title: 'Tell the AI what\'s stressing you',
                desc: '"I have a presentation in 2 hours and haven\'t started." The AI already knows your calendar context.',
              },
              {
                n: '03', bg: 'bg-red-50 border-red-200', color: 'text-red-600',
                title: 'AI executes — you focus',
                desc: 'Calendar events created, focus time blocked, tasks prioritised, reminders set. You execute the plan.',
              },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className={`w-14 h-14 rounded-2xl border-2 ${s.bg} flex items-center justify-center mx-auto mb-5`}>
                  <span className={`text-xl font-black ${s.color}`}>{s.n}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" data-tour="features" className="bg-gray-50 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-center mb-16">
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">Features</p>
            <h2 className="text-4xl font-bold text-gray-900">Built for deadlines, not to-do lists</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Calendar, color: 'bg-green-100 text-green-700',
                title: 'Live Calendar Sync',
                desc: 'Real events from Google Calendar, not mock data. Countdowns, overdue flags, and urgency colors update in real time.',
              },
              {
                icon: Bot, color: 'bg-blue-100 text-blue-700',
                title: 'Agentic Claude AI',
                desc: 'Five real function-calling tools: create events, prioritise tasks, set reminders, schedule focus blocks, score your day.',
              },
              {
                icon: Grid, color: 'bg-purple-100 text-purple-700',
                title: 'Eisenhower Matrix',
                desc: 'Auto-sorts every task into urgent×important quadrants. Drag to rearrange. Changes persist to Firebase.',
              },
              {
                icon: Bell, color: 'bg-orange-100 text-orange-700',
                title: 'Escalating Alerts',
                desc: 'Push notifications at 24h → 2h → 30 minutes before every deadline. Background service, no tab needed open.',
              },
              {
                icon: Clock, color: 'bg-red-100 text-red-700',
                title: 'Mission Control Bar',
                desc: 'Persistent status bar that pulses red when you\'re under 2 hours from a deadline. Updates every 60 seconds.',
              },
              {
                icon: TrendingUp, color: 'bg-yellow-100 text-yellow-700',
                title: 'Productivity Score',
                desc: 'Calculated daily from completion rate, focus sessions, calendar load, and overdue tasks. Not vanity metrics.',
              },
            ].map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY NOT CHATGPT ───────────────────────────────────────────────── */}
      <section id="why" className="bg-white py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-green-600 mb-3">Why not just use ChatGPT?</p>
            <h2 className="text-4xl font-bold text-gray-900">This actually does things</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                bad:  'ChatGPT tells you to "break tasks into smaller pieces"',
                good: 'Creates the actual calendar block and sets the 2-hour push reminder for you',
              },
              {
                bad:  'Generic advice that ignores your real schedule',
                good: 'Reads your live Google Calendar first — every answer is aware of your actual availability',
              },
              {
                bad:  'You have to remember to go back and ask',
                good: 'Notifies you proactively at 24h, 2h, 30m with escalating urgency — no babysitting required',
              },
            ].map((c, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 p-6">
                <p className="text-sm text-gray-400 line-through mb-4 leading-relaxed">{c.bad}</p>
                <div className="h-px bg-gray-100 mb-4" />
                <p className="text-sm text-gray-900 font-medium leading-relaxed flex items-start gap-2">
                  <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                  {c.good}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-[#0a0a0a] py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-extrabold text-white mb-5 leading-tight"
            style={{ fontSize: 'clamp(36px, 5vw, 54px)' }}>
            Your next deadline is<br />
            <span className="text-red-400">already counting down.</span>
          </h2>
          <p className="text-gray-400 mb-10" style={{ fontSize: 18 }}>
            Every minute you wait is a minute you don't have a plan.
          </p>
          <button
            onClick={handleStart} disabled={loading}
            className="inline-flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white px-10 py-5 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ fontSize: 17, boxShadow: '0 8px 30px rgba(239,68,68,0.3)' }}
          >
            <AlertTriangle className="w-5 h-5" />
            {loading ? 'Connecting…' : 'Start for free'}
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-gray-600 text-sm mt-5">Google Calendar required · No credit card · Free forever</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0a0a0a] border-t border-white/10 py-6 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
              <Zap className="w-3 h-3 text-black" />
            </div>
            <span className="text-sm font-semibold text-white">LastMinute AI</span>
          </div>
          <p className="text-xs text-gray-600">
            Built for BlockseBlock Hackathon · Claude AI + Google APIs · Google Cloud Run
          </p>
          <Link to="/login" className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1">
            Sign in <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </footer>

      {/* Guided welcome tour */}
      <Tour steps={LANDING_TOUR} run={runTour} onClose={endTour} />
    </div>
  )
}
