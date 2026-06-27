import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, BookOpen, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Avatar from './Avatar'

export default function UserMenu() {
  const { user, logout, isDemo } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const go = (path) => { setOpen(false); navigate(path) }
  const handleLogout = () => { setOpen(false); logout(); navigate('/') }

  const itemClass = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-primary hover:bg-subtle transition-colors text-left'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        data-tour="usermenu"
        className="flex items-center gap-1 rounded-full focus:outline-none focus:ring-2 focus:ring-accent-border hover:opacity-90 transition"
        title="Account"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Avatar src={user?.picture} name={user?.name} email={user?.email} size={32} />
        <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-border rounded-xl shadow-lg py-1 z-50 overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-3 border-b border-border">
            <Avatar src={user?.picture} name={user?.name} email={user?.email} size={42} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
              {isDemo && (
                <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-light text-accent-text border border-accent-border">
                  Demo mode
                </span>
              )}
            </div>
          </div>

          <button className={itemClass} onClick={() => go('/dashboard/settings')}>
            <Settings className="w-4 h-4 text-muted" /> Settings
          </button>
          <button className={itemClass} onClick={() => go('/dashboard/guide')}>
            <BookOpen className="w-4 h-4 text-muted" /> User Guide
          </button>

          <div className="border-t border-border my-1" />

          <button className={`${itemClass} !text-red-600`} onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
