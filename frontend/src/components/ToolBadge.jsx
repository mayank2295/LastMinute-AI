import { Check, Calendar, Grid2x2, Clock, Bell } from 'lucide-react'

const TOOL_META = {
  get_upcoming_deadlines:  { icon: Calendar,  color: 'text-blue-700  bg-blue-50  border-blue-200',  label: (r) => `${r?.count ?? '?'} events fetched` },
  create_calendar_event:   { icon: Calendar,  color: 'text-accent-text bg-accent-light border-accent-border', label: (r) => r?.title ? `Created: ${r.title}` : 'Event created' },
  prioritize_tasks:        { icon: Grid2x2,   color: 'text-purple-700 bg-purple-50 border-purple-200', label: (r) => `${r?.count ?? '?'} tasks prioritized` },
  suggest_time_blocks:     { icon: Clock,     color: 'text-orange-700 bg-orange-50 border-orange-200', label: (r) => `${r?.count ?? '?'} focus blocks found` },
  set_escalating_reminder: { icon: Bell,      color: 'text-amber-700  bg-amber-50  border-amber-200', label: () => 'Reminders set: 24h · 2h · 30min' },
}

export default function ToolBadge({ toolCall }) {
  const meta = TOOL_META[toolCall.tool]
  if (!meta) return null
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${meta.color}`}>
      <Check className="w-3 h-3" />
      {meta.label(toolCall.result)}
    </span>
  )
}
