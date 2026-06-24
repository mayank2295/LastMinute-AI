import { useState, useEffect } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import DeadlineList from '../../components/DeadlineList'
import ChatAgent from '../../components/ChatAgent'
import { getBriefing } from '../../services/api'
import { X, Zap, AlertTriangle, Clock } from 'lucide-react'

function MorningBrief({ sessionId, onDismiss }) {
  const { data, isLoading } = useQuery({
    queryKey: ['briefing', sessionId],
    queryFn: () => getBriefing(sessionId),
    staleTime: 10 * 60_000,
  })

  if (isLoading) return (
    <div className="flex-shrink-0 mx-4 mt-3 h-14 skeleton rounded-xl" />
  )
  if (!data || data.error) return null

  const { greeting, first_name, critical_count, high_count, total_events, productivity_score } = data
  const scoreColor = productivity_score >= 70 ? 'text-accent' : productivity_score >= 40 ? 'text-orange-500' : 'text-red-500'
  const urgentCount = (critical_count || 0) + (high_count || 0)

  return (
    <div className="flex-shrink-0 mx-4 mt-3 bg-white border border-border rounded-xl px-4 py-3 flex items-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
        <Zap className="w-4 h-4 text-accent" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-primary">
          {greeting}, {first_name}!
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-muted">{total_events || 0} events in the next 3 days</span>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 font-medium">
              <AlertTriangle className="w-3 h-3" />
              {urgentCount} urgent
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${scoreColor}`}>
            <Clock className="w-3 h-3" />
            Score {productivity_score}/100
          </span>
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

const BRIEF_DISMISSED_KEY = 'lm_brief_dismissed_date'

export default function Home() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Show brief once per day
  const today = new Date().toDateString()
  const [showBrief, setShowBrief] = useState(
    () => localStorage.getItem(BRIEF_DISMISSED_KEY) !== today
  )

  const dismissBrief = () => {
    localStorage.setItem(BRIEF_DISMISSED_KEY, today)
    setShowBrief(false)
  }

  const handleTasksUpdated = () => {
    qc.invalidateQueries({ queryKey: ['tasks',        user?.sessionId] })
    qc.invalidateQueries({ queryKey: ['productivity', user?.sessionId] })
    qc.invalidateQueries({ queryKey: ['calendar',     user?.sessionId] })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Morning Brief banner — shown once per day, dismissable */}
      {showBrief && user && (
        <MorningBrief sessionId={user.sessionId} onDismiss={dismissBrief} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left column — deadlines */}
        <div className="hidden lg:flex flex-col w-[260px] xl:w-[280px] border-r border-border flex-shrink-0 bg-white overflow-hidden">
          <DeadlineList />
        </div>

        {/* Right column — chat */}
        <div className="flex-1 overflow-hidden">
          <ChatAgent onTasksUpdated={handleTasksUpdated} />
        </div>
      </div>
    </div>
  )
}
