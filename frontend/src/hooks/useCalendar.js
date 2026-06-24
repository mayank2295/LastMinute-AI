import { useQuery } from '@tanstack/react-query'
import { getCalendarEvents } from '../services/api'

export function useCalendar(sessionId, days = 7) {
  return useQuery({
    queryKey: ['calendar', sessionId, days],
    queryFn: () => getCalendarEvents(sessionId, days),
    enabled: !!sessionId,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    select: (data) => data.events || [],
  })
}
