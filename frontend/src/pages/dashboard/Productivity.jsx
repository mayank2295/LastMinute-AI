import { useQuery } from '@tanstack/react-query'
import { getProductivity } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { TrendingUp, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react'

function ScoreGauge({ score }) {
  const r     = 52
  const circ  = Math.PI * r  // half circle
  const pct   = (score || 0) / 100
  const offset = circ * (1 - pct)
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#f97316' : '#dc2626'

  return (
    <div className="flex flex-col items-center">
      <svg className="w-40 h-24 overflow-visible" viewBox="0 0 120 64">
        <path
          d={`M 14 60 A ${r} ${r} 0 0 1 106 60`}
          fill="none" stroke="#f3f4f6" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d={`M 14 60 A ${r} ${r} 0 0 1 106 60`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>{score ?? '–'}</text>
        <text x="60" y="68" textAnchor="middle" fontSize="8" fill="#9ca3af">out of 100</text>
      </svg>
    </div>
  )
}

function Bar({ value, max = 100, color = '#16a34a' }) {
  return (
    <div className="h-6 bg-gray-100 rounded-md overflow-hidden">
      <div
        className="h-full rounded-md transition-all duration-700"
        style={{ width: `${(value / max) * 100}%`, background: color }}
      />
    </div>
  )
}

export default function Productivity() {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['productivity', user?.sessionId],
    queryFn: () => getProductivity(user.sessionId),
    enabled: !!user,
    refetchInterval: 10 * 60_000,
  })

  if (isLoading) return (
    <div className="p-6 space-y-4 max-w-2xl">
      {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
    </div>
  )

  if (isError) return (
    <div className="p-6 text-center text-sm text-muted">
      <p>Failed to load productivity data</p>
      <button onClick={() => refetch()} className="btn-outline text-xs mt-3 py-1 px-3">Retry</button>
    </div>
  )

  const { score, analysis, recommendations, meeting_load, focus_time_available } = data || {}
  const meetingPct = Math.round((meeting_load || 0) * 100)
  const focusH = Math.floor((focus_time_available || 0) / 60)
  const focusM = (focus_time_available || 0) % 60

  return (
    <div className="p-6 max-w-2xl space-y-4">
      {/* Score card */}
      <div className="bg-white border border-border rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={score} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary mb-1">Today's productivity score</p>
          <p className="text-xs text-muted leading-relaxed">{analysis}</p>
          <div className="flex gap-4 mt-4">
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Focus time available</p>
              <p className="text-sm font-bold text-primary">{focusH}h {focusM}m</p>
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wide mb-1">Meeting load</p>
              <p className="text-sm font-bold text-primary">{meetingPct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="bg-white border border-border rounded-2xl shadow-sm p-4">
        <p className="text-xs font-semibold text-primary mb-4">Day breakdown</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[11px] text-muted mb-1">
              <span>Focus time</span>
              <span>{focusH}h {focusM}m</span>
            </div>
            <Bar value={focus_time_available || 0} max={480} color="#16a34a" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-muted mb-1">
              <span>Meeting load</span>
              <span>{meetingPct}%</span>
            </div>
            <Bar value={meetingPct} max={100} color={meetingPct > 60 ? '#dc2626' : '#f97316'} />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-muted mb-1">
              <span>Overall score</span>
              <span>{score}/100</span>
            </div>
            <Bar value={score || 0} max={100} color={score >= 70 ? '#16a34a' : score >= 40 ? '#f97316' : '#dc2626'} />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations?.length > 0 && (
        <div className="bg-white border border-border rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-semibold text-primary">AI Recommendations</p>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-muted leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
