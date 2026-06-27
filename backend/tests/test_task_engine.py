"""Task prioritization logic — pure function, no external services."""
from datetime import datetime, timezone, timedelta

import task_engine


def _task(title, hours_until_due, importance):
    return {
        "title": title,
        "deadline": (datetime.now(timezone.utc) + timedelta(hours=hours_until_due)).isoformat(),
        "importance_score": importance,
    }


def test_prioritize_returns_one_entry_per_task_with_priority():
    raw = [_task("A", 2, 9), _task("B", 100, 3)]
    out = task_engine.prioritize_tasks(raw)
    assert len(out) == 2
    for t in out:
        assert t.get("priority") in {"urgent_important", "important", "urgent", "neither"}
        assert "priority_score" in t


def test_more_urgent_important_task_ranks_first():
    raw = [
        _task("low — far away, unimportant", 240, 2),
        _task("high — due soon, important", 1, 10),
    ]
    out = task_engine.prioritize_tasks(raw)
    assert out[0]["title"].startswith("high")
