import os
import json
from datetime import datetime, timezone
from typing import AsyncGenerator

import anthropic

import database
import calendar_service
import task_engine

_client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))
_MODEL  = "claude-haiku-4-5-20251001"

# ─── Tool Declarations (Anthropic JSON-Schema format) ─────────────────────────

_TOOLS = [
    {
        "name": "create_calendar_event",
        "description": "Creates a real event in the user's Google Calendar and returns the event link.",
        "input_schema": {
            "type": "object",
            "properties": {
                "title":            {"type": "string",  "description": "Event title"},
                "start_time":       {"type": "string",  "description": "ISO 8601 start time"},
                "end_time":         {"type": "string",  "description": "ISO 8601 end time"},
                "description":      {"type": "string",  "description": "Optional description"},
                "reminder_minutes": {"type": "integer", "description": "Popup reminder minutes before"},
            },
            "required": ["title", "start_time", "end_time"],
        },
    },
    {
        "name": "get_upcoming_deadlines",
        "description": "Fetches real upcoming events from the user's Google Calendar for the next N days.",
        "input_schema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "description": "Days ahead to look"},
            },
            "required": ["days"],
        },
    },
    {
        "name": "prioritize_tasks",
        "description": (
            "Scores and ranks a list of tasks using urgency (deadline proximity), "
            "importance (user-defined 0–10), and effort estimate. "
            "Assigns each task to the correct Eisenhower matrix quadrant."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tasks": {
                    "type": "array",
                    "description": "List of tasks to prioritize",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title":            {"type": "string"},
                            "deadline":         {"type": "string"},
                            "importance_score": {"type": "number"},
                            "effort_estimate":  {"type": "integer", "description": "Estimated minutes"},
                            "description":      {"type": "string"},
                        },
                    },
                },
            },
            "required": ["tasks"],
        },
    },
    {
        "name": "suggest_time_blocks",
        "description": "Finds free calendar gaps on a given date and suggests the best focus time slots.",
        "input_schema": {
            "type": "object",
            "properties": {
                "date":             {"type": "string",  "description": "Date as YYYY-MM-DD"},
                "duration_minutes": {"type": "integer", "description": "Required block length in minutes"},
            },
            "required": ["date", "duration_minutes"],
        },
    },
    {
        "name": "set_escalating_reminder",
        "description": (
            "Schedules browser push notifications at 24 h, 2 h, and 30 min "
            "before a task deadline."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "task_title":        {"type": "string"},
                "deadline":          {"type": "string",  "description": "ISO 8601 deadline"},
                "push_subscription": {"type": "string",  "description": "JSON-encoded push subscription"},
            },
            "required": ["task_title", "deadline"],
        },
    },
]

# ─── System Prompt ────────────────────────────────────────────────────────────

_SYSTEM_TEMPLATE = """You are LastMinute AI — a mission-critical productivity co-pilot built for people in deadline panic.
Today's date/time (UTC): {now} UTC.

You have REAL tools connected to the user's Google Calendar. When a user mentions any task, deadline, or scheduling need:
1. IMMEDIATELY call the appropriate tool — do not just describe what you would do.
2. After the tool executes, tell the user exactly what happened ("I've added 'Submit Report' to your calendar for tomorrow at 9 AM ✓").
3. Be concise and decisive — users come to you in crisis. No fluff.
4. When a user dumps multiple tasks, call prioritize_tasks to rank them, then offer to schedule the top ones.
5. For scheduling, always use sensible defaults: 1 hour duration unless the user says otherwise; reminder 30 min before.
6. Format all times in human-readable form (e.g. "tomorrow at 9 AM") in your replies.
7. If calendar auth fails, gracefully tell the user to reconnect their Google account.

Tone: calm, structured, decisive — like a brilliant executive assistant who never panics."""

# ─── Tool Executor ────────────────────────────────────────────────────────────


