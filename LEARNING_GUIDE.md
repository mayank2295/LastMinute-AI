# LastMinute AI — Learning & Presentation Guide

This guide is written to **teach you the project** so you can understand and present
it with confidence. It explains every concept in plain English (with analogies),
walks through how a request actually flows, and gives you a slide outline, a demo
script, and answers to the questions judges are most likely to ask.

> Companion docs: **TECH_GUIDE.md** (reference), **SUBMISSION.md** (what you submit),
> **README.md** (quick overview).

---

# PART A — Learn the building blocks

For each technology: *what it is*, *why we use it*, *how it's used here*, and
*how to explain it* if a judge asks.

### 1. React (the frontend)
- **What:** a JavaScript library for building user interfaces out of reusable
  "components" (a button, a card, a page).
- **Analogy:** Lego blocks. Each screen is built from small reusable blocks.
- **Here:** every screen (Landing, Dashboard, Game Plan, Focus Timer) is a React
  component. We use **Vite** to bundle it and **Tailwind CSS** for styling.
- **Say it:** "The frontend is a React single-page app — fast, component-based, and
  compiled to static files we serve from our backend."

### 2. FastAPI (the backend)
- **What:** a Python framework for building web APIs (the server that answers requests).
- **Analogy:** a waiter — the browser asks for something, FastAPI fetches it and brings
  it back.
- **Here:** `main.py` defines all the `/api/...` endpoints and also serves the built
  React app, so frontend + backend are one deployable unit.
- **Say it:** "The backend is a Python FastAPI service that exposes the API and serves
  the frontend from a single container."

### 3. Google Gemini (the AI engine)
- **What:** Google's large language model. We use **Gemini 2.0 Flash** via the
  `google-generativeai` library, with the API key from **Google AI Studio**.
- **Analogy:** a brilliant assistant who can read, reason, and — crucially — *use tools*.
- **Here:** Gemini powers the chat agent (function calling), Plan My Day, Brain Dump,
  and the Vision document scanner.
- **Say it:** "The intelligence is Google Gemini. It doesn't just chat — through
  function calling it decides which actions to take and we execute them."

### 4. Function calling (what makes it an *agent*)
- **What:** the model is given a list of "tools" (functions). Instead of replying with
  text, it can say *"call create_calendar_event with these arguments."* Our code runs
  the real function and gives the result back to Gemini.
- **Analogy:** giving the assistant a phone and a calendar — it can actually *do*
  things, not just advise.
- **Here:** 5 tools — create event, get deadlines, prioritise tasks, suggest time
  blocks, set reminders.
- **Say it:** "This is the difference between a chatbot and an agent — our AI takes
  real actions on the user's calendar."

### 5. Google OAuth 2.0 (sign-in)
- **What:** the "Sign in with Google" standard. The user approves access; Google gives
  us a token to act on their behalf — we never see their password.
- **Analogy:** a hotel key card — it opens specific doors (calendar, profile) without
  giving you the master key (password).
- **Here:** `calendar_service.py` handles the login redirect, token exchange, and
  automatic token refresh.

### 6. Google Calendar API (the real integration)
- **What:** Google's API to read and write a user's calendar.
- **Here:** we read upcoming events, create events and focus blocks (with reminders),
  and compute *free gaps* in the day to schedule focus time.
- **Say it:** "It's a two-way integration — we don't just display the calendar, the
  agent writes focus blocks onto it."

### 7. Firebase Firestore (the database)
- **What:** Google's NoSQL cloud database — stores data as documents in collections.
- **Analogy:** a set of labelled drawers (collections), each holding cards (documents).
- **Here:** collections for `sessions`, `tasks`, `reminders`, `focus_sessions`,
  `conversations`, and `activities`.

### 8. Google Cloud Run (hosting)
- **What:** a service that runs your app inside a container and **scales to zero** —
  it sleeps when idle and wakes on the first request.
