import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import ThemeToggle from '../../components/ThemeToggle'
import UserMenu from '../../components/UserMenu'
import Tour from '../../components/Tour'
import { Menu, TrendingUp, HelpCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getProductivity, getCalendarEvents } from '../../services/api'
import { registerServiceWorker } from '../../services/notifications'

const DASHBOARD_TOUR = [
  { title: 'Welcome to LastMinute AI',
    body: "Your AI co-pilot for beating deadlines. Quick 30-second tour — you can skip anytime." },
  { selector: '[data-tour="sidebar"]', title: 'Your toolkit',
    body: 'Calendar, tasks, Game Plan, Focus Timer, reminders and productivity — all in one place.' },
  { selector: '[data-tour="plan"]', title: 'Plan my day (the magic)',
    body: 'One click and the AI reads your calendar, writes your plan, and auto-blocks focus time on your real Google Calendar.' },
  { selector: '[data-tour="braindump"]', title: 'Brain dump',
    body: 'Type everything on your mind — the AI extracts tasks, infers deadlines, and prioritises them instantly.' },
  { selector: '[data-tour="chat"]', title: 'Talk to your agent',
    body: 'Ask it anything: "schedule my report tomorrow at 3 PM" and it actually does it.' },
  { selector: '[data-tour="score"]', title: 'Your productivity score',
    body: 'A live score from your completion rate, focus sessions, and calendar load. Aim for 70+.' },
]

const PAGE_TITLES = {
  '/dashboard':               'Dashboard',
  '/dashboard/matrix':        'Game Plan',
  '/dashboard/timer':         'Focus Timer',
  '/dashboard/reminders':     'Reminders',
  '/dashboard/productivity':  'Productivity',
  '/dashboard/calendar':      'Calendar',
  '/dashboard/tasks':         'My Tasks',
  '/dashboard/settings':      'Settings',
  '/dashboard/guide':         'User Guide',
}

function StatusBar({ sessionId }) {
  const [status, setStatus] = useState(null)

  const update = useCallback(async () => {
    try {
      const data = await getCalendarEvents(sessionId, 1)
      const events = data?.events || []
      if (!events.length) {
        setStatus({ type: 'green', text: 'No deadlines today', sub: 'Great day to get ahead' })
        return
      }
      const nearest = [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0]
      const hours = (new Date(nearest.start_time) - new Date()) / 3600000
      const title = nearest.title || 'Upcoming event'

      if (hours <= 0) {
        setStatus({ type: 'red', pulse: true, text: 'OVERDUE', sub: `${title} was due ${Math.abs(Math.round(hours))}h ago` })
      } else if (hours <= 2) {
        const h = Math.floor(hours), m = Math.floor((hours - h) * 60)
        setStatus({ type: 'red', pulse: true, text: `URGENT — ${title}`, sub: `Closes in ${h}h ${m}m — act now` })
      } else if (hours <= 24) {
        setStatus({ type: 'orange', text: `Due soon — ${title}`, sub: `${Math.round(hours)}h remaining` })
      } else if (hours <= 72) {
        setStatus({ type: 'yellow', text: `${title} coming up`, sub: `${Math.round(hours / 24)} days left` })
      } else {
        setStatus({ type: 'green', text: 'All clear', sub: `Next: ${title} in ${Math.round(hours / 24)} days` })
      }
    } catch {
      setStatus({ type: 'green', text: 'Connect Google Calendar', sub: 'to see deadline alerts here' })
    }
  }, [sessionId])

  useEffect(() => {
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [update])

  if (!status) return null

  return (
    <div className={`status-bar ${status.type}${status.pulse ? ' pulse' : ''}`}>
      <div className="flex items-center">
        <div className={`status-dot ${status.type}`} />
        <span className="status-text">{status.text}</span>
        <span className="status-sub hidden sm:inline">{status.sub}</span>
      </div>
      <span className="text-xs text-gray-400 hidden sm:block">Updates every 60s</span>
    </div>
  )
}

export default function DashboardLayout() {
  const { user } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [runTour, setRunTour] = useState(false)

  useEffect(() => {
    registerServiceWorker()
  }, [])

  // Auto-start the tour on the user's first visit to the dashboard home.
  useEffect(() => {
    if (location.pathname === '/dashboard' && !localStorage.getItem('lm_tour_done')) {
      const t = setTimeout(() => setRunTour(true), 800)
      return () => clearTimeout(t)
    }
  }, [location.pathname])

  const endTour = () => {
    localStorage.setItem('lm_tour_done', '1')
    setRunTour(false)
  }

  const { data: prodData } = useQuery({
    queryKey: ['productivity', user?.sessionId],
    queryFn: () => getProductivity(user.sessionId),
    enabled: !!user,
    refetchInterval: 10 * 60_000,
  })

  const title      = PAGE_TITLES[location.pathname] || 'Dashboard'
  const score      = prodData?.score
  const scoreColor = score >= 70 ? 'text-accent bg-accent-light border-accent-border'
                   : score >= 40 ? 'text-orange-700 bg-orange-50 border-orange-200'
                   : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="h-screen flex overflow-hidden bg-surface">
      {/* Sidebar — desktop */}
      <div className="hidden md:flex flex-shrink-0" data-tour="sidebar">
        <Sidebar />
      </div>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-[56px] flex-shrink-0 flex items-center justify-between px-5 bg-white border-b border-border">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-lg hover:bg-subtle" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-muted" />
            </button>
            <h1 className="font-bold text-base text-primary">{title}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            {score != null && (
              <span data-tour="score" className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border ${scoreColor}`}>
                <TrendingUp className="w-3.5 h-3.5" />
                Score {score}/100
              </span>
            )}
            <button
              onClick={() => setRunTour(true)}
              className="theme-toggle"
              title="Take a tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* Status bar */}
        {user && <StatusBar sessionId={user.sessionId} />}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Guided product tour */}
      <Tour steps={DASHBOARD_TOUR} run={runTour} onClose={endTour} />
    </div>
  )
}
