import logging
logger = logging.getLogger("lastminute")

import os
import re
import json
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator
from zoneinfo import ZoneInfo

import anthropic

import database
import calendar_service
import task_engine
import ai_provider

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
The user's current local date/time is: {now} ({tz}).

CRITICAL — TIMEZONE: When calling create_calendar_event, output start_time and end_time as LOCAL time
in ISO format WITHOUT any timezone suffix or 'Z' (e.g. "2026-06-26T15:00:00" means 3 PM the user's local time).
Never append 'Z' or an offset. The calendar is configured for {tz}.

You have REAL tools connected to the user's Google Calendar. When a user mentions any task, deadline, or scheduling need:
1. IMMEDIATELY call the appropriate tool — do not just describe what you would do.
2. After the tool executes, tell the user exactly what happened ("I've added 'Submit Report' to your calendar for tomorrow at 9 AM").
3. Be concise and decisive — users come to you in crisis. No fluff.
4. When a user dumps multiple tasks, call prioritize_tasks to rank them, then offer to schedule the top ones.
5. For scheduling, always use sensible defaults: 1 hour duration unless the user says otherwise; reminder 30 min before.
6. Format all times in human-readable LOCAL form (e.g. "tomorrow at 9 AM") in your replies.
7. If calendar auth fails, gracefully tell the user to reconnect their Google account.

Tone: calm, structured, decisive — like a brilliant executive assistant who never panics."""


def _local_now_str(tz_name: str) -> tuple:
    """Return (formatted local time, tz_name) for prompts."""
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc
        tz_name = "UTC"
    return datetime.now(tz).strftime("%A %d %B %Y, %H:%M"), tz_name

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
            database.log_activity(session_id, f"Added \"{args['title']}\" to your calendar",
                                  args.get("start_time", "")[:16].replace("T", " "), icon="calendar")
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
            database.log_activity(session_id, f"Prioritised {len(prioritized)} task(s) into your Game Plan",
                                  icon="list")
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
            database.log_activity(session_id, f"Set escalating reminders for \"{args['task_title']}\"",
                                  "24h / 2h / 30m before deadline", icon="bell")
            return {
                "success": True,
                "message": f"Escalating reminders set for '{args['task_title']}' at {args['deadline']}",
            }

        return {"error": f"Unknown tool: {name}"}

    except ValueError as e:
        return {"error": str(e), "auth_required": True}
    except Exception as e:
        return {"error": str(e)}


# ─── Gemini function-calling config (primary AI engine) ───────────────────────

_GEMINI_TOOLS = [{
    "function_declarations": [
        {"name": t["name"], "description": t["description"], "parameters": t["input_schema"]}
        for t in _TOOLS
    ]
}]

_genai = None
_GEMINI_READY = False
_GEMINI_CHAT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
try:
    import google.generativeai as _genai
    _key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
    if _key:
        _genai.configure(api_key=_key)
        _GEMINI_READY = True
        logger.info(f"[Agent] Chat engine: Google Gemini ({_GEMINI_CHAT_MODEL})")
except Exception as _e:
    logger.info(f"[Agent] Gemini unavailable, will use fallback engine: {_e}")


def _gemini_text(resp) -> str:
    try:
        return (resp.text or "").strip()
    except Exception:
        try:
            parts = resp.candidates[0].content.parts
            return " ".join(getattr(p, "text", "") for p in parts if getattr(p, "text", "")).strip()
        except Exception:
            return ""


# ─── Main Agent Chat ──────────────────────────────────────────────────────────


async def chat_with_agent(message: str, session_id: str) -> AsyncGenerator[str, None]:
    """
    Multi-turn agent conversation, streaming text back.
    Primary engine: Google Gemini (function calling). Falls back transparently
    to a secondary engine only if Gemini is unavailable, so the demo never dies.
    """
    history_rows = database.get_conversation_history(session_id, limit=20)
    database.save_message(session_id, "user", message)

    tz_name = database.get_user_timezone(session_id)
    now_str, tz_name = _local_now_str(tz_name)
    system = _SYSTEM_TEMPLATE.format(now=now_str, tz=tz_name)

    if _GEMINI_READY:
        try:
            async for chunk in _run_gemini(message, session_id, history_rows, system):
                yield chunk
            return
        except Exception as e:
            logger.info(f"[Agent] Gemini chat error, falling back: {e}")

    async for chunk in _run_fallback(message, session_id, history_rows, system):
        yield chunk


async def _run_gemini(message, session_id, history_rows, system):
    """Gemini function-calling agent loop."""
    model = _genai.GenerativeModel(
        _GEMINI_CHAT_MODEL, tools=_GEMINI_TOOLS, system_instruction=system,
    )
    history = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
        for m in history_rows
    ]
    chat = model.start_chat(history=history)
    tool_calls_log = []

    resp = await chat.send_message_async(message)

    for _iteration in range(10):
        parts = resp.candidates[0].content.parts
        calls = [p.function_call for p in parts if getattr(p, "function_call", None) and p.function_call.name]

        if not calls:
            text = _gemini_text(resp) or "Done."
            database.save_message(session_id, "assistant", text)
            words = text.split(" ")
            for i, w in enumerate(words):
                yield w + (" " if i < len(words) - 1 else "")
            if tool_calls_log:
                yield f"\n\n__TOOL_CALLS__:{json.dumps(tool_calls_log)}"
            return

        replies = []
        for fc in calls:
            try:
                args = type(fc).to_dict(fc).get("args", {}) or {}
            except Exception:
                args = dict(getattr(fc, "args", {}) or {})
            result = await _execute(fc.name, args, session_id)
            tool_calls_log.append({"tool": fc.name, "args": args, "result": result})
            replies.append(_genai.protos.Part(
                function_response=_genai.protos.FunctionResponse(
                    name=fc.name, response={"result": result},
                )
            ))
        resp = await chat.send_message_async(replies)

    yield "I ran into an issue completing that action. Please try again."


async def _run_fallback(message, session_id, history_rows, system):
    """Resilience fallback engine (used only if Gemini is unavailable)."""
    messages = []
    for msg in history_rows:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": message})

    tool_calls_log = []
    try:
        for _iteration in range(10):
            response = await _client.messages.create(
                model=_MODEL, max_tokens=4096, system=system, tools=_TOOLS, messages=messages,
            )
            tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
            text_blocks     = [b for b in response.content if b.type == "text"]

            if not tool_use_blocks:
                full_text = " ".join(b.text for b in text_blocks)
                database.save_message(session_id, "assistant", full_text)
                words = full_text.split(" ")
                for i, word in enumerate(words):
                    yield word + (" " if i < len(words) - 1 else "")
                if tool_calls_log:
                    yield f"\n\n__TOOL_CALLS__:{json.dumps(tool_calls_log)}"
                return

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in tool_use_blocks:
                result = await _execute(block.name, block.input, session_id)
                tool_calls_log.append({"tool": block.name, "args": block.input, "result": result})
                tool_results.append({
                    "type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result),
                })
            messages.append({"role": "user", "content": tool_results})

        yield "I ran into an issue completing that action. Please try again."
    except Exception as e:
        logger.info(f"[Agent] Fallback engine error: {e}")
        yield "⚠️ Something went wrong. Please try again."


# ─── Autonomous Daily Planner (the agentic core) ──────────────────────────────


def _extract_json(text: str):
    """Pull the first JSON object/array out of an LLM response."""
    if not text:
        return None
    fenced = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(1))
    except Exception:
        return None


async def generate_daily_plan(session_id: str, auto_schedule: bool = True) -> dict:
    """
    Proactively analyse the user's day and build a plan WITHOUT being asked.
    - Reads today's calendar + open tasks
    - Has the AI write a short motivating plan
    - Optionally auto-creates ONE focus block in the largest free gap for the
      most important task (true autonomous action).
    """
    tz_name = database.get_user_timezone(session_id)
    now_str, tz_name = _local_now_str(tz_name)
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = timezone.utc

    import demo_data
    demo = demo_data.is_demo(session_id)

    if demo:
        events = demo_data.demo_events()
    else:
        try:
            events = calendar_service.get_upcoming_events(session_id, days=1)
        except Exception:
            events = []
    tasks = [t for t in database.get_tasks(session_id) if not t.get("completed")]

    today = datetime.now(tz).strftime("%Y-%m-%d")
    if demo:
        gaps = []  # no real calendar to schedule into
    else:
        try:
            gaps = calendar_service.get_calendar_gaps(session_id, today, duration_minutes=45)
        except Exception:
            gaps = []

    # ── Autonomous action: block focus time for the top task ──
    focus_block = None
    if auto_schedule and tasks and gaps:
        ranked = task_engine.prioritize_tasks([
            {
                "title": t.get("title", ""),
                "deadline": t.get("deadline", ""),
                "importance_score": t.get("importance_score") or 6,
                "effort_estimate": t.get("estimated_minutes") or t.get("effort_estimate") or 60,
            }
            for t in tasks
        ])
        top = ranked[0] if ranked else None
        biggest_gap = max(gaps, key=lambda g: g["duration_minutes"])
        if top and biggest_gap:
            try:
                start = datetime.fromisoformat(biggest_gap["start"])
                block_min = min(top.get("effort_estimate", 60) or 60, biggest_gap["duration_minutes"], 90)
                end = start + timedelta(minutes=block_min)
                # Pass naive local time so calendar_service applies the user tz
                created = calendar_service.create_calendar_event(
                    session_id=session_id,
                    title=f"🎯 Focus: {top['title']}",
                    start_time=start.replace(tzinfo=None).isoformat(),
                    end_time=end.replace(tzinfo=None).isoformat(),
                    description="Auto-scheduled by LastMinute AI to protect deep-work time.",
                    reminder_minutes=10,
                )
                focus_block = {
                    "task": top["title"],
                    "start": created.get("start_time", ""),
                    "end": created.get("end_time", ""),
                    "html_link": created.get("html_link", ""),
                }
            except Exception as e:
                logger.info(f"[DailyPlan] Could not auto-create focus block: {e}")

    # ── AI-written brief ──
    ev_lines = "\n".join(
        f"- {e.get('title','')} at {e.get('start_time','')[:16]}" for e in events[:8]
    ) or "- (no calendar events today)"
    task_lines = "\n".join(
        f"- {t.get('title','')} (due {t.get('deadline','') or 'no deadline'})" for t in tasks[:8]
    ) or "- (no open tasks)"

    prompt = (
        f"It is {now_str} ({tz_name}). Write a SHORT, punchy morning brief (2-3 sentences max) "
        f"for someone who needs to beat their deadlines today. Be specific and motivating, "
        f"reference the actual items, and tell them the ONE thing to start with.\n\n"
        f"TODAY'S CALENDAR:\n{ev_lines}\n\nOPEN TASKS:\n{task_lines}\n"
    )
    if focus_block:
        prompt += (
            f"\nYou have already auto-scheduled a focus block for '{focus_block['task']}'. "
            f"Mention this so they know it's handled."
        )

    brief = await ai_provider.generate(
        prompt,
        system="You are a decisive, calm executive assistant. No fluff, no preamble.",
        max_tokens=400,
    )
    if not brief:
        brief = (
            f"You have {len(events)} event(s) and {len(tasks)} open task(s) today. "
            f"Start with your most urgent deadline and protect your focus time."
        )

    if focus_block:
        database.log_activity(session_id, f"Auto-scheduled focus time for \"{focus_block['task']}\"",
                              "Planned your day from your calendar", icon="sparkles")
    else:
        database.log_activity(session_id, "Generated your daily plan",
                              f"{len(events)} event(s), {len(tasks)} task(s)", icon="sparkles")

    return {
        "brief": brief,
        "events_today": len(events),
        "open_tasks": len(tasks),
        "focus_block": focus_block,
        "provider": ai_provider.active_provider(),
        "generated_at": datetime.now(tz).isoformat(),
    }


async def parse_braindump(session_id: str, text: str) -> dict:
    """
    Turn a chaotic free-text dump into structured, prioritised, saved tasks.
    """
    tz_name = database.get_user_timezone(session_id)
    now_str, tz_name = _local_now_str(tz_name)

    prompt = (
        f"Current local time: {now_str} ({tz_name}).\n"
        f"The user dumped everything on their mind below. Extract every distinct task.\n"
        f"For each, infer a deadline if one is implied (ISO local time, no timezone suffix), "
        f"an importance score 0-10, and an effort estimate in minutes.\n"
        f"Return ONLY a JSON array like:\n"
        f'[{{"title":"...","deadline":"2026-06-26T17:00:00","importance_score":8,"effort_estimate":120}}]\n\n'
        f"BRAIN DUMP:\n{text}"
    )
    raw = await ai_provider.generate(
        prompt,
        system="You are a precise task extraction engine. Output valid JSON only, nothing else.",
        max_tokens=1500,
    )
    parsed = _extract_json(raw)
    if not isinstance(parsed, list):
        return {"tasks": [], "count": 0, "error": "Could not parse tasks from that. Try rephrasing."}

    prioritized = task_engine.prioritize_tasks(parsed)
    for t in prioritized:
        t["source"] = "ai"
        database.save_task(session_id, t)

    database.log_activity(session_id, f"Extracted {len(prioritized)} task(s) from your brain dump",
                          icon="brain")
    return {"tasks": prioritized, "count": len(prioritized), "provider": ai_provider.active_provider()}


async def parse_image_tasks(session_id: str, image_bytes: bytes, mime_type: str) -> dict:
    """
    Google Gemini Vision: read a photo/screenshot (syllabus, assignment sheet,
    whiteboard, timetable) and extract every deadline into structured tasks.
    """
    if not ai_provider.vision_available():
        return {"tasks": [], "count": 0, "error": "Vision requires a Gemini API key."}

    tz_name = database.get_user_timezone(session_id)
    now_str, tz_name = _local_now_str(tz_name)
    prompt = (
        f"Current local time: {now_str} ({tz_name}).\n"
        f"This image contains deadlines, assignments, a syllabus, a timetable, or a to-do list.\n"
        f"Extract EVERY actionable task with a deadline. For each, give a title, a deadline as ISO "
        f"local time (no timezone suffix; infer the year as the current or next occurrence), an "
        f"importance score 0-10, and an effort estimate in minutes.\n"
        f"Return ONLY a JSON array like:\n"
        f'[{{"title":"...","deadline":"2026-06-30T17:00:00","importance_score":8,"effort_estimate":120}}]'
    )
    raw = await ai_provider.generate_from_image(prompt, image_bytes, mime_type)
    parsed = _extract_json(raw)
    if not isinstance(parsed, list) or not parsed:
        return {"tasks": [], "count": 0, "error": "Couldn't read tasks from that image. Try a clearer photo."}

    prioritized = task_engine.prioritize_tasks(parsed)
    for t in prioritized:
        t["source"] = "ai"
        database.save_task(session_id, t)

    database.log_activity(session_id, f"Scanned an image and extracted {len(prioritized)} task(s)",
                          "Gemini Vision", icon="camera")
    return {"tasks": prioritized, "count": len(prioritized), "provider": "gemini"}


async def breakdown_goal(goal_title: str, target_date: str = "") -> dict:
    """Use Gemini to break a goal into 4-6 concrete, sequential, actionable milestones."""
    when = f" The target date is {target_date}." if target_date else ""
    prompt = (
        f"Break the following goal into 4-6 concrete, sequential, actionable milestones.{when}\n"
        f"Each milestone is a short imperative step (max ~10 words).\n"
        f'Return ONLY a JSON array of strings, e.g. ["Step one", "Step two"].\n\n'
        f"GOAL: {goal_title}"
    )
    raw = await ai_provider.generate(
        prompt,
        system="You are a goal-planning assistant. Output a valid JSON array of strings only.",
        max_tokens=600,
    )
    parsed = _extract_json(raw)
    milestones = []
    if isinstance(parsed, list):
        for m in parsed:
            text = m if isinstance(m, str) else (m.get("text") or m.get("title") or "")
            if text:
                milestones.append({"text": str(text).strip(), "done": False})
    return {"milestones": milestones, "provider": ai_provider.active_provider()}