async def _execute(name: str, args: dict, session_id: str) -> dict:
    try:
        if name == "create_calendar_event":
            ev = calendar_service.create_calendar_event(
                session_id=session_id,
                title=args["title"],
                start_time=args["start_time"],
                end_time=args["end_time"],
                description=args.get("description", ""),
                reminder_minutes=int(args.get("reminder_minutes", 30)),
            )
            return {"success": True, **ev}

        if name == "get_upcoming_deadlines":
            events = calendar_service.get_upcoming_events(
                session_id, days=int(args.get("days", 7))
            )
            return {"success": True, "events": events, "count": len(events)}

        if name == "prioritize_tasks":
            raw = args.get("tasks", [])
            prioritized = task_engine.prioritize_tasks(raw)
            for t in prioritized:
                database.save_task(session_id, t)
            return {"success": True, "prioritized_tasks": prioritized, "count": len(prioritized)}

        if name == "suggest_time_blocks":
            slots = calendar_service.get_calendar_gaps(
                session_id,
                date=args["date"],
                duration_minutes=int(args.get("duration_minutes", 60)),
            )
            return {"success": True, "available_slots": slots, "count": len(slots)}

        if name == "set_escalating_reminder":
            push_sub = args.get("push_subscription", "")
            if push_sub:
                database.save_reminder(
                    session_id=session_id,
                    task_title=args["task_title"],
                    deadline=args["deadline"],
                    push_subscription=push_sub,
                )
            return {
                "success": True,
                "message": f"Escalating reminders set for '{args['task_title']}' at {args['deadline']}",
            }

        return {"error": f"Unknown tool: {name}"}

    except ValueError as e:
        return {"error": str(e), "auth_required": True}
    except Exception as e:
        return {"error": str(e)}


# ─── Main Agent Chat ──────────────────────────────────────────────────────────


async def chat_with_agent(message: str, session_id: str) -> AsyncGenerator[str, None]:
    """Run a multi-turn Claude agent conversation, streaming text back."""

    history_rows = database.get_conversation_history(session_id, limit=20)
    database.save_message(session_id, "user", message)

    # Build Anthropic message history
    messages = []
    for msg in history_rows:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    now_str = datetime.now(timezone.utc).strftime("%A %d %B %Y, %H:%M")
    system  = _SYSTEM_TEMPLATE.format(now=now_str)

    tool_calls_log = []

    try:
        for _iteration in range(10):
            response = await _client.messages.create(
                model=_MODEL,
                max_tokens=4096,
                system=system,
                tools=_TOOLS,
                messages=messages,
            )

            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            text_blocks     = [b for b in response.content if b.type == "text"]

            if not tool_use_blocks:
                # Pure text — stream word by word for a natural feel
                full_text = " ".join(b.text for b in text_blocks)
                database.save_message(session_id, "assistant", full_text)

                words = full_text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")

                if tool_calls_log:
                    yield f"\n\n__TOOL_CALLS__:{json.dumps(tool_calls_log)}"
                return

            # Append assistant turn (with tool_use blocks) to history
            messages.append({"role": "assistant", "content": response.content})

            # Execute every tool call and collect results
            tool_results = []
            for block in tool_use_blocks:
                result = await _execute(block.name, block.input, session_id)
                tool_calls_log.append({"tool": block.name, "args": block.input, "result": result})
                tool_results.append({
                    "type":        "tool_result",
                    "tool_use_id": block.id,
                    "content":     json.dumps(result),
                })

            # Feed results back as the next user turn
            messages.append({"role": "user", "content": tool_results})

        yield "I ran into an issue completing that action. Please try again."

    except anthropic.APIStatusError as e:
        print(f"[Claude] API status error {e.status_code}: {e.message}")
        if e.status_code == 529:
            yield "⚠️ Claude API is overloaded right now. Please try again in a moment."
        elif e.status_code == 401:
            yield "⚠️ Invalid Anthropic API key. Please update ANTHROPIC_API_KEY in your .env file."
        elif e.status_code == 429:
            yield "⚠️ Rate limit reached. Please wait a moment and try again."
        else:
            yield f"⚠️ API error ({e.status_code}). Please try again."
    except anthropic.APIConnectionError:
        yield "⚠️ Cannot reach Claude API. Check your internet connection."
    except Exception as e:
        print(f"[Claude] Unexpected error: {e}")
        yield "⚠️ Something went wrong. Please try again."
