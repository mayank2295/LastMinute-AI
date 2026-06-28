import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import ThemeToggle from '../../components/ThemeToggle'
import UserMenu from '../../components/UserMenu'
import Tour from '../../components/Tour'
import { Menu, TrendingUp, HelpCircle, PanelLeft } from 'lucide-react'
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
  { selector: '[data-tour="goals"]', title: 'Goals & Habits',
    body: 'Set a goal and Gemini breaks it into milestones; build daily habits and keep your streak alive.' },
  { selector: '[data-tour="guide"]', title: 'New here? Open the User Guide',
    body: 'A full how-to manual explaining every feature and the purpose of the app — open it anytime you feel lost.' },
  { selector: '[data-tour="usermenu"]', title: 'Profile & Settings',
    body: 'Click your photo for Settings (theme, notifications), the User Guide, and sign out. Your Google name and photo appear here.' },
]

const PAGE_TITLES = {
  '/dashboard':               'Dashboard',
  '/dashboard/matrix':        'Game Plan',
  '/dashboard/timer':         'Focus Timer',
  '/dashboard/reminders':     'Reminders',
  '/dashboard/productivity':  'Productivity',
  '/dashboard/calendar':      'Calendar',
  '/dashboard/tasks':         'My Tasks',
  '/dashboard/goals':         'Goals & Habits',
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

  // Prefetch the lazy page chunks shortly after load so switching pages is
  // instant (the chunk is already cached — no loading spinner on navigation).
  useEffect(() => {
    const t = setTimeout(() => {
      import('./Calendar'); import('./Tasks'); import('./PriorityMatrix')
      import('./Goals'); import('./FocusTimer'); import('./Reminders')
      import('./Productivity'); import('./Settings'); import('./Guide')
    }, 1200)
    return () => clearTimeout(t)
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

  // Resizable sidebar — drag the right edge to widen/narrow; width persists.
  const MIN_W = 200, MAX_W = 380
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const v = Number(localStorage.getItem('lm_sidebar_w'))
    return v >= MIN_W && v <= MAX_W ? v : 240
  })
  const widthRef = useRef(sidebarWidth)
  const startResize = (e) => {
    e.preventDefault()
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const onMove = (ev) => {
      const w = Math.min(MAX_W, Math.max(MIN_W, ev.clientX))
      widthRef.current = w
      setSidebarWidth(w)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      localStorage.setItem('lm_sidebar_w', String(widthRef.current))
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Collapse-to-icons (persisted). When collapsed the rail is a fixed 68px.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('lm_sidebar_collapsed') === '1')
  const toggleCollapsed = () => setCollapsed(c => { localStorage.setItem('lm_sidebar_collapsed', c ? '0' : '1'); return !c })
  const effectiveWidth = collapsed ? 68 : sidebarWidth

  const title      = PAGE_TITLES[location.pathname] || 'Dashboard'
  const firstName  = (user?.name || '').split(' ')[0]
  const score      = prodData?.score
  const scoreColor = score >= 70 ? 'text-accent bg-accent-light border-accent-border'
                   : score >= 40 ? 'text-orange-700 bg-orange-50 border-orange-200'
                   : 'text-red-700 bg-red-50 border-red-200'

  return (
    <div className="h-screen flex overflow-hidden bg-surface">
      {/* Sidebar — desktop (resizable) */}
      <div className="hidden md:flex flex-shrink-0 relative" data-tour="sidebar" style={{ width: effectiveWidth }}>
        <Sidebar collapsed={collapsed} />
        {/* Drag handle (hidden when collapsed) */}
        {!collapsed && (
          <div
            onMouseDown={startResize}
            title="Drag to resize"
            className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize hover:bg-accent/40 active:bg-accent/60 transition-colors"
          />
        )}
      </div>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10 flex w-[260px]">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-[60px] flex-shrink-0 flex items-center justify-between px-5 bg-white border-b border-border">
          <div className="flex items-center gap-2">
            <button className="md:hidden p-1.5 rounded-lg hover:bg-subtle" onClick={() => setSidebarOpen(true)} title="Menu">
              <Menu className="w-5 h-5 text-muted" />
            </button>
            <button className="hidden md:inline-flex theme-toggle" onClick={toggleCollapsed}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <PanelLeft className="w-4 h-4" />
            </button>
            <h1 className="font-semibold text-xl text-primary ml-1">{title}</h1>
          </div>
          <div className="flex items-center gap-2.5">
            {firstName && (
              <span className="hidden sm:block text-sm text-muted mr-1">
                Welcome, <span className="font-semibold text-primary">{firstName}</span>
              </span>
            )}
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

        {/* Page content — Suspense here so switching pages only shows a small
            spinner in the content area; the sidebar & top bar stay put (no full-screen flash). */}
        <main className="flex-1 overflow-auto bg-surface">
          <Suspense fallback={
            <div className="h-full flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Guided product tour */}
      <Tour steps={DASHBOARD_TOUR} run={runTour} onClose={endTour} />
    </div>
  )
}
