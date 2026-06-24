"""
Firestore persistence layer.
All function signatures are kept identical to the original SQLite version
so that calendar_service, gemini_agent, notification_service, and main.py
require zero changes in how they call this module.
"""

import os
from datetime import datetime, timezone
from typing import Optional, List

import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

# ─── Initialise Firebase Admin SDK once ───────────────────────────────────────

def _init_firebase():
    if firebase_admin._apps:
        return
    raw_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
    # .env stores \n as literal backslash-n — convert to real newlines
    private_key = raw_key.replace("\\n", "\n")
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "private_key": private_key,
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    firebase_admin.initialize_app(cred)
    print("[Firebase] Initialised Firestore for project:", os.getenv("FIREBASE_PROJECT_ID"))


def init_db():
    """Called from main.py lifespan — initialises Firebase."""
    _init_firebase()


def _db() -> firestore.client:
    _init_firebase()
    return firestore.client()


# ─── Sessions ─────────────────────────────────────────────────────────────────
# Collection: sessions/{session_id}

def save_session(session_id: str, user_id: str, access_token: str,
                 refresh_token: str, token_expiry: str):
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


# ─── Conversations ─────────────────────────────────────────────────────────────
# Collection: conversations/{session_id}
# Messages stored as an ordered array inside the document.
# Max doc size is 1 MB; 20 messages of ~500 chars each ≈ 10 KB — well within limits.

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
    # Sort by timestamp ascending, return last `limit` messages
    messages.sort(key=lambda m: m.get("timestamp", ""))
    return messages[-limit:]


# ─── Tasks ────────────────────────────────────────────────────────────────────
# Collection: tasks/{task_id}

def save_task(session_id: str, task: dict):
    db = _db()
    task_id = task.get("id")
    if not task_id:
        import uuid
        task_id = str(uuid.uuid4())

    data = {
        "id": task_id,
        "session_id": session_id,
        "title": task.get("title", ""),
        "description": task.get("description", ""),
        "deadline": task.get("deadline", ""),
        "priority": task.get("priority", ""),
        "urgency_score": task.get("urgency_score"),
        "importance_score": task.get("importance_score"),
        "effort_estimate": task.get("effort_estimate"),
        "completed": bool(task.get("completed", False)),
        "created_at": task.get("created_at", datetime.utcnow().isoformat()),
    }
    db.collection("tasks").document(task_id).set(data, merge=True)


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
        doc_ref.update({"completed": True})


def move_task(task_id: str, session_id: str, new_priority: str):
    db = _db()
    doc_ref = db.collection("tasks").document(task_id)
    doc = doc_ref.get()
    if doc.exists and doc.to_dict().get("session_id") == session_id:
        doc_ref.update({"priority": new_priority})


# ─── Reminders ────────────────────────────────────────────────────────────────
# Collection: reminders/{auto_id}

def save_reminder(session_id: str, task_title: str, deadline: str, push_subscription: str):
    db = _db()
    db.collection("reminders").add({
        "session_id": session_id,
        "task_title": task_title,
        "deadline": deadline,
        "push_subscription": push_subscription,
        "reminder_24h_sent": False,
        "reminder_2h_sent": False,
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
        data["id"] = doc.id      # Firestore doc ID (string)
        result.append(data)
    return result


def update_reminder_sent(reminder_id: str, reminder_type: str):
    """reminder_id is the Firestore document ID string."""
    col = f"reminder_{reminder_type}_sent"
    _db().collection("reminders").document(reminder_id).update({col: True})


def get_reminders(session_id: str) -> List[dict]:
    """Returns all reminders for a session, newest first."""
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
