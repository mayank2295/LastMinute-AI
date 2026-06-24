import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, Calendar, CheckSquare, Grid2x2,
  Timer, Bell, TrendingUp, Zap, LogOut
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
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
      { to: '/dashboard/matrix',       icon: Grid2x2,     label: 'Priority Matrix' },
      { to: '/dashboard/timer',        icon: Timer,       label: 'Focus Timer' },
      { to: '/dashboard/reminders',    icon: Bell,        label: 'Reminders',      reminderCount: true },
      { to: '/dashboard/productivity', icon: TrendingUp,  label: 'Productivity' },
    ],
  },
]

function NavItem({ item, taskCount, reminderCount }) {
  const base = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors group'
  const active   = 'bg-accent-light text-accent-text font-medium'
  const inactive = 'text-gray-500 hover:bg-subtle hover:text-primary'

  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
    >
      <item.icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badgeGreen && (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent bg-accent-light border border-accent-border rounded-full px-1.5 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Live
        </span>
      )}
      {item.taskCount && taskCount > 0 && (
        <span className="text-[10px] font-semibold bg-primary text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {taskCount}
        </span>
      )}
      {item.reminderCount && reminderCount > 0 && (
        <span className="text-[10px] font-semibold bg-orange-500 text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
          {reminderCount}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ onClose }) {
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

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <aside className="w-[240px] h-full flex flex-col bg-white border-r border-border flex-shrink-0">
      {/* Logo */}
      <div className="h-[56px] flex items-center gap-3 px-5 border-b border-border flex-shrink-0">
        <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-base text-primary tracking-tight">LastMinute AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-xs font-bold uppercase tracking-widest text-gray-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavItem
                  key={item.to + item.label}
                  item={item}
                  taskCount={tasksData || 0}
                  reminderCount={remindersData || 0}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-subtle transition-colors">
          <div className="w-8 h-8 rounded-full bg-accent-light border border-accent-border flex items-center justify-center text-sm font-bold text-accent-text flex-shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button onClick={handleLogout} title="Sign out" className="text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
