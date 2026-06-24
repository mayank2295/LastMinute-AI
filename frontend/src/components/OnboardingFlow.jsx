import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Calendar, BrainCircuit, Bell, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { getAuthUrl } from '../services/api'

const STEPS = [
  { icon: Calendar,     color: 'text-blue',   bg: 'bg-blue-light',   title: 'Reads your calendar',   desc: 'Sees your real deadlines & free windows' },
  { icon: BrainCircuit, color: 'text-purple',  bg: 'bg-purple-light', title: 'AI plans your day',     desc: 'Gemini breaks tasks into a clear action plan' },
  { icon: Bell,         color: 'text-amber',   bg: 'bg-amber-light',  title: 'Escalating reminders',  desc: '24h → 2h → 30min push notifications' },
  { icon: CheckCircle2, color: 'text-green',   bg: 'bg-green-light',  title: 'You hit every deadline', desc: 'Complete tasks with AI guidance in real-time' },
]

export default function OnboardingFlow() {
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { auth_url } = await getAuthUrl()
      window.location.href = auth_url
    } catch {
      setError('Cannot reach the server. Make sure the backend is running on port 8000.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Subtle grid background */}
      <div className="fixed inset-0 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      {/* Blue gradient blob */}
      <div className="fixed top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full pointer-events-none"
           style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-ink text-lg">LastMinute AI</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-4 font-medium">
          <span className="w-2 h-2 rounded-full bg-green animate-pulse" />
          Powered by Gemini 2.0 Flash
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 badge-blue mb-6 text-sm px-4 py-1.5">
            <Zap className="w-3.5 h-3.5" />
            BlockseBlock Hackathon · PS1: The Last-Minute Life Saver
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-ink leading-tight tracking-tight mb-4 max-w-2xl">
            Turn panic into
            <span className="text-blue"> a plan</span>
            <br />in 30 seconds.
          </h1>
          <p className="text-lg text-ink-3 max-w-xl mx-auto mb-10 leading-relaxed">
            Connect your Google Calendar. Tell the AI what's stressing you out.
            Watch it build your entire action plan — and actually execute it.
          </p>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogin}
            disabled={loading}
            className="btn-primary text-base py-3.5 px-8 shadow-card-md hover:shadow-card-lg
                       transition-shadow duration-200 mx-auto"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#fff" fillOpacity=".9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#fff" fillOpacity=".75" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#fff" fillOpacity=".6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#fff" fillOpacity=".5" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

          {error && (
            <p className="badge-red mt-4 mx-auto w-fit">{error}</p>
          )}

          <p className="text-xs text-ink-4 mt-4">
            Google Calendar access required · Your data stays private · Open source
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-20 w-full max-w-3xl"
        >
          <p className="label text-center mb-6">How it works</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div key={i} className="card p-5 text-left relative hover:shadow-card-md transition-shadow">
                <span className="absolute top-3 right-3 text-xs font-bold text-ink-4">{i + 1}</span>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <p className="font-semibold text-sm text-ink mb-1">{s.title}</p>
                <p className="text-xs text-ink-3 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6">
        <p className="text-xs text-ink-4">Built with Gemini 2.0 Flash · Google Calendar API · Firebase Firestore</p>
      </footer>
    </div>
  )
}
