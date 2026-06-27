import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Moon, Bell, BellOff, LogOut, ShieldCheck, Clock, Mail, ExternalLink, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { subscribeToPush } from '../../services/notifications'
import Avatar from '../../components/Avatar'

function Card({ title, desc, children }) {
  return (
    <section className="bg-white border border-border rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-bold text-primary">{title}</h2>
      {desc && <p className="text-sm text-muted mt-0.5 mb-4">{desc}</p>}
      <div className={desc ? '' : 'mt-4'}>{children}</div>
    </section>
  )
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Icon className="w-4 h-4 text-muted flex-shrink-0" />
      <span className="text-sm text-muted w-28 flex-shrink-0">{label}</span>
      <span className="text-sm text-primary font-medium truncate">{value || '—'}</span>
    </div>
  )
}

export default function Settings() {
  const { user, logout, isDemo, tz } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()

  const [pushState, setPushState] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const [busy, setBusy] = useState(false)

  const enablePush = async () => {
    setBusy(true)
    const ok = await subscribeToPush(user.sessionId)
    setPushState(ok ? 'granted' : (typeof Notification !== 'undefined' ? Notification.permission : 'denied'))
    setBusy(false)
  }

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-primary">Settings</h1>
        <p className="text-sm text-muted">Manage your profile, appearance, and notifications.</p>
      </div>

      {/* Profile */}
      <Card title="Profile">
        <div className="flex items-center gap-4 mb-4">
          <Avatar src={user?.picture} name={user?.name} email={user?.email} size={64} />
          <div className="min-w-0">
            <p className="text-base font-semibold text-primary truncate">{user?.name || 'User'}</p>
            <p className="text-sm text-muted truncate">{user?.email}</p>
            {isDemo && (
              <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-accent-light text-accent-text border border-accent-border">
                Demo account
              </span>
            )}
          </div>
        </div>
        <div className="border-t border-border pt-2">
          <Row icon={Mail} label="Email" value={user?.email} />
          <Row icon={Clock} label="Time zone" value={tz} />
        </div>
        <p className="text-xs text-muted mt-3">
          Your name, photo, and email come from your Google account and can't be edited here.
        </p>
      </Card>

      {/* Appearance */}
      <Card title="Appearance" desc="Switch between light and dark mode.">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-primary">
            {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            {isDark ? 'Dark mode' : 'Light mode'}
          </div>
          <button
            onClick={toggle}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-border hover:bg-subtle transition-colors text-primary"
          >
            Switch to {isDark ? 'light' : 'dark'}
          </button>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications" desc="Get push alerts before your deadlines (24h / 2h / 1h / 30m).">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-primary">
            {pushState === 'granted' ? <Bell className="w-4 h-4 text-accent" /> : <BellOff className="w-4 h-4 text-muted" />}
            {pushState === 'granted' ? 'Notifications enabled'
              : pushState === 'denied' ? 'Blocked in your browser'
              : 'Notifications off'}
          </div>
          {pushState !== 'granted' && (
            <button
              onClick={enablePush}
              disabled={busy || pushState === 'denied'}
              className="text-sm font-medium px-4 py-2 rounded-lg btn-primary disabled:opacity-50"
            >
              {busy ? 'Enabling…' : 'Enable'}
            </button>
          )}
        </div>
        {pushState === 'denied' && (
          <p className="text-xs text-muted mt-3">
            You've blocked notifications. Enable them in your browser's site settings to receive deadline alerts.
          </p>
        )}
      </Card>

      {/* Account */}
      <Card title="Account">
        <div className="space-y-1">
          <Link to="/dashboard/guide" className="flex items-center justify-between py-2.5 group">
            <span className="flex items-center gap-2.5 text-sm text-primary"><BookOpen className="w-4 h-4 text-muted" /> User guide — how to use the app</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
          </Link>
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer"
             className="flex items-center justify-between py-2.5 group">
            <span className="flex items-center gap-2.5 text-sm text-primary"><ShieldCheck className="w-4 h-4 text-muted" /> Manage Google access</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted group-hover:text-primary" />
          </a>
          <div className="flex items-center gap-4 py-2.5 text-xs text-muted">
            <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
        <div className="border-t border-border mt-2 pt-3">
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </Card>
    </div>
  )
}
