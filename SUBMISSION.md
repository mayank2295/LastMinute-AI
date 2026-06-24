# LastMinute AI — Hackathon Submission

**BlockseBlock National Hackathon 2026**
**Problem Statement 1: The Last-Minute Life Saver**

---

## Submission Links

| Item | Link |
|------|------|
| **Deployed Application** (Google Cloud Run) | https://lastminute-ai-ummt2blwla-el.a.run.app |
| **GitHub Repository** | https://github.com/mayank2295/LastMinute-AI |
| **Project Description** (this document) | *(paste this content into a Google Doc and share "anyone with the link")* |

> **Tip for evaluators:** Click **"Try live demo — no login"** on the landing page to
> explore the full product instantly with realistic sample data — no Google sign-in required.

---

## Problem Statement Selected

**The Last-Minute Life Saver.**

Everyone has been there: a deadline is hours away, your calendar is chaos, and you
don't know where to start. Existing to-do apps are passive — they hold a list but
never tell you what to do *right now*, and generic AI chatbots give advice but can't
actually touch your schedule. The result is decision paralysis exactly when time is
shortest.

LastMinute AI is built for that moment of panic: a productivity agent that doesn't
wait to be asked. It reads your real Google Calendar, identifies what's most urgent,
and **takes action on your behalf** — planning your day, blocking focus time, and
escalating reminders — so you spend your remaining minutes executing, not organising.

---

## Solution Overview

LastMinute AI is an **autonomous, agentic productivity co-pilot** powered by
**Google Gemini** and the **Google Calendar API**, deployed on **Google Cloud Run**.

Unlike a chatbot you have to drive, LastMinute AI is proactive. Each day it
automatically reads your calendar, uses Gemini to write a personalised action plan,
and **auto-creates focus-time blocks directly on your real Google Calendar** — before
you even open the app. Throughout the day it escalates push reminders at 24-hour,
2-hour, and 30-minute thresholds via Google Cloud Scheduler, and a live "Mission
Control" status bar pulses red when a deadline is within two hours.

The agent is genuinely action-taking. Through Gemini's function calling it can create
calendar events, prioritise tasks into a smart queue, find free time slots, and set
reminders — all from natural language. A "Brain Dump" feature lets a panicking user
paste everything on their mind in plain text; Gemini extracts each task, infers
deadlines, estimates effort, and ranks them instantly.

Everything is built on Google's platform end to end: Gemini for intelligence,
Calendar API for real scheduling, Firestore for persistence, Secret Manager for
credentials, Cloud Scheduler for autonomy, and Cloud Run for hosting. The entire
application is live, deployed, and usable today — including a one-click Demo Mode so
anyone can experience it without signing in.

---

## Key Features

1. **Plan My Day (autonomous agent).** Google Gemini reads your calendar and open
   tasks, writes a concise action plan, and automatically blocks focus time in your
   largest free gap — on your real Google Calendar. Runs proactively once per day
   with no user action required.

2. **Agentic AI chat with function calling.** Ask in plain language ("schedule my
   report tomorrow at 3 PM") and Gemini actually does it — creating the event,
   prioritising tasks, finding free slots, or setting reminders through five real
   tools, not just describing what it would do.

3. **Brain Dump → structured plan.** Paste a chaotic paragraph of everything you
   need to do; Gemini extracts each task, infers deadlines, estimates effort, and
   prioritises them in seconds.

4. **Smart Game Plan.** A ranked, time-bucketed action queue (Overdue → Today →
   Tomorrow → This week) with a clear "Start here" recommendation — it tells you
   exactly what to do next instead of making you categorise tasks.

5. **Escalating reminders.** Browser push notifications fire at 24h, 2h, and 30 min
   before each deadline, driven reliably by Google Cloud Scheduler.

6. **Live Google Calendar sync.** Real events with live countdowns, overdue flags,
   and urgency colours, plus a timezone-correct scheduling engine.

7. **Mission Control status bar.** A persistent, live deadline indicator that pulses
   red within two hours of a deadline.

8. **Focus Timer & Productivity Score.** Pomodoro / Deep Work / Sprint timer with
   sessions saved to Firestore, feeding a productivity score computed from completion
   rate, focus time, and calendar load.

9. **Polished, accessible UX.** Guided onboarding tour (skippable), dark/light theme,
   Framer Motion animations, and a one-click **Demo Mode** that needs no login.

---

## Technologies Used

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, TanStack Query, React Router
- **Backend:** Python 3.11, FastAPI, Uvicorn
- **AI:** Google Gemini 2.0 Flash (function calling)
- **Data:** Google Firebase Firestore
- **Auth:** Google OAuth 2.0
- **Notifications:** Web Push API with VAPID
- **Infrastructure:** Google Cloud Run, Google Cloud Build, Google Cloud Scheduler, Google Secret Manager

---

## Google Technologies Utilized

- **Google Gemini 2.0 Flash** — the core intelligence of the product. Gemini powers
  the agentic chat (via function calling), the autonomous daily planner, the
  brain-dump task extractor, and the AI morning briefing. Every "smart" behaviour in
  the app is a Gemini call.

- **Google Calendar API v3** — deep, two-way integration. The app reads upcoming
  events, creates events and focus blocks, and computes free/busy gaps to schedule
  deep-work time automatically. This is not a read-only display — the agent writes to
  the user's real calendar.

- **Google Cloud Run** — the application is containerised and deployed on Cloud Run,
  serving the React frontend and FastAPI backend from a single managed, autoscaling
  service.

- **Google Cloud Scheduler** — powers all autonomous behaviour: periodic reminder
  checks and the scheduled daily-planning job, so the agent acts even when no one has
  the app open.

- **Firebase Firestore** — the persistence layer for user sessions, tasks,
  conversation history, reminders, and focus sessions, so all data survives across
  visits and devices.

- **Google Secret Manager** — securely stores the Firebase service-account private
  key, injected into Cloud Run at runtime rather than committed to source.

- **Google OAuth 2.0** — secure, scoped authentication. Users sign in with Google to
  grant Calendar access; no passwords are ever stored.

---

## How to Evaluate

1. Open the deployed link: https://lastminute-ai-ummt2blwla-el.a.run.app
2. Click **"Try live demo — no login"** to explore instantly, **or** **Sign in with
   Google** for the full experience with your own calendar.
3. On the dashboard, click **Plan my day** to watch Gemini build a plan, try
   **Brain dump** to convert messy text into tasks, and open **Game Plan** to see the
   ranked action queue.

*Note: signing in with a personal Google account shows a standard "unverified app"
notice because the app uses sensitive Calendar scopes (Google verification takes
several weeks). Demo Mode bypasses this entirely for evaluation.*
