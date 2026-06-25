"""
Firestore persistence layer.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()


def _init_firebase():
    if firebase_admin._apps:
        return
    raw_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
    private_key = raw_key.replace("\\n", "\n")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key": private_key,
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    firebase_admin.initialize_app(cred)


def init_db():
    _init_firebase()


def _db() -> firestore.client:
    _init_firebase()
    return firestore.client()


# ─── Sessions ─────────────────────────────────────────────────────────────────

def save_session(session_id: str, user_id: str, access_token: str,
                 refresh_token: str, token_expiry: str,
                 name: Optional[str] = None, timezone_name: Optional[str] = None):
    now = datetime.utcnow().isoformat()
    doc_ref = _db().collection("sessions").document(session_id)
    existing = doc_ref.get()
    data = {
        "session_id": session_id,
        "user_id": user_id,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_expiry": token_expiry,
        "updated_at": now,
    }
    # Only persist name/timezone when explicitly provided, so a token refresh
    # never wipes the values captured at login.
    if name is not None:
        data["name"] = name
    if timezone_name is not None:
        data["timezone"] = timezone_name
    if existing.exists:
        doc_ref.update(data)
    else:
        data["created_at"] = now
        doc_ref.set(data)


def get_session(session_id: str) -> Optional[dict]:
    doc = _db().collection("sessions").document(session_id).get()
    if doc.exists:
        return doc.to_dict()
    return None


def get_user_timezone(session_id: str) -> str:
    session = get_session(session_id)
    if session and session.get("timezone"):
        return session["timezone"]
    return "UTC"


def save_push_subscription(session_id: str, subscription: str):
    """Store the browser push subscription on the session so the agent can
    set reminders without the LLM needing to know the subscription."""
    doc_ref = _db().collection("sessions").document(session_id)
    if doc_ref.get().exists:
        doc_ref.update({"push_subscription": subscription})


# ─── Conversations ─────────────────────────────────────────────────────────────

def save_message(session_id: str, role: str, content: str):
    db = _db()
    now = datetime.utcnow().isoformat()
    doc_ref = db.collection("conversations").document(session_id)
    message = {"role": role, "content": content, "timestamp": now}
    doc_ref.set(
        {"messages": firestore.ArrayUnion([message]), "updated_at": now},
        merge=True,
    )


def get_conversation_history(session_id: str, limit: int = 20) -> List[dict]:
    doc = _db().collection("conversations").document(session_id).get()
    if not doc.exists:
        return []
    messages = doc.to_dict().get("messages", [])
    messages.sort(key=lambda m: m.get("timestamp", ""))
    return messages[-limit:]


# ─── Tasks ────────────────────────────────────────────────────────────────────

def save_task(session_id: str, task: dict) -> dict:
    db = _db()
    task_id = task.get("id") or str(uuid.uuid4())
    data = {
        "id": task_id,
        "session_id": session_id,
        "title": task.get("title", ""),
        "description": task.get("description", ""),
        "deadline": task.get("deadline", ""),
        "priority": task.get("priority", ""),
        "quadrant": task.get("quadrant", task.get("priority", "")),
        "urgency_score": task.get("urgency_score"),
        "importance_score": task.get("importance_score"),
        "effort_estimate": task.get("effort_estimate"),
        "estimated_minutes": task.get("estimated_minutes", task.get("effort_estimate")),
        "source": task.get("source", "ai"),
        "completed": bool(task.get("completed", False)),
        "created_at": task.get("created_at", datetime.utcnow().isoformat()),
    }
    db.collection("tasks").document(task_id).set(data, merge=True)
    return data


def get_tasks(session_id: str) -> List[dict]:
    docs = (
        _db()
        .collection("tasks")
        .where("session_id", "==", session_id)
        .stream()
    )
    tasks = [d.to_dict() for d in docs]
    tasks.sort(key=lambda t: t.get("created_at", ""), reverse=True)
    return tasks


def complete_task(task_id: str, session_id: str):
    db = _db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("session_id") == session_id:
        doc_ref.update({
            "completed": True,
            "completed_at": datetime.utcnow().isoformat(),
        })


def delete_task(task_id: str, session_id: str) -> bool:
    db = _db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("session_id") == session_id:
        doc_ref.delete()
        return True
    return False


def update_task(task_id: str, session_id: str, updates: dict) -> Optional[dict]:
    db = _db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    if not doc.exists or doc.to_dict().get("session_id") != session_id:
        return None
    allowed = {"priority", "quadrant", "title", "description", "deadline",
               "completed", "estimated_minutes", "source"}
    clean = {k: v for k, v in updates.items() if k in allowed}
    if clean:
        doc_ref.update(clean)
    return {**doc.to_dict(), **clean}


def move_task(task_id: str, session_id: str, new_priority: str):
    db = _db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("session_id") == session_id:
        doc_ref.update({"priority": new_priority, "quadrant": new_priority})


# ─── Reminders ────────────────────────────────────────────────────────────────

def save_reminder(session_id: str, task_title: str, deadline: str, push_subscription: str):
    _db().collection("reminders").add({
        "session_id": session_id,
        "task_title": task_title,
        "deadline": deadline,
        "push_subscription": push_subscription,
        "reminder_24h_sent": False,
        "reminder_2h_sent": False,
        "reminder_1h_sent": False,
        "reminder_30m_sent": False,
        "created_at": datetime.utcnow().isoformat(),
    })


def get_pending_reminders() -> List[dict]:
    docs = (
        _db()
        .collection("reminders")
        .where("reminder_30m_sent", "==", False)
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(data)
    return result


def update_reminder_sent(reminder_id: str, reminder_type: str):
    col = f"reminder_{reminder_type}_sent"
    _db().collection("reminders").document(reminder_id).update({col: True})


def get_reminders(session_id: str) -> List[dict]:
    docs = (
        _db()
        .collection("reminders")
        .where("session_id", "==", session_id)
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        result.append(data)
    result.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return result


# ─── Focus Sessions ───────────────────────────────────────────────────────────

def save_focus_session(session_id: str, data: dict) -> dict:
    db = _db()
    doc_id = str(uuid.uuid4())
    record = {
        "id": doc_id,
        "session_id": session_id,
        "task_id": data.get("task_id", ""),
        "task_title": data.get("task_title", ""),
        "duration_minutes": int(data.get("duration_minutes", 25)),
        "completed_at": data.get("completed_at", datetime.utcnow().isoformat()),
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("focus_sessions").document(doc_id).set(record)
    return record


def log_activity(session_id: str, action: str, detail: str = "", icon: str = "bolt", meta: Optional[dict] = None):
    """Record an autonomous/agent action so the user can SEE what the agent did."""
    try:
        doc_id = str(uuid.uuid4())
        _db().collection("activities").document(doc_id).set({
            "id": doc_id,
            "session_id": session_id,
            "action": action,
            "detail": detail,
            "icon": icon,
            "meta": meta or {},
            "created_at": datetime.utcnow().isoformat(),
        })
    except Exception as e:
        print(f"[Activity] log failed: {e}")


def get_activities(session_id: str, limit: int = 20) -> List[dict]:
    docs = (
        _db()
        .collection("activities")
        .where("session_id", "==", session_id)
        .stream()
    )
    result = [d.to_dict() for d in docs]
    result.sort(key=lambda a: a.get("created_at", ""), reverse=True)
    return result[:limit]


def get_focus_sessions(session_id: str, date: Optional[str] = None) -> List[dict]:
    docs = (
        _db()
        .collection("focus_sessions")
        .where("session_id", "==", session_id)
        .stream()
    )
    result = []
    for doc in docs:
        data = doc.to_dict()
        if date:
            completed = data.get("completed_at", "")
            if not completed.startswith(date):
                continue
        result.append(data)
    result.sort(key=lambda r: r.get("completed_at", ""), reverse=True)
    return result
