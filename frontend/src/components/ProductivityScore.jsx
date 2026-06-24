import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import { getProductivity } from '../services/api'

export default function ProductivityScore({ sessionId }) {
  const { data } = useQuery({
    queryKey:       ['productivity', sessionId],
    queryFn:        () => getProductivity(sessionId),
    enabled:        !!sessionId,
    refetchInterval: 10 * 60 * 1000,
  })

  if (!data) return null

  const { score } = data
  const color = score >= 70 ? 'text-green bg-green-light' :
                score >= 40 ? 'text-amber bg-amber-light' : 'text-red bg-red-light'

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${color}`}>
      <TrendingUp className="w-3.5 h-3.5" />
      Score {score}
    </div>
  )
}
