# LastMinute AI — Technical Guide

A complete walkthrough of **what the project is, how every part works, and how it
was built and deployed on Google Cloud.** Read this once and you'll understand the
entire system end to end.

---

## 1. What it is

LastMinute AI is an **AI productivity agent** for the "Last-Minute Life Saver"
problem statement. Instead of passive reminders, it **proactively** reads your
Google Calendar, decides what's most urgent, and **takes action for you** — planning
your day, auto-blocking focus time on your real calendar, prioritising tasks, and
escalating reminders before deadlines slip.

- **Live app:** https://lastminute-ai-ummt2blwla-el.a.run.app
- **Stack in one line:** React frontend + FastAPI backend + **Google Gemini** AI,
  on **Google Cloud Run**, with **Google Calendar**, **Firebase Firestore**,
  **Cloud Scheduler**, and **Secret Manager**.

---

## 2. Architecture at a glance

```
                    ┌─────────────────────────────────────────────┐
   Browser  ──────▶ │  Google Cloud Run  (one container)          │
  (React SPA)       │                                             │
                    │  FastAPI (Python)                           │
                    │   ├── serves the built React app (static)   │
                    │   └── /api/* endpoints                      │
                    │            │                                │
                    │            ├──▶ Google Gemini  (AI engine)  │
                    │            ├──▶ Google Calendar API         │
                    │            ├──▶ Firebase Firestore  (data)  │
                    │            └──▶ Web Push (VAPID)            │
                    └─────────────────────────────────────────────┘
                              ▲                         ▲
              Google OAuth 2.0│         Secret Manager  │  (Firebase key)
                              │         Cloud Scheduler─┘  (every 5 min → reminders)
```

The frontend and backend are **one deployable unit**: the React app is compiled to
static files and served by the same FastAPI process that exposes the API. One
container, one URL.

---

## 3. Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, TanStack Query, React Router | Fast SPA, animations, data caching |
| Backend | Python 3.11, FastAPI, Uvicorn | Async API + serves the SPA |
| AI engine | **Google Gemini 2.0 Flash** (`google-generativeai`) | Chat agent, planning, extraction, vision |
| Database | **Firebase Firestore** | Stores sessions, tasks, reminders, activity |
| Calendar | **Google Calendar API v3** | Read/create events, find free time |
| Auth | **Google OAuth 2.0** | Sign-in + scoped calendar access |
| Notifications | Web Push API + VAPID | Browser push reminders |
| Hosting | **Google Cloud Run** | Serverless container hosting |
| Build | **Google Cloud Build** | Builds the container on deploy |
| Secrets | **Google Secret Manager** | Firebase private key |
| Automation | **Google Cloud Scheduler** | Fires reminders server-side |

---

## 4. The Google technologies (and a naming clarification)