- **Analogy:** a shop that opens automatically when a customer arrives and locks up
  when empty — you only pay while it's open.
- **Here:** our whole app (one container) runs here at the public URL.

### 9. Google Cloud Build (the build robot)
- **What:** turns your source code into a runnable container image when you deploy.
- **Here:** every `deploy.ps1` triggers Cloud Build to package the app.

### 10. Google Secret Manager (the vault)
- **What:** a secure store for secrets (passwords, keys).
- **Here:** the Firebase private key lives here, not in the code — Cloud Run reads it
  at runtime. This is why no secret is ever committed to GitHub.

### 11. Google Cloud Scheduler (the alarm clock)
- **What:** runs a job on a schedule (like a cron job).
- **Here:** every 5 minutes it "knocks" on `/api/cron/check-reminders` so the app can
  send deadline reminders **on its own**, even when nobody has it open. This is what
  makes the agent *autonomous*.

### 12. Web Push + VAPID (browser notifications)
- **What:** the standard for sending notifications to a browser even when the tab is
  closed. VAPID keys identify our server as the sender.
- **Here:** escalating reminders at 24h → 2h → 1h → 30 min before deadlines.

> **Naming note:** we use **Google AI Studio** (where the Gemini key comes from) —
> *not* "Android Studio," which is a tool for building Android phone apps. Say "AI
> Studio / Gemini."
>
> **On Claude:** an AI coding assistant (Claude) was used as a *pair-programmer and
> bug-solver to build and debug the code*. It is a development tool, not part of the
> running product — the product's AI is Google Gemini.

---

# PART B — How it actually works (request lifecycle)

**Example: the user types "I have a report due tomorrow at 5 PM, help me."**

1. **Browser → backend.** The React chat component sends the message to `POST /api/chat`.
2. **Backend → Gemini.** FastAPI loads the conversation history and the user's
   timezone, builds a system prompt, and sends everything to **Gemini** with the 5 tools.
3. **Gemini decides to act.** It returns a *function call*:
   `create_calendar_event(title="Report", start="tomorrow 16:00", end="17:00")`.
4. **Backend executes the real action.** `calendar_service.create_calendar_event`
   calls the **Google Calendar API** and the event appears on the user's real calendar.
5. **Result → Gemini.** The backend sends the result back; Gemini writes a human reply
   ("Done — I've blocked an hour tomorrow at 4 PM and set a reminder").
6. **Streaming → browser.** The reply streams back word-by-word (Server-Sent Events).
7. **Side effects.** The action is logged to the **Activity feed**, and React Query
   refreshes the task list, calendar, and score.

**Example: autonomous morning plan (no user action).**
Cloud Scheduler (or the once-a-day auto-trigger) calls Plan My Day → Gemini reads the
calendar → finds the biggest free gap → creates a focus block → logs it to the
Activity feed. The user wakes up to a plan they didn't ask for.

---

# PART C — Presentation / slide outline

Use this as your Google Slides structure (one bullet ≈ one slide).

1. **Title** — "LastMinute AI — your AI co-pilot for beating deadlines." Your name,
   the problem statement, the live link.
2. **The problem** — People miss deadlines because to-do apps are passive. They remind,
   they don't *act*.
3. **The insight** — In a panic you don't want a list — you want to be *told what to do
   and have it set up for you.*
4. **The solution** — An agent that reads your calendar and takes action: plans your
   day, blocks focus time, prioritises, and reminds — proactively.
5. **Live demo** — (see Part D script). Lead with Demo Mode so it just works.
6. **How it's agentic** — Function calling: the AI performs real calendar actions;
   Cloud Scheduler makes it act autonomously; the Activity Log proves it.
7. **Google tech** — Gemini, Calendar API, OAuth, Firestore, Cloud Run, Cloud
   Scheduler, Secret Manager — show the architecture diagram.
