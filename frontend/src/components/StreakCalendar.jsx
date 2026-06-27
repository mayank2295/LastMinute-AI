import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const iso = (d) => d.toISOString().slice(0, 10)
const todayUTC = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function computeStreaks(set) {
  const t = todayUTC()
  // current streak — alive if today or yesterday is checked
  let cur = 0
  const d = new Date(t)
  if (!set.has(iso(d))) d.setUTCDate(d.getUTCDate() - 1)
  while (set.has(iso(d))) { cur++; d.setUTCDate(d.getUTCDate() - 1) }
  // longest run
  let max = 0
  for (const ds of set) {
    const dt = new Date(ds + 'T00:00:00Z')
    const prev = new Date(dt); prev.setUTCDate(prev.getUTCDate() - 1)
    if (set.has(iso(prev))) continue // only count from a run's start
    let run = 1
    const nxt = new Date(dt); nxt.setUTCDate(nxt.getUTCDate() + 1)
    while (set.has(iso(nxt))) { run++; nxt.setUTCDate(nxt.getUTCDate() + 1) }
    max = Math.max(max, run)
  }
  return { cur, max }
}

export default function StreakCalendar({ dates = [], startDate }) {
  const set = new Set(dates)
  const t = todayUTC()
  const [view, setView] = useState(() => ({ y: t.getUTCFullYear(), m: t.getUTCMonth() }))
  const { cur, max } = computeStreaks(set)

  const start = startDate ? new Date(startDate) : null
  const startMid = start ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) : null

  const first = new Date(Date.UTC(view.y, view.m, 1))
  const startWeekday = (first.getUTCDay() + 6) % 7 // Monday = 0
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(Date.UTC(view.y, view.m, day)))

  const prevMonth = () => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })
  const nextMonth = () => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })

  const render = (d) => {
    if (!d) return null
    const ds = iso(d)
    if (set.has(ds)) return <span title={ds}>🔥</span>
    const isPast = d < t
    const afterStart = !startMid || d >= startMid
    if (isPast && afterStart) return <span title={`${ds} — missed`} className="opacity-80">😭</span>
    return <span className="text-muted text-xs">{d.getUTCDate()}</span>
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-muted hover:text-primary p-1" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-semibold text-primary">{MONTHS[view.m]} {view.y}</span>
        <button onClick={nextMonth} className="text-muted hover:text-primary p-1" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map(d => <div key={d} className="text-[10px] font-semibold text-muted pb-1">{d}</div>)}
        {cells.map((d, i) => (
          <div key={i} className="aspect-square flex items-center justify-center text-base leading-none">{render(d)}</div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-sm">
        <span className="inline-flex items-center gap-1.5 bg-subtle border border-border rounded-lg px-2.5 py-1 text-primary">
          Current <span className="font-bold text-orange-500">🔥 {cur}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 bg-subtle border border-border rounded-lg px-2.5 py-1 text-primary">
          Max <span className="font-bold">{max}</span>
        </span>
      </div>
    </div>
  )
}
