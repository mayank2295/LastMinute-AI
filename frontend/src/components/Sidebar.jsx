import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Calendar, CheckSquare, Grid2x2,
  Timer, Bell, TrendingUp, Zap, LogOut, Settings, BookOpen, Target
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'
import { useQuery } from '@tanstack/react-query'
import { getTasks, getReminders } from '../services/api'

const SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { to: '/dashboard',              icon: Home,        label: 'Dashboard',      badgeGreen: true },
      { to: '/dashboard/calendar',     icon: Calendar,    label: 'Calendar' },
      { to: '/dashboard/tasks',        icon: CheckSquare, label: 'My Tasks',       taskCount: true },
    ],
  },
  {
    label: 'FOCUS TOOLS',
    items: [
      { to: '/dashboard/matrix',       icon: Grid2x2,     label: 'Game Plan' },
      { to: '/dashboard/goals',        icon: Target,      label: 'Goals & Habits', dataTour: 'goals' },
      { to: '/dashboard/timer',        icon: Timer,       label: 'Focus Timer' },
      { to: '/dashboard/reminders',    icon: Bell,        label: 'Reminders',      reminderCount: true },
      { to: '/dashboard/productivity', icon: TrendingUp,  label: 'Productivity' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { to: '/dashboard/guide',        icon: BookOpen,    label: 'User Guide', dataTour: 'guide' },
      { to: '/dashboard/settings',     icon: Settings,    label: 'Settings',   dataTour: 'settings' },
    ],
  },
]

function NavItem({ item, taskCount, reminderCount, collapsed }) {
  const base = `relative flex items-center rounded-lg text-sm transition-colors ${collapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2'}`
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      data-tour={item.dataTour}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `${base} ${isActive ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-subtle hover:text-primary'}`}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-accent" />}
          <item.icon style={{ width: 18, height: 18 }} className="flex-shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {!collapsed && item.badgeGreen && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-1.5 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
            </span>
          )}
          {!collapsed && item.taskCount && taskCount > 0 && (
            <span className="text-[11px] font-semibold bg-primary text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{taskCount}</span>
          )}
          {!collapsed && item.reminderCount && reminderCount > 0 && (
            <span className="text-[11px] font-semibold bg-orange-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{reminderCount}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ collapsed = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', user?.sessionId],
    queryFn: () => getTasks(user.sessionId),
    enabled: !!user,
    select: d => (d.tasks || []).filter(t => !t.completed).length,
  })
  const { data: remindersData } = useQuery({
    queryKey: ['reminders', user?.sessionId],
    queryFn: () => getReminders(user.sessionId),
    enabled: !!user,
    select: d => (d.reminders || []).filter(r => !r.reminder_30m_sent).length,
  })

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <aside className="w-full h-full flex flex-col bg-surface border-r border-border flex-shrink-0">
      {/* Brand — click to return to the landing page (stays logged in) */}
      <NavLink
        to="/"
        title="Back to home"
        className={`h-[60px] flex items-center border-b border-border flex-shrink-0 hover:bg-subtle transition-colors ${collapsed ? 'justify-center' : 'gap-2.5 px-5'}`}
      >
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="font-bold text-[17px] text-primary tracking-tight">LastMinute AI</span>}
      </NavLink>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        {SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed
              ? <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{section.label}</p>
              : <div className="mx-2 mb-2 border-t border-border" />}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem key={item.to + item.label} item={item} collapsed={collapsed}
                  taskCount={tasksData || 0} reminderCount={remindersData || 0} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User block */}
      <div className={`border-t border-border ${collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'}`}>
        {collapsed ? (
          <>
            <NavLink to="/dashboard/settings" title={user?.name || 'Settings'}>
              <Avatar src={user?.picture} name={user?.name} email={user?.email} size={32} />
            </NavLink>
            <button onClick={handleLogout} title="Sign out" className="text-gray-400 hover:text-red-500 transition-colors p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <NavLink to="/dashboard/settings" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-subtle transition-colors">
            <Avatar src={user?.picture} name={user?.name} email={user?.email} size={34} className="flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
            <button onClick={(e) => { e.preventDefault(); handleLogout() }} title="Sign out"
              className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </NavLink>
        )}
      </div>
    </aside>
  )
}
