import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Calendar, Brain, Bell, ArrowRight, Loader2 } from 'lucide-react'
import { getAuthUrl } from '../services/api'

const FEATURES = [
  { icon: Calendar, label: 'Real Google Calendar', desc: 'Live event sync, create events from AI' },
  { icon: Brain,    label: 'Gemini AI Agent',      desc: 'Function-calling, multi-turn memory' },
  { icon: Bell,     label: 'Escalating Reminders', desc: '24h → 2h → 30min push alerts' },
  { icon: Zap,      label: 'Eisenhower Matrix',    desc: 'AI-powered urgency × importance scoring' },
]

export default function OnboardingFlow({ onAuth }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const { auth_url, session_id } = await getAuthUrl()
      // Store session_id so the callback can retrieve it
      sessionStorage.setItem('pending_session_id', session_id)
      window.location.href = auth_url
    } catch (e) {
      setError('Failed to connect to backend. Is the server running?')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-space flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px]
                        bg-blue/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl
                          bg-blue/10 border border-blue/30 mb-4 shadow-glow-blue">
            <Zap className="w-8 h-8 text-blue-glow" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">LastMinute AI</h1>
          <p className="text-text-muted mt-2 text-sm">Mission control for your deadlines</p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <motion.div
              key={label}
              whileHover={{ scale: 1.02 }}
              className="panel p-4 card-shine"
            >
              <Icon className="w-5 h-5 text-blue-glow mb-2" />
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-text-muted text-xs mt-0.5">{desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleLogin}
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center gap-3 py-3 text-base"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {error && (
          <p className="text-red-alert text-sm text-center mt-3">{error}</p>
        )}

        <p className="text-text-muted text-xs text-center mt-4">
          Requires Google Calendar access · No data sold · Open source
        </p>
      </motion.div>
    </div>
  )
}
