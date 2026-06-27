import os
import uuid
import json
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

import database
import calendar_service
import gemini_agent
import task_engine
import notification_service
import demo_data
from models import (
    ChatRequest, CreateEventRequest, PrioritizeRequest,
    SubscribeRequest, MoveTaskRequest, CreateTaskRequest,
    UpdateTaskRequest, FocusSessionRequest,
    BrainDumpRequest, PushSubscribeRequest,
)

CRON_SECRET = os.getenv("CRON_SECRET", "")


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
        "https://mayank.store",
        "https://www.mayank.store",
        "https://lastminute-ai-ummt2blwla-el.a.run.app",
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


# ─── Auth ─────────────────────────────────────────────────────────────────────

@app.get("/api/auth/login")
async def login(session_id: Optional[str] = Query(default=None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    auth_url = calendar_service.get_auth_url(session_id)
    return {"auth_url": auth_url, "session_id": session_id}


@app.get("/api/auth/callback/google")
async def oauth_callback(code: str, state: str):
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


@app.get("/api/me")
async def get_me(session_id: str = Query(...)):
    session = database.get_session(session_id)
    if not session:
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = session.get("user_id", "")
    # Prefer the real Google profile name captured at login; fall back to email.
    name = session.get("name") or email.split("@")[0].replace(".", " ").replace("_", " ").title()
    return {"session_id": session_id, "email": email, "name": name,
            "timezone": session.get("timezone", "UTC"),
            "picture": session.get("picture", "")}


# ─── Demo Mode (no login — lets judges try the app instantly) ──────────────────

@app.post("/api/demo/start")
async def demo_start():
    """Seed a demo session and return its credentials. No Google login needed."""
    demo_data.seed_demo_tasks()
    return {
        "session_id": demo_data.DEMO_SESSION_ID,
        "email": demo_data.DEMO_EMAIL,
        "name": demo_data.DEMO_NAME,
        "demo": True,
    }


@app.get("/api/debug/session/{session_id}")
async def debug_session(session_id: str):
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


# ─── Chat / Agent ─────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(req: ChatRequest):
    async def stream():
        try:
            async for chunk in gemini_agent.chat_with_agent(req.message, req.session_id):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'chunk': f'Server error: {str(e)[:100]}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@app.get("/api/conversations/{session_id}")
async def get_conversations(session_id: str):
    return {"messages": database.get_conversation_history(session_id)}


# ─── Agentic: Plan My Day + Brain Dump ────────────────────────────────────────

@app.post("/api/plan/{session_id}")
async def plan_my_day(session_id: str):
    """Proactively analyse the day and auto-schedule focus time."""
    if not demo_data.is_demo(session_id) and not database.get_session(session_id):
        raise HTTPException(status_code=401, detail="Not authenticated")
    # Demo sessions can't write to a real calendar, so skip auto-scheduling there.
    auto = not demo_data.is_demo(session_id)
    plan = await gemini_agent.generate_daily_plan(session_id, auto_schedule=auto)
    return plan


@app.post("/api/braindump/{session_id}")
async def brain_dump(session_id: str, body: BrainDumpRequest):
    """Turn a chaotic free-text dump into structured, prioritised tasks."""
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")
    if not demo_data.is_demo(session_id) and not database.get_session(session_id):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return await gemini_agent.parse_braindump(session_id, body.text.strip())


@app.post("/api/notifications/push-subscribe/{session_id}")
async def push_subscribe(session_id: str, body: PushSubscribeRequest):
    """Store the browser push subscription on the session."""
    database.save_push_subscription(session_id, json.dumps(body.subscription))
    return {"success": True}


@app.post("/api/vision/{session_id}")
async def vision_extract(session_id: str, file: UploadFile = File(...)):
    """Gemini Vision — extract tasks from an uploaded image (syllabus, timetable…)."""
    if not demo_data.is_demo(session_id) and not database.get_session(session_id):
        raise HTTPException(status_code=401, detail="Not authenticated")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")
    mime = file.content_type or "image/png"
    return await gemini_agent.parse_image_tasks(session_id, data, mime)


@app.get("/api/activities/{session_id}")
async def get_activities(session_id: str, limit: int = Query(default=20)):
    """The agent's autonomous-action feed — proof of what it did on its own."""
    return {"activities": database.get_activities(session_id, limit=limit)}


# ─── Cron endpoints (driven by Google Cloud Scheduler) ────────────────────────

def _verify_cron(token: Optional[str]):
    if CRON_SECRET and token != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")


@app.post("/api/cron/check-reminders")
async def cron_check_reminders(x_cron_secret: Optional[str] = Header(default=None)):
    """Reliable reminder check — survives Cloud Run scale-to-zero."""
    _verify_cron(x_cron_secret)
    return notification_service.run_reminder_check()


@app.post("/api/cron/daily-plan/{session_id}")
async def cron_daily_plan(session_id: str, x_cron_secret: Optional[str] = Header(default=None)):
    """Generate a daily plan for a user autonomously (scheduled, e.g. 7 AM)."""
    _verify_cron(x_cron_secret)
    return await gemini_agent.generate_daily_plan(session_id, auto_schedule=True)


# ─── Calendar ─────────────────────────────────────────────────────────────────

@app.get("/api/calendar/events/{session_id}")
async def get_events(session_id: str, days: int = Query(default=7)):
    if demo_data.is_demo(session_id):
        return {"events": demo_data.demo_events()}
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
    if demo_data.is_demo(session_id):
        return {"gaps": []}
    try:
        gaps = calendar_service.get_calendar_gaps(session_id, date, duration_minutes)
        return {"gaps": gaps}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Tasks ────────────────────────────────────────────────────────────────────

@app.get("/api/tasks/{session_id}")
async def get_tasks(session_id: str):
    return {"tasks": database.get_tasks(session_id)}


@app.post("/api/tasks/{session_id}")
async def create_task(session_id: str, body: CreateTaskRequest):
    if not body.title or not body.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not demo_data.is_demo(session_id) and not database.get_session(session_id):
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Auto-assign priority based on deadline if not provided
    priority = body.priority
    if not priority:
        from task_engine import calculate_urgency_score, classify_eisenhower
        urgency = calculate_urgency_score(body.deadline or "")
        priority = classify_eisenhower(urgency, 5.0)

    task_data = {
        "title": body.title.strip(),
        "description": body.description or "",
        "deadline": body.deadline or "",
        "priority": priority,
        "quadrant": priority,
        "estimated_minutes": body.estimated_minutes,
        "source": body.source or "manual",
        "completed": False,
        "created_at": datetime.utcnow().isoformat(),
    }
    saved = database.save_task(session_id, task_data)

    # Optionally add to Google Calendar
    if body.add_to_calendar and body.deadline:
        try:
            from datetime import timedelta
            import dateutil.parser
            start = dateutil.parser.parse(body.deadline)
            end = start + timedelta(hours=1)
            calendar_service.create_calendar_event(
                session_id=session_id,
                title=body.title,
                start_time=start.isoformat(),
                end_time=end.isoformat(),
                description=body.description or "",
                reminder_minutes=30,
            )
        except Exception:
            pass  # Calendar creation is best-effort

    return saved


@app.delete("/api/tasks/{session_id}/{task_id}")
async def delete_task(session_id: str, task_id: str):
    deleted = database.delete_task(task_id, session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}


@app.patch("/api/tasks/{session_id}/{task_id}/complete")
async def complete_task(session_id: str, task_id: str):
    database.complete_task(task_id, session_id)
    return {"success": True}


@app.patch("/api/tasks/{session_id}/{task_id}/move")
async def move_task(session_id: str, task_id: str, body: MoveTaskRequest):
    database.move_task(task_id, session_id, body.priority.value)
    return {"success": True}


@app.put("/api/tasks/{session_id}/{task_id}")
async def update_task(session_id: str, task_id: str, body: UpdateTaskRequest):
    updates = body.model_dump(exclude_none=True)
    updated = database.update_task(task_id, session_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    return updated


@app.post("/api/tasks/{session_id}/prioritize")
async def prioritize(session_id: str, body: PrioritizeRequest):
    prioritized = task_engine.prioritize_tasks(body.tasks)
    for t in prioritized:
        database.save_task(session_id, t)
    return {"tasks": prioritized}


# ─── Focus Sessions ───────────────────────────────────────────────────────────

@app.post("/api/focus-sessions/{session_id}")
async def save_focus_session(session_id: str, body: FocusSessionRequest):
    if not demo_data.is_demo(session_id) and not database.get_session(session_id):
        raise HTTPException(status_code=401, detail="Not authenticated")
    record = database.save_focus_session(session_id, body.model_dump())
    return record


@app.get("/api/focus-sessions/{session_id}")
async def get_focus_sessions(
    session_id: str,
    date: Optional[str] = Query(default=None),
):
    sessions = database.get_focus_sessions(session_id, date=date)
    total_minutes = sum(s.get("duration_minutes", 0) for s in sessions)
    return {
        "sessions": sessions,
        "total_minutes": total_minutes,
        "count": len(sessions),
    }


# ─── Productivity ─────────────────────────────────────────────────────────────

@app.get("/api/productivity/{session_id}")
async def get_productivity(session_id: str):
    tasks = database.get_tasks(session_id)
    if demo_data.is_demo(session_id):
        events = demo_data.demo_events()
    else:
        try:
            events = calendar_service.get_upcoming_events(session_id, days=1)
        except Exception:
            events = []
    return task_engine.calculate_productivity_score(events, tasks)


# ─── Reminders ────────────────────────────────────────────────────────────────

@app.get("/api/reminders/{session_id}")
async def get_reminders(session_id: str):
    return {"reminders": database.get_reminders(session_id)}


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


# ─── Mission Brief ────────────────────────────────────────────────────────────

@app.get("/api/briefing/{session_id}")
async def get_briefing(session_id: str):
    is_demo = demo_data.is_demo(session_id)
    session = database.get_session(session_id)
    if not session and not is_demo:
        return {"error": "Not authenticated"}

    if is_demo:
        first_name = demo_data.DEMO_NAME.split()[0]
    else:
        email = session.get("user_id", "")
        full_name = session.get("name", "")
        first_name = (full_name.split()[0] if full_name
                      else email.split("@")[0].replace(".", " ").replace("_", " ").title().split()[0])
    hour = datetime.now().hour
    greeting = "Good morning" if hour < 12 else "Good afternoon" if hour < 18 else "Good evening"

    if is_demo:
        events = demo_data.demo_events()
    else:
        try:
            events = calendar_service.get_upcoming_events(session_id, days=3)
        except Exception:
            events = []

    tasks = database.get_tasks(session_id)
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
            if h < 4:
                critical.append(ev)
            elif h < 24:
                high.append(ev)
            elif h < 72:
                medium.append(ev)
        except Exception:
            pass

    score_data = task_engine.calculate_productivity_score(events, tasks)
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

_static_dir = os.path.join(os.path.dirname(__file__), "static")


def _spa_index():
    return FileResponse(os.path.join(_static_dir, "index.html"))


if os.path.exists(_static_dir):
    @app.get("/login")
    async def serve_login(): return _spa_index()

    @app.get("/privacy")
    async def serve_privacy(): return _spa_index()

    @app.get("/terms")
    async def serve_terms(): return _spa_index()

    @app.get("/dashboard")
    async def serve_dashboard(): return _spa_index()

    @app.get("/dashboard/{rest_of_path:path}")
    async def serve_dashboard_sub(rest_of_path: str): return _spa_index()

    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
