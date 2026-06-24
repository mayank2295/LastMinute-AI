import os
import uuid
import json
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

import database
import calendar_service
import gemini_agent
import task_engine
import notification_service
from models import ChatRequest, CreateEventRequest, PrioritizeRequest, SubscribeRequest, MoveTaskRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()          # initialises Firebase Admin SDK
    asyncio.create_task(notification_service.check_and_send_reminders())
    yield


app = FastAPI(title="LastMinute AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ─── Auth  (all under /api/auth/) ─────────────────────────────────────────────

@app.get("/api/auth/login")
async def login(session_id: Optional[str] = Query(default=None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    auth_url = calendar_service.get_auth_url(session_id)
    return {"auth_url": auth_url, "session_id": session_id}


@app.get("/api/auth/callback/google")
async def oauth_callback(code: str, state: str):
    """
    Google redirects here after the user grants permission.
    We exchange the code, store tokens in Firestore, then redirect the browser
    back to the React frontend with session_id + user info as query params.
    """
    try:
        user_info = calendar_service.handle_oauth_callback(code, state)
        frontend = os.getenv("FRONTEND_URL", "http://localhost:5173")
        name = user_info.get("name", "").replace(" ", "%20")
        return RedirectResponse(
            url=f"{frontend}/dashboard?session_id={state}&user={user_info['email']}&name={name}",
            status_code=302,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/auth/status/{session_id}")
async def auth_status(session_id: str):
    session = database.get_session(session_id)
    if session:
        return {"authenticated": True, "user_id": session["user_id"]}
    return {"authenticated": False}


@app.get("/api/debug/session/{session_id}")
async def debug_session(session_id: str):
    """Diagnostic endpoint — shows token metadata (no secrets exposed)."""
    session = database.get_session(session_id)
    if not session:
        return {"error": "session not found", "session_id": session_id}
    return {
        "session_id":        session_id,
        "user_id":           session.get("user_id"),
        "has_access_token":  bool(session.get("access_token")),
        "has_refresh_token": bool(session.get("refresh_token")),
        "token_expiry":      session.get("token_expiry"),
        "created_at":        session.get("created_at"),
        "updated_at":        session.get("updated_at"),
    }


@app.get("/api/me")
async def get_me(session_id: str = Query(...)):
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = session.get("user_id", "")
    name_guess = email.split("@")[0].replace(".", " ").replace("_", " ").title()
    return {"session_id": session_id, "email": email, "name": name_guess}


@app.get("/api/reminders/{session_id}")
async def get_reminders(session_id: str):
    return {"reminders": database.get_reminders(session_id)}


# ─── Chat / Agent ─────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(req: ChatRequest):
    async def stream():
        try:
            async for chunk in gemini_agent.chat_with_agent(req.message, req.session_id):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'chunk': f'⚠️ Server error: {str(e)[:100]}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/api/conversations/{session_id}")
async def get_conversations(session_id: str):
    return {"messages": database.get_conversation_history(session_id)}


# ─── Calendar ─────────────────────────────────────────────────────────────────

@app.get("/api/calendar/events/{session_id}")
async def get_events(session_id: str, days: int = Query(default=7)):
    try:
        events = calendar_service.get_upcoming_events(session_id, days=days)
        return {"events": events}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/calendar/events/{session_id}")
async def create_event(session_id: str, body: CreateEventRequest):
    try:
        ev = calendar_service.create_calendar_event(
            session_id=session_id,
            title=body.title,
            start_time=body.start_time.isoformat(),
            end_time=body.end_time.isoformat(),
            description=body.description or "",
            reminder_minutes=body.reminder_minutes or 30,
        )
        return ev
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/calendar/gaps/{session_id}")
async def get_gaps(
    session_id: str,
    date: str = Query(...),
    duration_minutes: int = Query(default=60),
):
    try:
        gaps = calendar_service.get_calendar_gaps(session_id, date, duration_minutes)
        return {"gaps": gaps}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Tasks ────────────────────────────────────────────────────────────────────

@app.get("/api/tasks/{session_id}")
async def get_tasks(session_id: str):
    return {"tasks": database.get_tasks(session_id)}


@app.post("/api/tasks/{session_id}/prioritize")
async def prioritize(session_id: str, body: PrioritizeRequest):
    prioritized = task_engine.prioritize_tasks(body.tasks)
    for t in prioritized:
        database.save_task(session_id, t)
    return {"tasks": prioritized}


@app.patch("/api/tasks/{session_id}/{task_id}/complete")
async def complete_task(session_id: str, task_id: str):
    database.complete_task(task_id, session_id)
    return {"success": True}


@app.patch("/api/tasks/{session_id}/{task_id}/move")
async def move_task(session_id: str, task_id: str, body: MoveTaskRequest):
    database.move_task(task_id, session_id, body.priority.value)
    return {"success": True}


# ─── Productivity ─────────────────────────────────────────────────────────────

@app.get("/api/productivity/{session_id}")
async def get_productivity(session_id: str):
    tasks = database.get_tasks(session_id)
    try:
        events = calendar_service.get_upcoming_events(session_id, days=1)
    except Exception:
        events = []
    return task_engine.calculate_productivity_score(events, tasks)


# ─── Notifications ────────────────────────────────────────────────────────────

@app.get("/api/notifications/vapid-key")
async def vapid_key():
    return {"public_key": os.getenv("VAPID_PUBLIC_KEY", "")}


@app.post("/api/notifications/subscribe/{session_id}")
async def subscribe(session_id: str, body: SubscribeRequest):
    database.save_reminder(
        session_id=session_id,
        task_title=body.task_title,
        deadline=body.deadline,
        push_subscription=json.dumps(body.subscription),
    )
    return {"success": True}


# ─── Mission Brief ───────────────────────────────────────────────────────────

@app.get("/api/briefing/{session_id}")
async def get_briefing(session_id: str):
    """
    Returns a structured AI briefing for the Mission Brief screen.
    Called once after login to give users a personalised overview.
    """
    session = database.get_session(session_id)
    if not session:
        return {"error": "Not authenticated"}

    # Get first-name from email
    email = session.get("user_id", "")
    first_name = email.split("@")[0].replace(".", " ").replace("_", " ").title()
    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"

    try:
        events = calendar_service.get_upcoming_events(session_id, days=3)
    except Exception:
        events = []

    tasks = database.get_tasks(session_id)

    # Classify events by urgency
    now = datetime.now(timezone.utc)
    critical, high, medium = [], [], []
    for ev in events:
        s = ev.get("start_time", "")
        if "T" not in s:
            continue
        try:
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
            if not dt.tzinfo:
                dt = dt.replace(tzinfo=timezone.utc)
            h = (dt - now).total_seconds() / 3600
            if h < 0:
                pass
            elif h < 4:
                critical.append(ev)
            elif h < 24:
                high.append(ev)
            elif h < 72:
                medium.append(ev)
        except Exception:
            pass

    score_data = task_engine.calculate_productivity_score(events, tasks)

    # Build urgency-sorted deadline list (top 5)
    deadline_events = []
    for ev in events[:5]:
        s = ev.get("start_time", "")
        urgency = "low"
        if "T" in s:
            try:
                dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
                if not dt.tzinfo:
                    dt = dt.replace(tzinfo=timezone.utc)
                h = (dt - now).total_seconds() / 3600
                if h < 0:
                    urgency = "overdue"
                elif h < 4:
                    urgency = "critical"
                elif h < 24:
                    urgency = "high"
                elif h < 72:
                    urgency = "medium"
            except Exception:
                pass
        deadline_events.append({**ev, "urgency": urgency})

    return {
        "greeting": greeting,
        "first_name": first_name,
        "events": deadline_events,
        "critical_count": len(critical),
        "high_count": len(high),
        "medium_count": len(medium),
        "total_events": len(events),
        "free_time_minutes": score_data["focus_time_available"],
        "productivity_score": score_data["score"],
        "recommendations": score_data["recommendations"][:2],
    }


# ─── Serve frontend in production ─────────────────────────────────────────────

_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
