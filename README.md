# LastMinute AI — Mission Control for Your Deadlines

> AI-powered productivity companion for the BlockseBlock Hackathon (PS1: The Last-Minute Life Saver)

**Live stack:** React 18 + Vite · FastAPI · Gemini 2.0 Flash (function calling) · Google Calendar API (OAuth2)

---

## Features

| Feature | How |
|---------|-----|
| Real Google Calendar sync | OAuth2, live read + write |
| Gemini agentic chat | Function calling, multi-turn memory, tool execution |
| Eisenhower Priority Matrix | Auto-scored by urgency × importance |
| Escalating push reminders | 24h → 2h → 30min Web Push |
| Voice input | Web Speech API (Chrome/Edge) |
| Productivity Score (0–100) | Calendar load + task completion analysis |

---

## Quick Start

### 1. Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable APIs:
   - **Google Calendar API**
   - **People API** (for userinfo)
4. Go to **APIs & Services → Credentials → Create OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorised redirect URI: `http://localhost:8000/auth/callback`
5. Copy Client ID and Client Secret

### 2. Gemini API key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Copy it

### 3. VAPID keys for push notifications

```bash
pip install py-vapid
python -c "
from py_vapid import Vapid
v = Vapid()
v.generate_keys()
print('VAPID_PUBLIC_KEY=', v.public_key)
print('VAPID_PRIVATE_KEY=', v.private_key)
"
```

### 4. Configure environment

```bash
cd lastminute-ai
cp .env.example backend/.env
# Edit backend/.env with your real keys
```

### 5. Run backend

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs: http://localhost:8000/docs

### 6. Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Deployment (Google Cloud Run)

```bash
# Build and push image
gcloud builds submit --tag gcr.io/YOUR_PROJECT/lastminute-ai

# Deploy
gcloud run deploy lastminute-ai \
  --image gcr.io/YOUR_PROJECT/lastminute-ai \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=xxx,GOOGLE_CLIENT_ID=xxx,GOOGLE_CLIENT_SECRET=xxx,GOOGLE_REDIRECT_URI=https://YOUR_SERVICE_URL/auth/callback,VAPID_PUBLIC_KEY=xxx,VAPID_PRIVATE_KEY=xxx,FRONTEND_URL=https://YOUR_SERVICE_URL
```

Update your Google OAuth redirect URI to the Cloud Run URL in Google Console.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser                                                     │
│  ┌──────────┐ ┌──────────────────┐ ┌────────────────────┐  │
│  │ Calendar │ │  Chat (Gemini)   │ │  Priority Matrix   │  │
│  │ Sidebar  │ │  Streaming SSE   │ │  Eisenhower Board  │  │
│  └──────────┘ └──────────────────┘ └────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + SSE
┌──────────────────────────▼──────────────────────────────────┐
│  FastAPI Backend                                             │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  gemini_agent.py │  │  calendar_service.py             │ │
│  │  Gemini 2.0 Flash│  │  Google Calendar API (OAuth2)    │ │
│  │  Function Calling│  │  Read events + Create events     │ │
│  └──────────────────┘  └──────────────────────────────────┘ │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  task_engine.py  │  │  notification_service.py         │ │
│  │  Eisenhower score│  │  Web Push (VAPID) background loop│ │
│  └──────────────────┘  └──────────────────────────────────┘ │
│  SQLite (sessions · conversations · tasks · reminders)       │
└─────────────────────────────────────────────────────────────┘
```

## Gemini Function Calling Tools

| Tool | What it does |
|------|-------------|
| `create_calendar_event` | Creates a real event in Google Calendar |
| `get_upcoming_deadlines` | Fetches events from Calendar API |
| `prioritize_tasks` | Scores tasks via Eisenhower matrix |
| `suggest_time_blocks` | Finds calendar gaps for focus work |
| `set_escalating_reminder` | Schedules 24h/2h/30m push notifications |

## Environment Variables

See `.env.example` for all required variables.
