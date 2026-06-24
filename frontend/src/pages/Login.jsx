import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Lock, Zap } from 'lucide-react'

const PERMS = [
  { icon: Check, text: 'Read your Google Calendar events',  ok: true },
  { icon: Check, text: 'Create events and focus blocks',    ok: true },
  { icon: Check, text: 'View your basic profile info',      ok: true },
  { icon: Lock,  text: 'We never read your emails',         ok: false },
]

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const resp = await fetch('/api/auth/login')
      if (!resp.ok) throw new Error('Backend unreachable')
      const { auth_url } = await resp.json()
      window.location.href = auth_url
    } catch {
      setError('Cannot reach the server. Make sure the backend is running on port 8000.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      {/* Back to landing */}
      <Link to="/" className="mb-8 text-xs text-muted hover:text-primary transition-colors">
        ← Back to home
      </Link>

      <div className="w-full max-w-[360px] bg-white border border-border rounded-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>

        <h1 className="text-lg font-bold text-primary text-center mb-1.5">
          Welcome to LastMinute AI
        </h1>
        <p className="text-sm text-muted text-center mb-7 leading-snug">
          Sign in with Google to connect your calendar and start beating your deadlines.
        </p>

        {/* Google button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-border rounded-lg py-3 text-sm font-medium text-primary hover:bg-subtle transition-colors disabled:opacity-60"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting to Google…' : 'Continue with Google'}
        </button>

        {error && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Permissions */}
        <div className="mt-6 space-y-2">
          {PERMS.map(p => (
            <div key={p.text} className="flex items-center gap-2.5 text-xs text-muted">
              {p.ok
                ? <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                : <Lock  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              }
              {p.text}
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          By continuing you agree to our{' '}
          <span className="underline cursor-pointer hover:text-primary">Terms of Service</span>
          {' '}and{' '}
          <span className="underline cursor-pointer hover:text-primary">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}
