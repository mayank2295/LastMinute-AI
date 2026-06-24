import os
import uuid
import json
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
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
from models import ChatRequest, CreateEventRequest, PrioritizeRequest, SubscribeRequest


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    asyncio.create_task(notification_service.check_and_send_reminders())
    yield


app = FastAPI(title="LastMinute AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.get("/auth/login")
async def login(session_id: Optional[str] = Query(default=None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    auth_url = calendar_service.get_auth_url(session_id)
    return {"auth_url": auth_url, "session_id": session_id}


@app.get("/auth/callback")
async def oauth_callback(code: str, state: str):
    try:
        user_info = calendar_service.handle_oauth_callback(code, state)
        frontend = os.getenv("FRONTEND_URL", "http://localhost:5173")
        name = user_info.get("name", "").replace(" ", "%20")
        return RedirectResponse(
            url=f"{frontend}?session_id={state}&user={user_info['email']}&name={name}"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/auth/status/{session_id}")
async def auth_status(session_id: str):
    session = database.get_session(session_id)
    if session:
        return {"authenticated": True, "user_id": session["user_id"]}
    return {"authenticated": False}


# ─── Chat / Agent ─────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(req: ChatRequest):
    async def stream():
        async for chunk in gemini_agent.chat_with_agent(req.message, req.session_id):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
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
async def get_gaps(session_id: str, date: str = Query(...), duration_minutes: int = Query(default=60)):
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


# ─── Serve frontend in production ─────────────────────────────────────────────

_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(_dist):
    app.mount("/", StaticFiles(directory=_dist, html=True), name="static")
