import { useState } from 'react'
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const DONE_BG = 'rgba(22,163,74,0.95)'      // accent green
const MISS_BG = 'rgba(239,68,68,0.12)'      // subtle red, theme-safe
const MISS_FG = 'rgba(239,68,68,0.85)'

const iso = (d) => d.toISOString().slice(0, 10)
const todayUTC = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function computeStreaks(set) {
  const t = todayUTC()
  let cur = 0
  const d = new Date(t)
  if (!set.has(iso(d))) d.setUTCDate(d.getUTCDate() - 1) // alive if yesterday done
  while (set.has(iso(d))) { cur++; d.setUTCDate(d.getUTCDate() - 1) }
  let max = 0
  for (const ds of set) {
    const dt = new Date(ds + 'T00:00:00Z')
    const prev = new Date(dt); prev.setUTCDate(prev.getUTCDate() - 1)
    if (set.has(iso(prev))) continue
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
  const startWeekday = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(Date.UTC(view.y, view.m, day)))

  const prevMonth = () => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })
  const nextMonth = () => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })

  const cell = (d, i) => {
    const baseCls = 'aspect-square rounded-md flex items-center justify-center text-xs font-medium'
    if (!d) return <div key={i} />
    const ds = iso(d)
    const isToday = ds === iso(t)
    if (set.has(ds)) {
      return <div key={i} className={baseCls} style={{ background: DONE_BG, color: '#fff' }} title={`${ds} — completed`}>{d.getUTCDate()}</div>
    }
    const missed = d < t && (!startMid || d >= startMid)
    if (missed) {
      return <div key={i} className={baseCls} style={{ background: MISS_BG, color: MISS_FG }} title={`${ds} — missed`}>{d.getUTCDate()}</div>
    }
    return (
      <div key={i} className={`${baseCls} text-muted ${isToday ? 'ring-1 ring-accent-border' : ''}`}>{d.getUTCDate()}</div>
    )
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-muted hover:text-primary p-1 rounded hover:bg-subtle" aria-label="Previous month"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-semibold text-primary">{MONTHS[view.m]} {view.y}</span>
        <button onClick={nextMonth} className="text-muted hover:text-primary p-1 rounded hover:bg-subtle" aria-label="Next month"><ChevronRight className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {DAYS.map(d => <div key={d} className="text-[10px] font-semibold text-muted pb-1">{d}</div>)}
        {cells.map((d, i) => cell(d, i))}
      </div>

      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-subtle border border-border rounded-lg px-2.5 py-1 text-sm text-primary">
            <Flame className="w-3.5 h-3.5 text-orange-500" /> Current <span className="font-bold">{cur}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 bg-subtle border border-border rounded-lg px-2.5 py-1 text-sm text-primary">
            Best <span className="font-bold">{max}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: DONE_BG }} /> Done</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: MISS_BG }} /> Missed</span>
        </div>
      </div>
    </div>
  )
}
