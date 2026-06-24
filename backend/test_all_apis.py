"""
Full API smoke-test. Run with:
    python test_all_apis.py
Requires the backend to be running on localhost:8000.
"""
import json, sys, os
from datetime import datetime, timedelta, timezone
sys.path.insert(0, os.path.dirname(__file__))

import requests
from dotenv import load_dotenv
load_dotenv()

BASE = "http://localhost:8000"
PASS = "[PASS]"
FAIL = "[FAIL]"
WARN = "[WARN]"
results = []

def check(name, ok, detail=""):
    tag = PASS if ok else FAIL
    print(f"  {tag} {name}" + (f" â€” {detail}" if detail else ""))
    results.append((name, ok))

def section(title):
    print(f"\n{'='*50}")
    print(f"  {title}")
    print(f"{'='*50}")


# â”€â”€ Find a real session_id from Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def get_real_session_id():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        from dotenv import load_dotenv
        load_dotenv()

        if not firebase_admin._apps:
            raw_key = os.getenv("FIREBASE_PRIVATE_KEY", "")
            private_key = raw_key.replace("\\n", "\n")
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": os.getenv("FIREBASE_PROJECT_ID"),
                "private_key": private_key,
                "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred)

        db = firestore.client()
        docs = list(db.collection("sessions").limit(5).stream())
        if not docs:
            return None, None
        # prefer the most recent one
        best = sorted(docs, key=lambda d: d.to_dict().get("updated_at", ""), reverse=True)[0]
        data = best.to_dict()
        return best.id, data.get("user_id", "unknown")
    except Exception as e:
        print(f"  {WARN} Could not query Firestore directly: {e}")
        return None, None


# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
section("1. Health & Auth (no token required)")
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

r = requests.get(f"{BASE}/health")
check("GET /health", r.status_code == 200, r.json().get("status"))

r = requests.get(f"{BASE}/api/auth/login")
ok = r.status_code == 200 and "auth_url" in r.json()
check("GET /api/auth/login", ok, f"auth_url starts with {r.json().get('auth_url','')[:40]}â€¦" if ok else r.text[:80])
LOGIN_SID = r.json().get("session_id", "")

r = requests.get(f"{BASE}/api/notifications/vapid-key")
ok = r.status_code == 200 and bool(r.json().get("public_key"))
check("GET /api/notifications/vapid-key", ok, r.json().get("public_key","")[:30]+"â€¦" if ok else r.text[:80])

# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
section("2. Finding an authenticated session in Firestore")
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

SID, EMAIL = get_real_session_id()
if SID:
    print(f"  {PASS} Found session for {EMAIL} â€” id={SID[:8]}â€¦")
else:
    print(f"  {WARN} No sessions found â€” skipping auth-required tests")

if SID:
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("3. Session debug â€” token state")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/debug/session/{SID}")
    d = r.json()
    check("GET /api/debug/session", r.status_code == 200, "")
    print(f"    user_id:           {d.get('user_id')}")
    print(f"    has_access_token:  {d.get('has_access_token')}")
    print(f"    has_refresh_token: {d.get('has_refresh_token')}")
    print(f"    token_expiry:      {d.get('token_expiry')}")
    print(f"    updated_at:        {d.get('updated_at')}")

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("4. /api/me â€” session resolution")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/me?session_id={SID}")
    ok = r.status_code == 200 and bool(r.json().get("email"))
    check("GET /api/me", ok, r.json() if ok else r.text[:120])

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("5. Calendar events â€” THE CRITICAL TEST")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/calendar/events/{SID}?days=30")
    ok = r.status_code == 200
    events = r.json().get("events", []) if ok else []
    check(f"GET /api/calendar/events (30-day window)", ok, f"{len(events)} event(s) returned")
    if ok and not events:
        print(f"    {WARN} 0 events â€” trying 90-day windowâ€¦")
        r2 = requests.get(f"{BASE}/api/calendar/events/{SID}?days=90")
        ev2 = r2.json().get("events", []) if r2.status_code == 200 else []
        print(f"    90-day result: {len(ev2)} event(s)")
    if events:
        for ev in events[:3]:
            print(f"    â†’ {ev.get('start_time','?')[:16]} | {ev.get('title')}")
    if not ok:
        print(f"    Error: {r.text[:200]}")

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("6. Tasks")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/tasks/{SID}")
    ok = r.status_code == 200
    tasks = r.json().get("tasks", []) if ok else []
    check("GET /api/tasks", ok, f"{len(tasks)} task(s)")
    if tasks:
        for t in tasks[:3]:
            print(f"    â†’ [{t.get('priority','?'):20s}] {t.get('title','?')}")

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("7. Productivity score")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/productivity/{SID}")
    ok = r.status_code == 200 and "score" in r.json()
    check("GET /api/productivity", ok, f"score={r.json().get('score')} focus={r.json().get('focus_time_available')}min" if ok else r.text[:80])

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("8. Reminders")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/reminders/{SID}")
    ok = r.status_code == 200
    rems = r.json().get("reminders", []) if ok else []
    check("GET /api/reminders", ok, f"{len(rems)} reminder(s)")

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("9. Morning Briefing")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    r = requests.get(f"{BASE}/api/briefing/{SID}")
    ok = r.status_code == 200 and "greeting" in r.json()
    check("GET /api/briefing", ok, r.json().get("greeting","") + " " + r.json().get("first_name","") if ok else r.text[:80])

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("10. Chat / AI Agent (Claude)")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    print("  Sending test message to Claudeâ€¦")
    r = requests.post(
        f"{BASE}/api/chat",
        json={"message": "Say 'API OK' and nothing else.", "session_id": SID},
        stream=True, timeout=30,
    )
    ok = r.status_code == 200
    if ok:
        chunks = []
        for line in r.iter_lines():
            if line:
                line = line.decode() if isinstance(line, bytes) else line
                if line.startswith("data: "):
                    payload = line[6:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        chunks.append(json.loads(payload).get("chunk", ""))
                    except Exception:
                        pass
        reply = "".join(chunks).replace("\n\n__TOOL_CALLS__:", "").strip()
        check("POST /api/chat (Claude SSE)", bool(reply), f"Reply: {reply[:80]}")
    else:
        check("POST /api/chat (Claude SSE)", False, f"HTTP {r.status_code}: {r.text[:80]}")

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("11. Calendar gaps")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    today = datetime.now().strftime("%Y-%m-%d")
    r = requests.get(f"{BASE}/api/calendar/gaps/{SID}?date={today}&duration_minutes=60")
    ok = r.status_code == 200
    gaps = r.json().get("gaps", []) if ok else []
    check("GET /api/calendar/gaps", ok, f"{len(gaps)} slot(s) today")

    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    section("12. Prioritize tasks (task engine)")
    # â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
    r = requests.post(f"{BASE}/api/tasks/{SID}/prioritize", json={
        "tasks": [
            {"title": "Test task A", "deadline": tomorrow, "importance_score": 8},
            {"title": "Test task B", "deadline": tomorrow, "importance_score": 3},
        ]
    })
    ok = r.status_code == 200 and len(r.json().get("tasks", [])) == 2
    check("POST /api/tasks/prioritize", ok, f"{len(r.json().get('tasks',[]))} tasks scored" if ok else r.text[:80])

# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
section("SUMMARY")
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

total  = len(results)
passed = sum(1 for _, ok in results if ok)
failed = [(name, ok) for name, ok in results if not ok]

print(f"\n  {passed}/{total} tests passed")
if failed:
    print(f"\n  FAILED:")
    for name, _ in failed:
        print(f"    {FAIL} {name}")
else:
    print(f"\n  All tests passed!")

