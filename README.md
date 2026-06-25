# LastMinute AI — Your Deadline Co-Pilot

> An autonomous, AI-powered productivity agent that connects to your Google
> Calendar, finds what's on fire, and proactively builds and executes your plan
> — before it's too late.

Built for the **BlockseBlock National Hackathon 2026** — PS1: The Last-Minute Life Saver

**Live app:** https://lastminute-ai-ummt2blwla-el.a.run.app
**Project Description (Google Doc):** https://docs.google.com/document/d/1z5qL-mFQ1diOUQeXJiTSeqDYk5I7xBLT/edit?usp=sharing
**Try instantly:** click **"Try live demo — no login"** on the landing page.

---

## Features

- **Plan My Day** — Google Gemini reads your calendar and auto-blocks focus time on your real Google Calendar (runs proactively, once per day, no click needed)
- **Agentic AI chat** — Google Gemini with function calling (5 real tools: create events, prioritise tasks, find free slots, set reminders, fetch deadlines)
- **Brain Dump** — paste a chaotic paragraph; Gemini extracts, dates, estimates, and prioritises every task
- **Smart Game Plan** — a ranked, time-bucketed action queue that tells you exactly what to do next (replaces the abstract priority matrix)
- **Live Google Calendar sync** with countdowns and urgency colours
- **Escalating push reminders** at 24h / 2h / 30 min before each deadline (Cloud Scheduler-driven)
- **Mission Control status bar** that pulses red within 2 hours of a deadline
- **Focus Timer** (Pomodoro / Deep Work / Sprint) with sessions saved to Firestore
- **Productivity score** from completion rate, focus sessions, and calendar load
- **Guided product tour**, **dark / light mode**, and **Demo Mode** (no login required)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Engine | **Google Gemini 2.0 Flash** (function calling) |
| Calendar | Google Calendar API v3 |
| Auth | Google OAuth 2.0 |
| Database | Google Firebase Firestore |
| Scheduling | Google Cloud Scheduler |
| Secrets | Google Secret Manager |
| Backend | Python FastAPI + Uvicorn |
| Frontend | React 18 + Vite + Tailwind CSS + Framer Motion |
| Deployment | Google Cloud Run (containerised) |
| Notifications | Web Push API + VAPID |

---

## Google Technologies Used

- **Google Gemini 2.0 Flash** — the core AI engine. Powers the agentic chat (function calling), the autonomous daily planner, the brain-dump task extractor, and the morning briefing.
- **Google Calendar API** — deep two-way integration: reads events, creates events, and computes free/busy gaps for automatic focus scheduling.
- **Google Cloud Run** — serverless container hosting the live production application.
- **Google Cloud Scheduler** — drives all autonomous behaviour (reminder checks and morning planning).
- **Firebase Firestore** — persistent store for sessions, tasks, conversations, reminders, and focus sessions.
- **Google Secret Manager** — secure storage of the Firebase service-account key.
- **Google OAuth 2.0** — secure sign-in and scoped Calendar access; no passwords stored.

---

## Local Setup

### Prerequisites
- Python 3.11+, Node.js 18+
- Google Cloud project with Calendar API enabled
- Firebase project with Firestore enabled
- **Gemini API key** from Google AI Studio (https://aistudio.google.com/apikey)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # add GEMINI_API_KEY, GOOGLE_CLIENT_ID/SECRET, Firebase + VAPID keys
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

### OAuth Setup
1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (Web)
2. Authorized origin: `http://localhost:5173`
3. Redirect URI: `http://localhost:8000/api/auth/callback/google`

---

## Deployment

Deployed to Google Cloud Run with one command: `.\deploy.ps1` (builds the frontend,
bundles it into the backend, and deploys via Cloud Build — reads `backend/.env`, no
secrets hardcoded). Full architecture and deployment walkthrough in **[TECH_GUIDE.md](./TECH_GUIDE.md)**.
Reference: https://ai.google.dev/gemini-api/docs/aistudio-deploying

---

## License
MIT
