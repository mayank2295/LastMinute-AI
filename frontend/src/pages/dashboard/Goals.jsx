import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Target, Flame, Plus, Trash2, Sparkles, Check, CalendarDays, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StreakCalendar from '../../components/StreakCalendar'
import {
  getGoals, createGoal, updateGoal, deleteGoal, breakdownGoal,
  getHabits, createHabit, checkinHabit, deleteHabit,
} from '../../services/api'

const todayUTC = () => new Date().toISOString().slice(0, 10)

function daysLeft(dateStr) {
  if (!dateStr) return null
  const d = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return d
}

// ─── Goals ──────────────────────────────────────────────────────────────────
function GoalCard({ goal, sid, qc }) {
  const inval = () => qc.invalidateQueries({ queryKey: ['goals', sid] })
  const ms = goal.milestones || []
  const done = ms.filter(m => m.done).length
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0
  const dleft = daysLeft(goal.target_date)

  const breakdown = useMutation({ mutationFn: () => breakdownGoal(sid, goal.id), onSuccess: inval })
  const remove    = useMutation({ mutationFn: () => deleteGoal(sid, goal.id), onSuccess: inval })
  const toggle    = useMutation({
    mutationFn: (i) => {
      const next = ms.map((m, idx) => idx === i ? { ...m, done: !m.done } : m)
      return updateGoal(sid, goal.id, { milestones: next })
    },
    onSuccess: inval,
  })

  return (
    <div className="bg-white border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-primary">{goal.title}</h3>
          {goal.motivation && <p className="text-sm text-muted mt-0.5">“{goal.motivation}”</p>}
          {goal.target_date && (
            <p className="text-xs text-muted mt-1 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {goal.target_date}{dleft != null && ` · ${dleft >= 0 ? `${dleft} days left` : `${-dleft} days over`}`}
            </p>
          )}
        </div>
        <button onClick={() => remove.mutate()} className="text-gray-400 hover:text-red-500" title="Delete goal">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* progress */}
      {ms.length > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>{done}/{ms.length} milestones</span><span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-subtle overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 space-y-1.5">
            {ms.map((m, i) => (
              <button key={i} onClick={() => toggle.mutate(i)}
                className="w-full flex items-center gap-2.5 text-left text-sm group">
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${m.done ? 'bg-accent border-accent' : 'border-gray-300'}`}>
                  {m.done && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className={m.done ? 'line-through text-muted' : 'text-primary'}>{m.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {ms.length === 0 && (
        <button onClick={() => breakdown.mutate()} disabled={breakdown.isPending}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text bg-accent-light border border-accent-border rounded-lg px-3 py-1.5 hover:opacity-90 disabled:opacity-50">
          <Sparkles className="w-3.5 h-3.5" />
          {breakdown.isPending ? 'Gemini is planning…' : 'Break into steps with AI'}
        </button>
      )}
    </div>
  )
}

function AddGoal({ sid, qc }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [why, setWhy] = useState('')
  const add = useMutation({
    mutationFn: () => createGoal(sid, { title, target_date: date, motivation: why }),
    onSuccess: () => { setTitle(''); setDate(''); setWhy(''); setOpen(false); qc.invalidateQueries({ queryKey: ['goals', sid] }) },
  })
  if (!open) return (
    <button onClick={() => setOpen(true)} className="w-full border border-dashed border-border rounded-2xl p-4 text-sm text-muted hover:text-primary hover:border-accent-border flex items-center justify-center gap-2">
      <Plus className="w-4 h-4" /> Add a goal
    </button>
  )
  return (
    <form onSubmit={e => { e.preventDefault(); if (title.trim()) add.mutate() }}
      className="bg-white border border-border rounded-2xl p-4 space-y-2">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you want to achieve?"
        className="w-full text-sm bg-transparent border border-border rounded-lg px-3 py-2 text-primary" />
      <div className="flex gap-2">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-sm bg-transparent border border-border rounded-lg px-3 py-2 text-primary" />
        <input value={why} onChange={e => setWhy(e.target.value)} placeholder="Why it matters (optional)"
          className="flex-1 text-sm bg-transparent border border-border rounded-lg px-3 py-2 text-primary" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={add.isPending || !title.trim()} className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          {add.isPending ? 'Adding…' : 'Add goal'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm px-4 py-2 rounded-lg border border-border text-primary hover:bg-subtle">Cancel</button>
      </div>
    </form>
  )
}

// ─── Habits ─────────────────────────────────────────────────────────────────
function HabitRow({ habit, sid, qc, defaultOpen = false }) {
  const inval = () => qc.invalidateQueries({ queryKey: ['habits', sid] })
  const [open, setOpen] = useState(defaultOpen)
  const doneToday = habit.last_checkin === todayUTC()
  const checkin = useMutation({ mutationFn: () => checkinHabit(sid, habit.id), onSuccess: inval })
  const remove  = useMutation({ mutationFn: () => deleteHabit(sid, habit.id), onSuccess: inval })

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 w-16 flex-shrink-0" title="View streak calendar">
          <Flame className={`w-5 h-5 ${habit.current_streak > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
          <span className="font-bold text-primary">{habit.current_streak || 0}</span>
        </button>
        <button onClick={() => setOpen(o => !o)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-primary truncate flex items-center gap-1">
            {habit.title}
            <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
          </p>
          <p className="text-xs text-muted">Best streak: {habit.longest_streak || 0} · {habit.total_checkins || 0} total</p>
        </button>
        <button onClick={() => !doneToday && checkin.mutate()} disabled={doneToday || checkin.isPending}
          className={`text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 flex-shrink-0 ${doneToday ? 'bg-accent-light text-accent-text border border-accent-border' : 'btn-primary'}`}>
          <Check className="w-3.5 h-3.5" /> {doneToday ? 'Done today' : 'Mark done'}
        </button>
        <button onClick={() => remove.mutate()} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Delete habit">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && <StreakCalendar dates={habit.checkin_dates || []} startDate={habit.created_at} />}
    </div>
  )
}

function AddHabit({ sid, qc }) {
  const [title, setTitle] = useState('')
  const add = useMutation({
    mutationFn: () => createHabit(sid, { title }),
    onSuccess: () => { setTitle(''); qc.invalidateQueries({ queryKey: ['habits', sid] }) },
  })
  return (
    <form onSubmit={e => { e.preventDefault(); if (title.trim()) add.mutate() }} className="flex gap-2">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New daily habit (e.g. Read 20 min)"
        className="flex-1 text-sm bg-white border border-border rounded-lg px-3 py-2 text-primary" />
      <button type="submit" disabled={add.isPending || !title.trim()} className="btn-primary text-sm px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
        <Plus className="w-4 h-4" /> Add
      </button>
    </form>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function Goals() {
  const { user } = useAuth()
  const sid = user?.sessionId
  const qc = useQueryClient()

  const { data: goalsData } = useQuery({ queryKey: ['goals', sid], queryFn: () => getGoals(sid), enabled: !!sid })
  const { data: habitsData } = useQuery({ queryKey: ['habits', sid], queryFn: () => getHabits(sid), enabled: !!sid })
  const goals = goalsData?.goals || []
  const habits = habitsData?.habits || []

  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">
      {/* Goals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-accent" />
          <h1 className="text-xl font-bold text-primary">Goals</h1>
        </div>
        <p className="text-sm text-muted mb-4">Set what matters, and let Gemini break it into an actionable plan.</p>
        <div className="space-y-3">
          {goals.map(g => <GoalCard key={g.id} goal={g} sid={sid} qc={qc} />)}
          <AddGoal sid={sid} qc={qc} />
        </div>
      </section>

      {/* Habits */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-bold text-primary">Habits</h2>
        </div>
        <p className="text-sm text-muted mb-4">Build momentum — check in daily and keep your streak alive.</p>
        <div className="space-y-3">
          {habits.map((h, i) => <HabitRow key={h.id} habit={h} sid={sid} qc={qc} defaultOpen={i === 0} />)}
          <AddHabit sid={sid} qc={qc} />
        </div>
      </section>
    </div>
  )
}
