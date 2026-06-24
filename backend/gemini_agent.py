import os
import json
from datetime import datetime, timezone
from typing import AsyncGenerator

import google.generativeai as genai
from google.generativeai import protos

import database
import calendar_service
import task_engine

genai.configure(api_key=os.getenv("GEMINI_API_KEY", ""))

# ─── Tool Declarations ────────────────────────────────────────────────────────

_TOOL_DECLARATIONS = [
    protos.FunctionDeclaration(
        name="create_calendar_event",
        description="Creates a real event in the user's Google Calendar and returns the event link.",
        parameters=protos.Schema(
            type=protos.Type.OBJECT,
            properties={
                "title":            protos.Schema(type=protos.Type.STRING, description="Event title"),
                "start_time":       protos.Schema(type=protos.Type.STRING, description="ISO 8601 start time"),
                "end_time":         protos.Schema(type=protos.Type.STRING, description="ISO 8601 end time"),
                "description":      protos.Schema(type=protos.Type.STRING, description="Optional description"),
                "reminder_minutes": protos.Schema(type=protos.Type.INTEGER, description="Popup reminder minutes before"),
            },
            required=["title", "start_time", "end_time"],
        ),
    ),
    protos.FunctionDeclaration(
        name="get_upcoming_deadlines",
        description="Fetches real upcoming events from the user's Google Calendar for the next N days.",
        parameters=protos.Schema(
            type=protos.Type.OBJECT,
            properties={
                "days": protos.Schema(type=protos.Type.INTEGER, description="Days ahead to look"),
            },
            required=["days"],
        ),
    ),
    protos.FunctionDeclaration(
        name="prioritize_tasks",
        description=(
            "Scores and ranks a list of tasks using urgency (deadline proximity), "
            "importance (user-defined 0-10), and effort estimate. "
            "Assigns each task to the correct Eisenhower matrix quadrant."
        ),
        parameters=protos.Schema(
            type=protos.Type.OBJECT,
            properties={
                "tasks": protos.Schema(
                    type=protos.Type.ARRAY,
                    description="List of tasks to prioritize",
                    items=protos.Schema(
                        type=protos.Type.OBJECT,
                        properties={
                            "title":            protos.Schema(type=protos.Type.STRING),
                            "deadline":         protos.Schema(type=protos.Type.STRING),
                            "importance_score": protos.Schema(type=protos.Type.NUMBER),
                            "effort_estimate":  protos.Schema(type=protos.Type.INTEGER,
                                                              description="Estimated minutes"),
                            "description":      protos.Schema(type=protos.Type.STRING),
                        },
                    ),
                ),
            },
            required=["tasks"],
        ),
    ),
    protos.FunctionDeclaration(
        name="suggest_time_blocks",
        description="Finds free calendar gaps on a given date and suggests the best focus time slots.",
        parameters=protos.Schema(
            type=protos.Type.OBJECT,
            properties={
                "date":             protos.Schema(type=protos.Type.STRING,
                                                  description="Date as YYYY-MM-DD"),
                "duration_minutes": protos.Schema(type=protos.Type.INTEGER,
                                                  description="Required block length in minutes"),
            },
            required=["date", "duration_minutes"],
        ),
    ),
    protos.FunctionDeclaration(
        name="set_escalating_reminder",
        description=(
            "Schedules browser push notifications at 24 h, 2 h, and 30 min "
            "before a task deadline."
        ),
        parameters=protos.Schema(
            type=protos.Type.OBJECT,
            properties={
                "task_title":        protos.Schema(type=protos.Type.STRING),
                "deadline":          protos.Schema(type=protos.Type.STRING,
                                                   description="ISO 8601 deadline"),
                "push_subscription": protos.Schema(type=protos.Type.STRING,
                                                   description="JSON-encoded push subscription"),
            },
            required=["task_title", "deadline"],
        ),
    ),
]

_TOOLS = [protos.Tool(function_declarations=_TOOL_DECLARATIONS)]

# ─── System Prompt ────────────────────────────────────────────────────────────

_SYSTEM = f"""You are LastMinute AI — a mission-critical productivity co-pilot built for people in deadline panic.
Today's date/time (UTC): {datetime.now(timezone.utc).strftime('%A %d %B %Y, %H:%M')} UTC.

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
    """Run a multi-turn Gemini agent conversation, streaming text back."""

    # Load history and save incoming message
    history_rows = database.get_conversation_history(session_id, limit=20)
    database.save_message(session_id, "user", message)

    # Build Gemini history (skip the very last user message — we'll send it fresh)
    gemini_history = []
    for msg in history_rows:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [{"text": msg["content"]}]})

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=_SYSTEM,
        tools=_TOOLS,
    )

    chat = model.start_chat(history=gemini_history)

    tool_calls_log = []
    current_message = message

    # Agentic loop: keep going until the model produces text (no more tool calls)
    for _iteration in range(10):  # safety cap
        response = chat.send_message(current_message)
        candidate = response.candidates[0]

        # Check for function calls
        function_parts = [
            p for p in candidate.content.parts
            if hasattr(p, "function_call") and p.function_call.name
        ]

        if not function_parts:
            # Pure text response — extract and stream
            full_text = "".join(
                p.text for p in candidate.content.parts
                if hasattr(p, "text") and p.text
            )
            database.save_message(session_id, "assistant", full_text)

            # Stream word by word for a natural feel
            words = full_text.split(" ")
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")

            # Append tool call summary for frontend to update the task board
            if tool_calls_log:
                yield f"\n\n__TOOL_CALLS__:{json.dumps(tool_calls_log)}"
            return

        # Execute all function calls in this turn
        tool_responses = []
        for part in function_parts:
            fc = part.function_call
            result = await _execute(fc.name, dict(fc.args), session_id)
            tool_calls_log.append({"tool": fc.name, "args": dict(fc.args), "result": result})
            tool_responses.append({
                "function_response": {
                    "name": fc.name,
                    "response": result,
                }
            })

        # Feed all results back — send as a list of parts
        current_message = tool_responses if len(tool_responses) > 1 else tool_responses[0]

    # Fallback if loop cap hit
    yield "I ran into an issue completing that action. Please try again."
