import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, Bot, Grid, Bell, Mic, TrendingUp,
  Play, ChevronRight, Check, Zap
} from 'lucide-react'

const FEATURES = [
  {
    icon: Calendar, title: 'Live calendar sync',
    desc: 'Real deadlines pulled from Google Calendar with live countdown timers on every event.',
  },
  {
    icon: Bot, title: 'Agentic AI planning',
    desc: 'Gemini 2.0 Flash creates calendar events, blocks focus time, and executes your plan autonomously.',
  },
  {
    icon: Grid, title: 'Eisenhower matrix',
    desc: 'Every task scored by urgency × importance and dropped into the right quadrant automatically.',
  },
  {
    icon: Bell, title: 'Escalating reminders',
    desc: 'Push notifications at 24h → 2h → 30min before each deadline. Miss nothing.',
  },
  {
    icon: Mic, title: 'Voice input',
    desc: 'Speak your tasks using the Web Speech API. No typing required when you\'re in a rush.',
  },
  {
    icon: TrendingUp, title: 'Productivity score',
    desc: 'Gemini analyses your calendar load and task completion rate every day to keep you on track.',
  },
]

function Navbar() {
  return (
    <nav className="w-full h-[60px] flex items-center justify-between px-6 border-b border-white/10">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
          <Zap className="w-4 h-4 text-[#111]" />
        </div>
        <span className="font-semibold text-white text-sm">LastMinute AI</span>
      </div>
      <div className="hidden md:flex items-center gap-7 text-sm text-gray-400">
        <a href="#features" className="hover:text-white transition-colors">Features</a>
        <a href="#how" className="hover:text-white transition-colors">How it works</a>
        <a href="#features" className="hover:text-white transition-colors">Pricing</a>
      </div>
      <div className="flex items-center gap-2">
        <Link to="/login"
          className="px-3 py-1.5 text-sm text-gray-300 border border-white/20 rounded-lg hover:bg-white/5 transition-colors">
          Log in
        </Link>
        <Link to="/login"
          className="px-3 py-1.5 text-sm bg-white text-[#111] rounded-lg font-medium hover:bg-gray-100 transition-colors">
          Get started free
        </Link>
      </div>
    </nav>
  )
}

export default function Landing() {
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/auth/login')
      const { auth_url } = await resp.json()
      window.location.href = auth_url
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Hero (dark) ───────────────────────────────────────────────────── */}
      <div className="bg-[#0a0a0a]">
        <Navbar />

        <section className="flex flex-col items-center justify-center text-center px-4 py-24 max-w-[680px] mx-auto">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 text-green-400 rounded-full px-4 py-1.5 text-xs font-medium mb-7">
            ✦ Powered by Gemini AI + Google Calendar
          </span>

          {/* H1 */}
          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-5">
            Your AI co-pilot for{' '}
            <span className="text-accent">beating every deadline</span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-xl">
            LastMinute AI connects to your Google Calendar, understands your workload, and proactively
            helps you plan, prioritize, and complete tasks — before it's too late.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-2.5 bg-white text-[#111] px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Redirecting…' : 'Start with Google — it\'s free'}
            </button>
            <button className="flex items-center gap-2 border border-white/20 text-white px-5 py-3 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors">
              <Play className="w-4 h-4" />
              Watch demo
            </button>
          </div>

          <p className="text-gray-600 text-xs mt-5">No credit card required · Free to use · Google Calendar required</p>
        </section>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="bg-white border-b border-border py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-primary mb-12">From panic to plan in 30 seconds</h2>
          <div className="flex flex-col sm:flex-row items-start gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              { n:'1', title:'Connect Google Calendar', desc:'OAuth2 sign-in gives the AI read/write access to your real calendar.' },
              { n:'2', title:'Describe what\'s stressing you', desc:'Tell the AI your tasks, deadlines, and priorities in plain English.' },
              { n:'3', title:'AI executes your plan', desc:'Events created, focus blocks scheduled, reminders set — automatically.' },
            ].map(s => (
              <div key={s.n} className="flex-1 px-8 py-6 text-center">
                <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center mx-auto mb-3">{s.n}</div>
                <h3 className="font-semibold text-sm text-primary mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section id="features" className="bg-surface py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Features</p>
            <h2 className="text-3xl font-bold text-primary">Everything you need to hit every deadline</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white border border-border rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center mb-4">
                  <f.icon className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-semibold text-sm text-primary mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA strip ────────────────────────────────────────────────────── */}
      <section className="bg-primary py-16 px-4 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to beat your next deadline?</h2>
        <p className="text-gray-400 mb-8 text-sm">Free forever. No credit card. Just Google.</p>
        <button
          onClick={handleStart}
          className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Get started free <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-5 px-6 text-center text-xs text-muted">
        © 2026 LastMinute AI · Built for BlockseBlock Hackathon · Powered by Gemini 2.0 Flash
      </footer>
    </div>
  )
}
