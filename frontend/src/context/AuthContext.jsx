import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getMe } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ── Priority 1: OAuth callback — Google redirects to /dashboard?session_id=...&user=...&name=...
    // This MUST run before the localStorage check, otherwise ProtectedRoute redirects to /login
    // before the session is saved, losing the URL params forever.
    const params   = new URLSearchParams(window.location.search)
    const urlSid   = params.get('session_id')
    const urlEmail = params.get('user')
    const urlName  = params.get('name')

    if (urlSid && urlEmail) {
      const email = decodeURIComponent(urlEmail)
      const name  = decodeURIComponent(urlName || '')
      localStorage.setItem('lm_session_id', urlSid)
      localStorage.setItem('lm_email',      email)
      localStorage.setItem('lm_name',       name)
      setUser({ sessionId: urlSid, email, name })
      // Clean URL without triggering a navigation
      window.history.replaceState({}, '', window.location.pathname)
      setLoading(false)
      return
    }

    // ── Priority 2: Persisted session from a previous login
    const stored = localStorage.getItem('lm_session_id')
    if (!stored) { setLoading(false); return }

    getMe(stored)
      .then(data => {
        setUser({
          sessionId: stored,
          email:     data.email,
          name:      data.name || localStorage.getItem('lm_name') || '',
        })
      })
      .catch(() => {
        // Session expired or invalid — clear everything
        localStorage.removeItem('lm_session_id')
        localStorage.removeItem('lm_email')
        localStorage.removeItem('lm_name')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback((sessionId, email, name) => {
    localStorage.setItem('lm_session_id', sessionId)
    localStorage.setItem('lm_email',      email)
    localStorage.setItem('lm_name',       name || '')
    setUser({ sessionId, email, name: name || '' })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('lm_session_id')
    localStorage.removeItem('lm_email')
    localStorage.removeItem('lm_name')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
