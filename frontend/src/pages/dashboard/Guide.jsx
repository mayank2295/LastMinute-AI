import {
  Zap, CalendarCheck, MessageSquare, Brain, ScanLine, ListOrdered,
  Calendar, Timer, Bell, TrendingUp, PlayCircle, Sparkles, Target
} from 'lucide-react'

const STEPS = [
  { n: 1, title: 'Connect or try the demo', text: 'Sign in with Google to connect your real calendar, or click "Try live demo" on the landing page to explore with sample data — no login needed.' },
  { n: 2, title: 'Let the AI plan your day', text: 'On the dashboard, the agent reads your calendar and automatically builds a plan and blocks focus time. You can also click "Plan My Day" anytime.' },
  { n: 3, title: 'Execute with the Game Plan', text: 'Open Game Plan to see exactly what to do next, ranked by urgency. Just follow the list — the organising is done for you.' },
]

const FEATURES = [
  { icon: CalendarCheck, name: 'Plan My Day', what: 'The AI reads your calendar and tasks, writes a plan, and auto-creates a focus block in your largest free slot.', how: 'Runs once a day automatically — or click the "Plan My Day" card on the dashboard.' },
  { icon: MessageSquare, name: 'AI Chat (the agent)', what: 'A Google Gemini agent that takes real actions — it can create calendar events, prioritise tasks, find free time, and set reminders.', how: 'Type a request like "schedule my report tomorrow at 3 PM" in the chat box. It actually does it.' },
  { icon: Brain, name: 'Brain Dump', what: 'Turns a messy paragraph of everything on your mind into clean, dated, prioritised tasks.', how: 'Click "Brain dump", paste your text, and hit Extract tasks.' },
  { icon: ScanLine, name: 'Scan (Gemini Vision)', what: 'Reads a photo of a syllabus, timetable, or notes and turns the deadlines into tasks automatically.', how: 'Click "Scan", upload an image, and review the extracted tasks.' },
  { icon: ListOrdered, name: 'Game Plan', what: 'A ranked, time-bucketed action queue (Overdue → Today → Tomorrow → This week) that tells you the one thing to do next.', how: 'Open "Game Plan" in the sidebar and start with the "Start here" card.' },
  { icon: Target, name: 'Goals & Habits', what: 'Set a long-term goal and Gemini breaks it into milestones you can tick off; build daily habits and track your streak.', how: 'Open "Goals & Habits", add a goal then click "Break into steps with AI", and check in on habits daily.' },
  { icon: Calendar, name: 'Calendar', what: 'A live two-way view of your Google Calendar with deadline countdowns and urgency colours.', how: 'Open "Calendar" in the sidebar. Events created by the agent appear here and on your real Google Calendar.' },
  { icon: Timer, name: 'Focus Timer', what: 'A Pomodoro / Deep Work / Sprint timer; completed sessions feed your productivity score.', how: 'Open "Focus Timer", pick a mode, and start.' },
  { icon: Bell, name: 'Reminders', what: 'Escalating push alerts at 24h, 2h, 1h, and 30 minutes before each deadline — even when the app is closed.', how: 'Enable notifications in Settings; reminders are then sent automatically.' },
  { icon: TrendingUp, name: 'Productivity Score', what: 'A live score from your completion rate, focus sessions, and calendar load — real output, not vanity metrics.', how: 'See it in the top bar and on the Productivity page. Aim for 70+.' },
]

export default function Guide() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-primary">How to use LastMinute AI</h1>
          <p className="text-sm text-muted">Your deadline co-pilot — what it does and how to get the most from it.</p>
        </div>
      </div>

      {/* Purpose */}
      <section className="bg-accent-light border border-accent-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-accent-text" />
          <h2 className="text-sm font-bold text-accent-text">What it's for</h2>
        </div>
        <p className="text-sm text-primary leading-relaxed">
          When a deadline is hours away and your schedule is chaos, LastMinute AI is the assistant
          that <strong>acts for you</strong>. Instead of just holding a to-do list, it reads your
          Google Calendar, figures out what's most urgent, and <strong>takes action</strong> —
          building a plan, blocking focus time, prioritising tasks, and reminding you — all powered
          by Google Gemini. It turns your job from <em>organising</em> into simply <em>executing</em>.
        </p>
      </section>

      {/* Quick start */}
      <section>
        <h2 className="text-base font-bold text-primary mb-3">Quick start</h2>
        <div className="space-y-3">
          {STEPS.map(s => (
            <div key={s.n} className="flex gap-3 bg-white border border-border rounded-2xl shadow-sm p-4">
              <div className="w-7 h-7 rounded-full bg-accent text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{s.n}</div>
              <div>
                <p className="text-sm font-semibold text-primary">{s.title}</p>
                <p className="text-sm text-muted mt-0.5">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section>
        <h2 className="text-base font-bold text-primary mb-3">Features</h2>
        <div className="space-y-3">
          {FEATURES.map(f => (
            <div key={f.name} className="bg-white border border-border rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2.5 mb-1.5">
                <f.icon className="w-4.5 h-4.5 text-accent" style={{ width: 18, height: 18 }} />
                <h3 className="text-sm font-bold text-primary">{f.name}</h3>
              </div>
              <p className="text-sm text-muted">{f.what}</p>
              <p className="text-sm text-primary mt-1.5"><span className="font-semibold">How:</span> {f.how}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <section className="bg-white border border-border rounded-2xl shadow-sm p-5 flex items-start gap-3">
        <PlayCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-primary">New here? Take the guided tour.</p>
          <p className="text-sm text-muted mt-0.5">
            Click the <strong>?</strong> icon in the top bar anytime to replay the 30-second interactive walkthrough of the dashboard.
          </p>
        </div>
      </section>
    </div>
  )
}
