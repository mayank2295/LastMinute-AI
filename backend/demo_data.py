"""
Demo mode — lets judges experience the full app with realistic data and NO
Google login (so they never hit the 'unverified app' OAuth warning).

A demo session uses a fixed session_id. Calendar events are generated live
(relative to 'now') so countdowns and urgency colours look real. Tasks are
seeded into Firestore so the matrix, focus timer, and productivity score work.
"""

from datetime import datetime, timedelta, timezone

import database

DEMO_SESSION_ID = "demo-judge-session"
DEMO_NAME = "Alex (Demo)"
DEMO_EMAIL = "demo@lastminute.ai"


def is_demo(session_id: str) -> bool:
    return bool(session_id) and session_id.startswith("demo")


def demo_events() -> list:
    """Realistic calendar events anchored to the current time."""
    now = datetime.now(timezone.utc)

    def iso(dt):
        return dt.isoformat()

    specs = [
        ("Final Project Report — SUBMIT", now + timedelta(hours=1, minutes=42), 60),
        ("Client Demo Call",              now + timedelta(hours=5),             45),
        ("Team Standup",                  now + timedelta(hours=22),            30),
        ("Design Review",                 now + timedelta(days=1, hours=4),     60),
        ("Investor Update Draft Due",     now + timedelta(days=2, hours=2),     90),
    ]
    events = []
    for i, (title, start, dur) in enumerate(specs):
        end = start + timedelta(minutes=dur)
        events.append({
            "id": f"demo-ev-{i}",
            "title": title,
            "start_time": iso(start),
            "end_time": iso(end),
            "description": "",
            "location": "",
            "html_link": "https://calendar.google.com/",
        })
    return events


_DEMO_TASKS = [
    {"title": "Finish slides for client demo", "importance_score": 9, "effort_estimate": 90, "hours": 4},
    {"title": "Reply to investor email",       "importance_score": 8, "effort_estimate": 20, "hours": 6},
    {"title": "Fix login bug",                 "importance_score": 7, "effort_estimate": 60, "hours": 26},
    {"title": "Write weekly status report",    "importance_score": 5, "effort_estimate": 45, "hours": 48},
    {"title": "Book flight for conference",    "importance_score": 4, "effort_estimate": 15, "hours": 120},
]


def seed_demo_tasks():
    """Seed demo tasks into Firestore (idempotent-ish — clears old demo tasks first)."""
    import task_engine
    # Clear previous demo tasks
    for t in database.get_tasks(DEMO_SESSION_ID):
        database.delete_task(t["id"], DEMO_SESSION_ID)

    now = datetime.now(timezone.utc)
    raw = []
    for spec in _DEMO_TASKS:
        raw.append({
            "title": spec["title"],
            "deadline": (now + timedelta(hours=spec["hours"])).isoformat(),
            "importance_score": spec["importance_score"],
            "effort_estimate": spec["effort_estimate"],
        })
    prioritized = task_engine.prioritize_tasks(raw)
    for t in prioritized:
        t["source"] = "ai"
        database.save_task(DEMO_SESSION_ID, t)
    return prioritized
