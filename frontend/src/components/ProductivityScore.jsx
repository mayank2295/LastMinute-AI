import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { TrendingUp, Clock, Users, Lightbulb } from 'lucide-react'
import { getProductivity } from '../services/api'

function ScoreArc({ score }) {
  const radius = 28
  const circ = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ

  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444'

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="flex-shrink-0">
      <circle cx="40" cy="40" r={radius} fill="none" stroke="#1f1f42" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={radius}
        fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text x="40" y="45" textAnchor="middle" fill="white" fontSize="16" fontWeight="700">
        {score}
      </text>
    </svg>
  )
}

export default function ProductivityScore({ sessionId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['productivity', sessionId],
    queryFn: () => getProductivity(sessionId),
    enabled: !!sessionId,
    refetchInterval: 10 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="w-10 h-10 rounded-full bg-panel-light animate-pulse" />
        <div className="space-y-1">
          <div className="h-2 bg-panel-light rounded w-24 animate-pulse" />
          <div className="h-2 bg-panel-light rounded w-16 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { score, analysis, recommendations, meeting_load, focus_time_available } = data

  return (
    <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
      <ScoreArc score={score} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-blue-glow" />
          <span className="text-xs font-semibold text-white">Productivity Score</span>
        </div>
        <p className="text-xs text-text-muted mb-2">{analysis}</p>

        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Users className="w-3 h-3" />
            Meeting load: {Math.round(meeting_load * 100)}%
          </span>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            Focus: {focus_time_available}m free
          </span>
        </div>
      </div>

      {recommendations?.length > 0 && (
        <div className="hidden lg:flex flex-col gap-1 max-w-xs">
          {recommendations.slice(0, 2).map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 text-yellow-note flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-snug">{r}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
