import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { LogOut, Zap } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

import OnboardingFlow from './components/OnboardingFlow'
import ChatAgent from './components/ChatAgent'
import CalendarSync from './components/CalendarSync'
import TaskBoard from './components/TaskBoard'
import DeadlineAlert from './components/DeadlineAlert'
import ProductivityScore from './components/ProductivityScore'
import { useCalendar } from './hooks/useCalendar'
import { getAuthStatus } from './services/api'
import { registerServiceWorker } from './services/notifications'

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [taskRefresh, setTaskRefresh] = useState(0)
  const qc = useQueryClient()

  // Parse OAuth callback params + stored session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('session_id')
    const email = params.get('user')
    const name = params.get('name')

    if (sid && email) {
      setSessionId(sid)
      setUserEmail(decodeURIComponent(email))
      setUserName(decodeURIComponent(name || ''))
      localStorage.setItem('lm_session_id', sid)
      localStorage.setItem('lm_email', email)
      localStorage.setItem('lm_name', name || '')
      window.history.replaceState({}, '', '/')
      setAuthChecked(true)
      registerServiceWorker()
      return
    }

    const stored = localStorage.getItem('lm_session_id')
    if (stored) {
      getAuthStatus(stored)
        .then(({ authenticated }) => {
          if (authenticated) {
            setSessionId(stored)
            setUserEmail(localStorage.getItem('lm_email') || '')
            setUserName(localStorage.getItem('lm_name') || '')
            registerServiceWorker()
          }
        })
        .catch(() => {})
        .finally(() => setAuthChecked(true))
    } else {
      setAuthChecked(true)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('lm_session_id')
    localStorage.removeItem('lm_email')
    localStorage.removeItem('lm_name')
    setSessionId(null)
    setUserEmail('')
    qc.clear()
  }

  const handleTasksUpdated = useCallback(() => {
    setTaskRefresh(n => n + 1)
    qc.invalidateQueries({ queryKey: ['tasks', sessionId] })
    qc.invalidateQueries({ queryKey: ['productivity', sessionId] })
  }, [sessionId, qc])

  // Calendar for deadline alerts
  const { data: calEvents = [] } = useCalendar(sessionId)

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-space flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!sessionId) {
    return <OnboardingFlow />
  }

  return (
    <div className="h-screen bg-space flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5
                         border-b border-border bg-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue/20 border border-blue/30
                          flex items-center justify-center shadow-glow-blue">
            <Zap className="w-4 h-4 text-blue-glow" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">LastMinute AI</span>
        </div>

        <div className="flex-1">
          <ProductivityScore sessionId={sessionId} />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted hidden sm:block">
            {userName || userEmail}
          </span>
          <button
            onClick={handleLogout}
            className="btn-ghost text-xs flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      {/* Deadline alerts strip */}
      {calEvents.length > 0 && (
        <DeadlineAlert events={calEvents} sessionId={sessionId} />
      )}

      {/* Main 3-column layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Calendar */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden md:flex flex-col w-72 xl:w-80 border-r border-border flex-shrink-0"
        >
          <CalendarSync sessionId={sessionId} />
        </motion.aside>

        {/* Center: Chat Agent */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 flex flex-col min-w-0"
        >
          <ChatAgent
            sessionId={sessionId}
            onTasksUpdated={handleTasksUpdated}
          />
        </motion.section>

        {/* Right: Task Priority Board */}
        <motion.aside
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="hidden lg:flex flex-col w-80 xl:w-96 border-l border-border flex-shrink-0"
        >
          <TaskBoard sessionId={sessionId} refreshTrigger={taskRefresh} />
        </motion.aside>
      </main>
    </div>
  )
}
