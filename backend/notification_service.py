import os
import json
import asyncio
from datetime import datetime, timezone

from pywebpush import webpush, WebPushException

import database


def send_push(subscription: dict, title: str, body: str, extra: dict = None) -> bool:
    vapid_private = os.getenv("VAPID_PRIVATE_KEY", "")
    if not vapid_private:
        print(f"[PUSH] VAPID_PRIVATE_KEY not set — skipping: {title}")
        return False
    try:
        vapid_email = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:admin@lastminuteai.com")
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/icon-192.png",
            "badge": "/badge.png",
            "data": extra or {},
            "vibrate": [200, 100, 200],
        })
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=vapid_private,
            vapid_claims={"sub": vapid_email},
        )
        return True
    except WebPushException as e:
        print(f"[PUSH] Failed: {e}")
        return False
    except Exception as e:
        print(f"[PUSH] Error: {e}")
        return False


def run_reminder_check() -> dict:
    """
    Check all pending reminders once and fire any that are due.
    Callable from a Cloud Scheduler cron endpoint (reliable on scale-to-zero)
    AND from the in-process loop (works in local dev).
    Returns a summary of what was sent.
    """
    sent = {"24h": 0, "2h": 0, "30m": 0}
    try:
        pending = database.get_pending_reminders()
        now = datetime.now(timezone.utc)

        for r in pending:
            try:
                dl_str = r["deadline"]
                dl = datetime.fromisoformat(dl_str.replace("Z", "+00:00"))
                if not dl.tzinfo:
                    dl = dl.replace(tzinfo=timezone.utc)

                hours = (dl - now).total_seconds() / 3600
                sub_str = r.get("push_subscription", "")
                if not sub_str:
                    continue
                sub = json.loads(sub_str)
                task = r["task_title"]
                doc_id = r["id"]  # Firestore document ID

                sid = r.get("session_id", "")

                if not r["reminder_24h_sent"] and 22 <= hours <= 26:
                    send_push(sub, f"⏰ 24h Reminder: {task}",
                              f"Deadline tomorrow at {dl.strftime('%I:%M %p')} UTC",
                              {"type": "24h", "deadline": dl_str})
                    database.update_reminder_sent(doc_id, "24h")
                    if sid:
                        database.log_activity(sid, f"Sent 24-hour reminder for \"{task}\"", icon="bell")
                    sent["24h"] += 1

                elif not r["reminder_2h_sent"] and 1.5 <= hours <= 2.5:
                    send_push(sub, f"🚨 2h Warning: {task}",
                              "Due in 2 hours — time to wrap up!",
                              {"type": "2h", "deadline": dl_str})
                    database.update_reminder_sent(doc_id, "2h")
                    if sid:
                        database.log_activity(sid, f"Sent 2-hour warning for \"{task}\"", icon="bell")
                    sent["2h"] += 1

                elif not r["reminder_30m_sent"] and 0.25 <= hours <= 0.75:
                    send_push(sub, f"🔴 FINAL WARNING: {task}",
                              "30 minutes left — submit NOW!",
                              {"type": "30m", "deadline": dl_str})
                    database.update_reminder_sent(doc_id, "30m")
                    if sid:
                        database.log_activity(sid, f"Sent final 30-min warning for \"{task}\"", icon="bell")
                    sent["30m"] += 1

            except Exception as e:
                print(f"[REMINDER] Error processing doc={r.get('id')}: {e}")

    except Exception as e:
        print(f"[REMINDER] Check error: {e}")

    return {"checked": True, "sent": sent}


async def check_and_send_reminders():
    """Background loop fallback for local dev — checks every 5 minutes."""
    while True:
        run_reminder_check()
        await asyncio.sleep(300)
