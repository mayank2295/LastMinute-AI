import sqlite3
import json
import os
from datetime import datetime
from typing import Optional, List

DB_PATH = os.getenv("DATABASE_URL", "lastminute.db").replace("sqlite:///./", "")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id    TEXT,
            access_token  TEXT,
            refresh_token TEXT,
            token_expiry  TEXT,
            created_at    TEXT,
            updated_at    TEXT
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role       TEXT,
            content    TEXT,
            timestamp  TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id               TEXT PRIMARY KEY,
            session_id       TEXT,
            title            TEXT,
            description      TEXT,
            deadline         TEXT,
            priority         TEXT,
            urgency_score    REAL,
            importance_score REAL,
            effort_estimate  INTEGER,
            completed        INTEGER DEFAULT 0,
            created_at       TEXT,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id          TEXT,
            task_title          TEXT,
            deadline            TEXT,
            reminder_24h_sent   INTEGER DEFAULT 0,
            reminder_2h_sent    INTEGER DEFAULT 0,
            reminder_30m_sent   INTEGER DEFAULT 0,
            push_subscription   TEXT,
            created_at          TEXT
        )
    """)

    conn.commit()
    conn.close()


def get_session(session_id: str) -> Optional[dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "session_id": row[0], "user_id": row[1],
            "access_token": row[2], "refresh_token": row[3],
            "token_expiry": row[4], "created_at": row[5], "updated_at": row[6],
        }
    return None


def save_session(session_id: str, user_id: str, access_token: str,
                 refresh_token: str, token_expiry: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    now = datetime.utcnow().isoformat()
    c.execute("""
        INSERT INTO sessions (session_id, user_id, access_token, refresh_token,
                              token_expiry, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
            user_id=excluded.user_id,
            access_token=excluded.access_token,
            refresh_token=excluded.refresh_token,
            token_expiry=excluded.token_expiry,
            updated_at=excluded.updated_at
    """, (session_id, user_id, access_token, refresh_token, token_expiry, now, now))
    conn.commit()
    conn.close()


def get_conversation_history(session_id: str, limit: int = 20) -> List[dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT role, content, timestamp FROM conversations "
        "WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
        (session_id, limit),
    )
    rows = c.fetchall()
    conn.close()
    return [{"role": r[0], "content": r[1], "timestamp": r[2]} for r in reversed(rows)]


def save_message(session_id: str, role: str, content: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO conversations (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
        (session_id, role, content, datetime.utcnow().isoformat()),
    )
    conn.commit()
    conn.close()


def save_task(session_id: str, task: dict):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO tasks (id, session_id, title, description, deadline, priority,
                           urgency_score, importance_score, effort_estimate,
                           completed, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title=excluded.title, description=excluded.description,
            deadline=excluded.deadline, priority=excluded.priority,
            urgency_score=excluded.urgency_score,
            importance_score=excluded.importance_score,
            effort_estimate=excluded.effort_estimate,
            completed=excluded.completed
    """, (
        task.get("id"), session_id, task.get("title"), task.get("description"),
        task.get("deadline"), task.get("priority"),
        task.get("urgency_score"), task.get("importance_score"),
        task.get("effort_estimate"), int(task.get("completed", False)),
        task.get("created_at", datetime.utcnow().isoformat()),
    ))
    conn.commit()
    conn.close()


def get_tasks(session_id: str) -> List[dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "SELECT id, session_id, title, description, deadline, priority, "
        "urgency_score, importance_score, effort_estimate, completed, created_at "
        "FROM tasks WHERE session_id = ? ORDER BY created_at DESC",
        (session_id,),
    )
    rows = c.fetchall()
    conn.close()
    return [{
        "id": r[0], "session_id": r[1], "title": r[2], "description": r[3],
        "deadline": r[4], "priority": r[5], "urgency_score": r[6],
        "importance_score": r[7], "effort_estimate": r[8],
        "completed": bool(r[9]), "created_at": r[10],
    } for r in rows]


def complete_task(task_id: str, session_id: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE tasks SET completed = 1 WHERE id = ? AND session_id = ?",
        (task_id, session_id),
    )
    conn.commit()
    conn.close()


def save_reminder(session_id: str, task_title: str, deadline: str, push_subscription: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        INSERT INTO reminders (session_id, task_title, deadline,
                               push_subscription, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (session_id, task_title, deadline, push_subscription, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()


def get_pending_reminders() -> List[dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        SELECT id, session_id, task_title, deadline,
               reminder_24h_sent, reminder_2h_sent, reminder_30m_sent, push_subscription
        FROM reminders WHERE reminder_30m_sent = 0
    """)
    rows = c.fetchall()
    conn.close()
    return [{
        "id": r[0], "session_id": r[1], "task_title": r[2], "deadline": r[3],
        "reminder_24h_sent": bool(r[4]), "reminder_2h_sent": bool(r[5]),
        "reminder_30m_sent": bool(r[6]), "push_subscription": r[7],
    } for r in rows]


def update_reminder_sent(reminder_id: int, reminder_type: str):
    col = f"reminder_{reminder_type}_sent"
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(f"UPDATE reminders SET {col} = 1 WHERE id = ?", (reminder_id,))
    conn.commit()
    conn.close()
