import { useEffect, useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import { Menu, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getProductivity, getCalendarEvents } from '../../services/api'
import { registerServiceWorker } from '../../services/notifications'

const PAGE_TITLES = {
  '/dashboard':               'Dashboard',
  '/dashboard/matrix':        'Priority Matrix',
  '/dashboard/timer':         'Focus Timer',
  '/dashboard/reminders':     'Reminders',
  '/dashboard/productivity':  'Productivity',
  '/dashboard/calendar':      'Calendar',
  '/dashboard/tasks':         'My Tasks',
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

  useEffect(() => {
    registerServiceWorker()
  }, [])

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
      <div className="hidden md:flex">
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
        <header className="h-[48px] flex-shrink-0 flex items-center justify-between px-4 bg-white border-b border-border">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1.5 rounded-lg hover:bg-subtle" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-4 h-4 text-muted" />
            </button>
            <h1 className="font-semibold text-sm text-primary">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {score != null && (
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${scoreColor}`}>
                <TrendingUp className="w-3 h-3" />
                Score {score}/100
              </span>
            )}
            <div className="w-7 h-7 rounded-full bg-accent-light border border-accent-border flex items-center justify-center text-xs font-bold text-accent-text">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Status bar */}
        {user && <StatusBar sessionId={user.sessionId} />}

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
