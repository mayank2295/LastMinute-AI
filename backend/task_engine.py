import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any


def calculate_urgency_score(deadline: str) -> float:
    if not deadline:
        return 3.0
    try:
        dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if not dl.tzinfo:
            dl = dl.replace(tzinfo=timezone.utc)
        hours = (dl - datetime.now(timezone.utc)).total_seconds() / 3600
        if hours < 0:
            return 10.0
        if hours <= 2:
            return 9.5
        if hours <= 24:
            return 8.0
        if hours <= 48:
            return 6.5
        if hours <= 72:
            return 5.0
        if hours <= 168:
            return 3.5
        return 2.0
    except Exception:
        return 3.0


def classify_eisenhower(urgency: float, importance: float) -> str:
    u = urgency >= 6.0
    i = importance >= 6.0
    if u and i:
        return "urgent_important"
    if not u and i:
        return "important"
    if u and not i:
        return "urgent"
    return "neither"


def prioritize_tasks(tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = []
    for task in tasks:
        urgency = calculate_urgency_score(task.get("deadline", ""))
        importance = float(task.get("importance_score", 5.0))
        effort = int(task.get("effort_estimate", 60))
        effort_norm = min(effort / 60, 10)

        # Weighted composite score: urgency 50%, importance 40%, ease 10%
        score = urgency * 0.5 + importance * 0.4 + (10 - effort_norm) * 0.1

        result.append({
            **task,
            "id": task.get("id") or str(uuid.uuid4()),
            "urgency_score": round(urgency, 2),
            "importance_score": round(importance, 2),
            "priority": classify_eisenhower(urgency, importance),
            "priority_score": round(score, 3),
        })

    result.sort(key=lambda x: x["priority_score"], reverse=True)
    return result


def calculate_productivity_score(events: List[dict], tasks: List[dict]) -> dict:
    meeting_minutes = 0.0
    for ev in events:
        s = ev.get("start_time", "")
        e = ev.get("end_time", "")
        if s and e and "T" in s and "T" in e:
            try:
                start = datetime.fromisoformat(s.replace("Z", "+00:00"))
                end = datetime.fromisoformat(e.replace("Z", "+00:00"))
                meeting_minutes += max(0, (end - start).total_seconds() / 60)
            except Exception:
                pass

    meeting_load = min(meeting_minutes / 480, 1.0)
    completed = sum(1 for t in tasks if t.get("completed"))
    total = len(tasks)
    completion_rate = completed / total if total > 0 else 0.0

    overdue = []
    for t in tasks:
        if t.get("completed"):
            continue
        dl = t.get("deadline", "")
        if not dl:
            continue
        try:
            d = datetime.fromisoformat(dl.replace("Z", "+00:00"))
            if not d.tzinfo:
                d = d.replace(tzinfo=timezone.utc)
            if d < datetime.now(timezone.utc):
                overdue.append(t)
        except Exception:
            pass

    score = max(0, min(100, int(
        60
        + completion_rate * 40
        - meeting_load * 30
        - len(overdue) * 10
    )))

    focus_available = max(0, int(480 - meeting_minutes))

    recs = []
    if meeting_load > 0.6:
        recs.append("Heavy meeting day — protect at least one 90-minute focus block")
    if overdue:
        recs.append(f"{len(overdue)} overdue task(s) — clear these before taking new work")
    if completion_rate < 0.3 and total > 0:
        recs.append("Low completion rate — break tasks into 25-minute Pomodoros")
    if focus_available < 60:
        recs.append("Almost no deep-work time today — defer non-critical tasks to tomorrow")
    if not recs:
        recs.append("You're on track — keep the momentum going")

    return {
        "score": score,
        "analysis": f"{len(events)} calendar events · {total} tasks · {completed} completed",
        "recommendations": recs,
        "meeting_load": round(meeting_load, 2),
        "focus_time_available": focus_available,
    }
