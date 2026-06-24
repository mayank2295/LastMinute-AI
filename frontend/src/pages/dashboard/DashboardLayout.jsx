import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/Sidebar'
import { Menu, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getProductivity } from '../../services/api'
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

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
