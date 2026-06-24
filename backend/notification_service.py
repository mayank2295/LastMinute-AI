import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional

from pywebpush import webpush, WebPushException

import database

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_EMAIL = os.getenv("VAPID_EMAIL", "admin@lastminute.ai")


def send_push(subscription: dict, title: str, body: str, extra: dict = None) -> bool:
    if not VAPID_PRIVATE_KEY:
        print(f"[PUSH] VAPID key not set — skipping: {title}")
        return False
    try:
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
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_EMAIL}"},
        )
        return True
    except WebPushException as e:
        print(f"[PUSH] Failed: {e}")
        return False
    except Exception as e:
        print(f"[PUSH] Error: {e}")
        return False


async def check_and_send_reminders():
    """Background loop — checks every 5 minutes for due reminders."""
    while True:
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

                    if not r["reminder_24h_sent"] and 22 <= hours <= 26:
                        send_push(
                            sub,
                            f"⏰ 24h Reminder: {task}",
                            f"Deadline tomorrow at {dl.strftime('%I:%M %p')} UTC",
                            {"type": "24h", "deadline": dl_str},
                        )
                        database.update_reminder_sent(r["id"], "24h")

                    elif not r["reminder_2h_sent"] and 1.5 <= hours <= 2.5:
                        send_push(
                            sub,
                            f"🚨 2h Warning: {task}",
                            "Due in 2 hours — time to wrap up!",
                            {"type": "2h", "deadline": dl_str},
                        )
                        database.update_reminder_sent(r["id"], "2h")

                    elif not r["reminder_30m_sent"] and 0.25 <= hours <= 0.75:
                        send_push(
                            sub,
                            f"🔴 FINAL WARNING: {task}",
                            "30 minutes left — submit NOW!",
                            {"type": "30m", "deadline": dl_str},
                        )
                        database.update_reminder_sent(r["id"], "30m")

                except Exception as e:
                    print(f"[REMINDER] Error processing id={r['id']}: {e}")

        except Exception as e:
            print(f"[REMINDER] Loop error: {e}")

        await asyncio.sleep(300)  # 5-minute interval
