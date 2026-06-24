# LastMinute AI — Your Deadline Co-Pilot

> AI-powered productivity companion that connects to Google Calendar,
> detects upcoming deadlines, and proactively helps you complete tasks
> before it's too late.

Built for the **BlockseBlock National Hackathon 2026** — PS1: The Last-Minute Life Saver

---

## Features

- Real-time Google Calendar sync with live countdown timers
- Claude Haiku / Gemini 2.0 Flash agentic function calling (5 real tools)
- Autonomous morning briefing generated daily
- Escalating push notifications at 24h / 2h / 30min before deadline
- Eisenhower Priority Matrix with drag-and-drop reprioritization
- Pomodoro Focus Timer integrated with AI task list
- Voice input via Web Speech API
- Productivity score with AI-powered analysis
- Mission Control dashboard with urgency-colored event cards

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Engine | Claude Haiku (Anthropic) / Gemini 2.0 Flash |
| Calendar | Google Calendar API v3 |
| Auth | Google OAuth 2.0 |
| Database | Firebase Firestore |
| Backend | Python FastAPI + Uvicorn |
| Frontend | React 18 + Vite + Tailwind CSS |
| Deployment | Google Cloud Run |
| Notifications | Web Push API + VAPID |

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Cloud project with Calendar API enabled
- Firebase project with Firestore enabled
- Anthropic API key (or Gemini API key from Google AI Studio)

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your credentials
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### OAuth Setup
1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web Application)
3. Authorized origin: http://localhost:5173
4. Redirect URI: http://localhost:8000/api/auth/callback/google

---

## Google Technologies Used
- **Google Calendar API** — Real event sync and creation
- **Google OAuth 2.0** — Secure user authentication
- **Firebase Firestore** — Real-time cloud database
- **Google Cloud Run** — Production deployment

---

## Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## License
MIT