> **Important:** This project uses **Google AI Studio**, *not* "Android Studio."
> Android Studio is for building Android phone apps — we did **not** use it (this is a
> web app). **Google AI Studio** (https://aistudio.google.com) is where you create the
> **Gemini API key** and test Gemini models. When you talk to judges, say **"Google AI
> Studio / Gemini,"** not "Android Studio."

How each Google service is used:

1. **Google Gemini 2.0 Flash** — the brain of the app. Powers the conversational
   agent (with function calling), the daily planner, the brain-dump task extractor,
   and the image (Vision) scanner. The Gemini API key comes from **Google AI Studio**.
2. **Google Calendar API v3** — reads your real events, creates events and focus
   blocks (with email + popup reminders), and computes free/busy gaps for scheduling.
3. **Google OAuth 2.0** — sign in with Google; grants scoped Calendar + profile
   access. No passwords are ever stored.
4. **Firebase Firestore** — NoSQL cloud database for all app data.
5. **Google Cloud Run** — runs the container; scales to zero when idle.
6. **Google Cloud Build** — turns the source into a container image on every deploy.
7. **Google Secret Manager** — stores the Firebase service-account private key,
   injected into Cloud Run at runtime (never committed to git).
8. **Google Cloud Scheduler** — an external "alarm clock" that calls the app every 5
   minutes so it can send deadline reminders autonomously, even when no one is using it.

---

## 5. How the AI works

**Engine: Google Gemini 2.0 Flash.** Everything intelligent in the app is a Gemini call.

- **Chat agent (function calling).** When you type a request, Gemini decides which of
  5 "tools" to call, the backend executes the real action, feeds the result back, and
  Gemini replies. Tools: `create_calendar_event`, `get_upcoming_deadlines`,
  `prioritize_tasks`, `suggest_time_blocks`, `set_escalating_reminder`. This is what
  makes it an **agent** — it doesn't just talk, it acts. *(Code: `gemini_agent.py`.)*
- **Plan My Day, Brain Dump, Briefing, Vision** — go through a small AI layer
  (`ai_provider.py`) that calls Gemini for text and image understanding.
- **Resilience fallback.** If Gemini is ever unreachable or out of quota, the app
  automatically falls back to a secondary model so the demo never hard-fails. This is
  a reliability mechanism only; the product engine is Gemini.

> **Development tooling note:** the codebase itself was written and debugged with the
> help of an **AI coding assistant** (used as a pair-programmer / bug-solver during
> development). That is a *build-time* tool — it is not part of the running product.

---

## 6. Every feature — how it works

**Authentication (Google OAuth 2.0)** — Clicking "Sign in with Google" hits
`/api/auth/login`, which returns a Google consent URL. After you approve, Google
redirects to `/api/auth/callback/google`; the backend exchanges the code for tokens,
reads your profile + **calendar timezone**, and stores a session in Firestore. The
frontend keeps the session id in `localStorage`.

**Demo Mode (no login)** — "Try live demo" calls `/api/demo/start`, which seeds
realistic tasks and serves sample calendar events. Judges experience the full app
**without the Google "unverified app" warning** (that warning only appears on real
sign-in and requires weeks-long Google verification to remove).

**Dashboard + Mission Control status bar** — A persistent bar reads your nearest
deadline and changes colour by urgency, pulsing red when something is within 2 hours.

**Plan My Day (the agentic centrepiece)** — `/api/plan/{id}` has Gemini read your
calendar + open tasks, write a short action plan, and **auto-create a focus block in
your largest free gap** on your real Google Calendar. It also **auto-runs once per
day** when you open the dashboard — the agent greets you with a plan unprompted.

**Brain Dump** — Paste a messy paragraph; `/api/braindump/{id}` has Gemini extract
each task, infer deadlines, estimate effort, and prioritise them.

**Gemini Vision (Scan)** — Upload a photo of a syllabus/timetable; `/api/vision/{id}`
sends the image to Gemini Vision, which extracts every deadline into tasks.

**Game Plan** — A smart, ranked action queue (Overdue → Today → Tomorrow → This week)
with a "Start here" recommendation. It *tells you what to do next* instead of making
you sort a matrix. One-tap Focus and Done on every task.

**My Tasks** — Full task list with an add-task modal (title, deadline, priority,
estimate, "add to Google Calendar" toggle), filters, complete/delete.

**Focus Timer** — Pomodoro / Deep Work / Sprint timer; completed sessions are saved
to Firestore and feed the productivity score.

**Reminders (escalating)** — When a reminder is set, the app sends browser push
notifications at **24h → 2h → 1h → 30 min** before the deadline. Created calendar
events also carry a **60-minute email + popup reminder**, so Google emails you "1 hour
left." The 5-minute **Cloud Scheduler** job drives this server-side.

**Productivity score** — Computed from completion rate, focus sessions, calendar
load, and overdue tasks (`task_engine.py`).

**Agent Activity Log** — A live feed on the dashboard showing what the agent did on
its own ("Generated your daily plan", "Sent 1-hour alert…") — visible proof of autonomy.

**Polish** — Dark/light theme toggle (whole app), a skippable guided tour for first-
time visitors, Framer Motion animations, and timezone-correct time display.

**Timezone handling** — Times are rendered in your **Google Calendar's timezone** (not
the browser's), so the website always matches Google Calendar.

---

## 7. Data model (Firestore collections)

| Collection | What it holds |
|------------|---------------|
| `sessions` | user id, OAuth tokens, name, timezone, push subscription |
| `tasks` | title, deadline, priority/quadrant, estimate, source, completed |
| `conversations` | chat history per session |
| `reminders` | task, deadline, push subscription, which tiers were sent |
| `focus_sessions` | completed Pomodoro/focus sessions |
| `activities` | the autonomous-action feed |

---

## 8. API reference (selected)

| Method & path | Purpose |
|---|---|
| `GET /health` | Liveness check |
| `GET /api/auth/login` → `GET /api/auth/callback/google` | OAuth flow |
| `GET /api/me` | Current user (name, email, timezone) |
| `POST /api/demo/start` | Seed + enter Demo Mode |
| `POST /api/chat` (SSE) | Conversational agent (Gemini function calling) |
| `POST /api/plan/{id}` | Plan My Day (autonomous) |
| `POST /api/braindump/{id}` | Text → structured tasks |
| `POST /api/vision/{id}` | Image → tasks (Gemini Vision) |
| `GET/POST/PUT/DELETE /api/tasks/...` | Task CRUD |
| `GET /api/calendar/events/{id}` · `POST` · `/gaps` | Calendar read/create/free-time |
| `POST /api/focus-sessions/{id}` · `GET` | Focus sessions |
| `GET /api/productivity/{id}` | Productivity score |
| `GET /api/activities/{id}` | Agent activity feed |
| `POST /api/cron/check-reminders` | Reminder checker (called by Cloud Scheduler) |

---

## 9. How it was deployed (CLI, step by step)

The whole app runs as **one container on Google Cloud Run**. Here is exactly what
happens, so you understand it even though it was deployed from the command line.

**The container (`backend/Dockerfile`):** starts from `python:3.11-slim`, installs
`requirements.txt`, copies the backend code **and the built frontend (`backend/static`)**,
and runs `uvicorn main:app --port 8080`.

**One-command deploy (`deploy.ps1`):**
1. **Build the frontend** — `npm run build` compiles React into `frontend/dist`.
2. **Bundle it** — copies `frontend/dist` → `backend/static` so FastAPI serves it.
3. **Deploy** — `gcloud run deploy lastminute-ai --source . ...` from the `backend`
   folder. This uploads the source, **Google Cloud Build** builds the Docker image,
   and **Cloud Run** rolls out a new revision.
   - Configuration: region `asia-south1`, project `lastminuteai`, port `8080`,
     512 MiB RAM, `--min-instances 0` (scale to zero), `--allow-unauthenticated`.
   - **Environment variables** (OAuth client, Firebase ids, VAPID keys, Gemini key,
     URLs) are passed with `--set-env-vars`, read from `backend/.env` — never hardcoded.
   - **The Firebase private key** is *not* an env var; it's stored in **Secret Manager**
     and mounted with `--set-secrets FIREBASE_PRIVATE_KEY=firebase-private-key:latest`.

**One-time setup that was also done via CLI:**
- Enabled the APIs: `run`, `cloudbuild`, `secretmanager`, `cloudscheduler`.
- Stored the Firebase key: `gcloud secrets create firebase-private-key ...`.
- Granted the Cloud Run runtime service account `secretmanager.secretAccessor`.
- Registered the live URL in the **Google OAuth consent screen** as an authorized
  redirect URI (`<URL>/api/auth/callback/google`).
- Created the Cloud Scheduler job `lastminute-reminders` (every 5 min →
  `/api/cron/check-reminders`).

**To redeploy after any change:** just run `.\deploy.ps1` from the repo root.

---

## 10. Local development

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env        # fill in keys
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Required keys in `backend/.env`: `GEMINI_API_KEY` (from Google AI Studio),
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (OAuth), `FIREBASE_PROJECT_ID` /
`FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`, and the VAPID keys.

---

## 11. Operating the app (cost control)

To keep cost at ~zero outside judging, two things are currently **off**:

| Control | Off (now) | On (for judging) |
|---|---|---|
| Always-warm instance | `--min-instances 0` (sleeps when idle, free) | `--min-instances 1` (instant load, billed) |
| Autonomous reminders | Scheduler job **paused** | Scheduler job **resumed** |

Turn **on** for judging day:
```bash
gcloud run services update lastminute-ai --region asia-south1 --project lastminuteai --min-instances 1
gcloud scheduler jobs resume lastminute-reminders --location asia-south1 --project lastminuteai
```
Turn **off** afterwards (swap `1`→`0`, `resume`→`pause`).

---

## 12. Security

- Secrets live in `backend/.env` (git-ignored) and **Google Secret Manager** — never
  committed. `.env.example` shows the required keys with empty values.
- OAuth tokens are stored per-session in Firestore and refreshed automatically.
- No passwords are handled; sign-in is delegated entirely to Google.

---

## 13. Repository map

```
lastminute-ai/
├── deploy.ps1            # one-command build + deploy to Cloud Run
├── README.md             # quick overview
├── SUBMISSION.md         # hackathon submission content
├── TECH_GUIDE.md         # this file
├── backend/
│   ├── main.py               # FastAPI app + all endpoints
│   ├── gemini_agent.py       # Gemini chat agent + Plan My Day + Brain Dump + Vision
│   ├── ai_provider.py        # Gemini text/vision wrapper (+ resilience fallback)
│   ├── calendar_service.py   # Google OAuth + Calendar read/create/gaps
│   ├── task_engine.py        # prioritisation + productivity score
│   ├── notification_service.py # escalating push reminders
│   ├── demo_data.py          # Demo Mode seed data
│   ├── database.py           # Firestore access layer
│   ├── models.py             # request/response schemas
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    └── src/
        ├── pages/            # Landing, Login, dashboard pages
        ├── components/       # Sidebar, ChatAgent, Tour, ThemeToggle, …
        ├── context/          # Auth + Theme providers
        └── services/         # API client + notifications
```