8. **What's innovative** — Gemini Vision (scan a syllabus into tasks), auto-scheduling
   into real calendar gaps, the "Game Plan" that tells you what to do next.
9. **Tech & deployment** — One container on Cloud Run, deployed via CLI + Cloud Build;
   secrets in Secret Manager.
10. **Impact + close** — "Other teams built an assistant you talk to. We built an agent
    that does your planning while you sleep."

---

# PART D — 90-second demo script

| Time | Do this | Say this |
|------|---------|----------|
| 0–10s | Open the landing page, click **Try live demo** | "No login needed — judges can try it instantly." |
| 10–30s | Dashboard loads; point at the **Plan my day** result + **Activity feed** | "It already planned my day and blocked focus time — automatically." |
| 30–50s | Open **Brain dump**, paste a messy paragraph, show extracted tasks | "I dump everything on my mind; Gemini turns it into prioritised tasks." |
| 50–65s | Open **Scan**, upload a syllabus image, show tasks appear | "It even reads a photo of my syllabus with Gemini Vision." |
| 65–80s | Open **Game Plan**; show ranked queue + "Start here" | "And it tells me exactly what to do next." |
| 80–90s | Pause on the dashboard | "Other teams built an assistant you talk to — we built an agent that acts for you." |

**Tip:** before presenting, turn the warm instance + scheduler back on (see TECH_GUIDE
§11) so it loads instantly and reminders fire live.

---

# PART E — Judge Q&A prep (with strong answers)

**Q: How is this different from ChatGPT / a to-do app?**
A: ChatGPT advises; a to-do app stores. Ours *acts* — through Gemini function calling
it creates calendar events, blocks focus time, and sets reminders on your real Google
Calendar, and via Cloud Scheduler it does this autonomously.

**Q: What makes it "agentic"?**
A: Three things — (1) function calling, so the AI performs real actions; (2) Cloud
Scheduler, so it acts without being prompted; (3) the Activity Log, which shows the
actions it took on its own.

**Q: Which Google technologies did you use, and how deeply?**
A: Gemini (the AI), Calendar API (two-way read/write + free-time analysis), OAuth 2.0,
Firestore, Cloud Run, Cloud Build, Cloud Scheduler, and Secret Manager. Remove any one
and a real feature breaks — they're load-bearing, not bolted on.

**Q: Is it actually deployed and working?**
A: Yes — it's live on Google Cloud Run with a public URL, and you can try the full
product in Demo Mode without logging in.

**Q: How do you handle security / the user's data?**
A: Sign-in is delegated to Google OAuth (no passwords). Tokens are stored per session
and refreshed automatically. The Firebase key is in Secret Manager, never in the code.

**Q: Why does Google show an "unverified app" warning?**
A: Because we request the sensitive Calendar scope; full Google verification takes
weeks. Demo Mode bypasses it entirely so it doesn't affect evaluation.

**Q: What was the hardest technical part?**
A: Making the agent's actions reliable — timezone-correct event creation, the OAuth
token refresh logic, and wiring autonomous behaviour through Cloud Scheduler so it
survives Cloud Run scaling to zero.

**Q: What would you build next?**
A: Per-user scheduled morning planning, two-way Google Tasks sync, and Gmail-sent
action-plan emails.

---

# PART F — Cheat sheet (memorise these)

- **One-liner:** "An AI agent that reads your Google Calendar and takes action to beat
  your deadlines — powered by Google Gemini on Google Cloud."
- **AI engine:** Google Gemini 2.0 Flash (key from Google AI Studio).
- **Agentic proof:** function calling + Cloud Scheduler + Activity Log.
- **Google services:** Gemini, Calendar API, OAuth, Firestore, Cloud Run, Cloud Build,
  Cloud Scheduler, Secret Manager.
- **Deployed:** one container on Cloud Run, built by Cloud Build, deployed via CLI.
- **Don't say "Android Studio"** — say **"Google AI Studio."**
