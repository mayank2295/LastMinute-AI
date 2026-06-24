import os

os.environ.setdefault("OAUTHLIB_RELAX_TOKEN_SCOPE", "1")

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

import database

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
    "https://www.googleapis.com/auth/userinfo.profile",
]

_DEFAULT_REDIRECT = "http://localhost:8000/api/auth/callback/google"


def _redirect_uri() -> str:
    return os.getenv("GOOGLE_REDIRECT_URI", _DEFAULT_REDIRECT)


def _client_config() -> dict:
    return {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [_redirect_uri()],
        }
    }


def get_auth_url(session_id: str) -> str:
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES)
    flow.redirect_uri = _redirect_uri()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        state=session_id,
        prompt="consent",
    )
    return auth_url


def handle_oauth_callback(code: str, session_id: str) -> dict:
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, state=session_id)
    flow.redirect_uri = _redirect_uri()
    flow.fetch_token(code=code)
    creds = flow.credentials

    print(f"[OAuth] Token received — has refresh_token: {bool(creds.refresh_token)}, expiry: {creds.expiry}")

    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()

    database.save_session(
        session_id=session_id,
        user_id=user_info.get("email", ""),
        access_token=creds.token,
        refresh_token=creds.refresh_token or "",
        token_expiry=creds.expiry.isoformat() if creds.expiry else "",
    )

    print(f"[OAuth] Session saved for {user_info.get('email')} with session_id={session_id[:8]}...")
    return {
        "email": user_info.get("email", ""),
        "name": user_info.get("name", ""),
    }


def get_credentials(session_id: str) -> Optional[Credentials]:
    session = database.get_session(session_id)
    if not session:
        print(f"[Auth] ERROR — no session found for id={session_id[:8]}...")
        return None

    email = session.get("user_id", "unknown")
    has_refresh = bool(session.get("refresh_token"))
    expiry_str = session.get("token_expiry", "")
    print(f"[Auth] Session found for {email} | has_refresh={has_refresh} | stored_expiry={expiry_str!r}")

    # Parse the stored expiry string.
    # IMPORTANT: Google's Credentials class compares expiry against datetime.utcnow()
    # which is NAIVE. We must store expiry as naive UTC, not as an aware datetime.
    expiry_naive: Optional[datetime] = None
    if expiry_str:
        try:
            dt = datetime.fromisoformat(expiry_str)
            if dt.tzinfo is not None:
                # Convert aware >> naive UTC
                expiry_naive = dt.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                expiry_naive = dt  # already naive UTC
        except Exception as parse_err:
            print(f"[Auth] Could not parse token_expiry: {parse_err}")

    creds = Credentials(
        token=session["access_token"],
        refresh_token=session.get("refresh_token") or None,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES,
        expiry=expiry_naive,   # naive UTC — Google lib requirement
    )

    print(f"[Auth] creds.valid={creds.valid}, creds.expired={creds.expired}, creds.expiry={creds.expiry}")

    # Proactively refresh if expired OR within 5 minutes of expiry.
    # Use naive UTC for comparison to match Google's internals.
    now_naive = datetime.utcnow()
    buffer = timedelta(minutes=5)
    needs_refresh = (
        (creds.expired and creds.refresh_token) or
        (expiry_naive is not None and expiry_naive - now_naive < buffer and creds.refresh_token)
    )

    if needs_refresh:
        print("[Auth] Token expired/expiring — refreshing...")
        try:
            creds.refresh(Request())
            database.save_session(
                session_id=session_id,
                user_id=session["user_id"],
                access_token=creds.token,
                refresh_token=creds.refresh_token or session.get("refresh_token", ""),
                token_expiry=creds.expiry.isoformat() if creds.expiry else "",
            )
            print(f"[Auth] Token refreshed, new expiry: {creds.expiry}")
        except Exception as refresh_err:
            print(f"[Auth] Token refresh FAILED: {refresh_err}")
    else:
        print("[Auth] Token still valid, no refresh needed")

    return creds


def get_upcoming_events(session_id: str, days: int = 7) -> List[dict]:
    creds = get_credentials(session_id)
    if not creds:
        raise ValueError("Not authenticated — no session found")

    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(timezone.utc)
    time_max = now + timedelta(days=days)

    print(f"[Calendar] Listing events | session={session_id[:8]}... | timeMin={now.isoformat()} | timeMax={time_max.isoformat()}")

    try:
        result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=time_max.isoformat(),
            maxResults=50,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
    except Exception as api_err:
        print(f"[Calendar] Google API error: {api_err}")
        raise

    items = result.get("items", [])
    print(f"[Calendar] Raw Google API returned {len(items)} item(s)")

    if not items:
        # Extra diagnostic: check if calendar list itself works
        try:
            cal_list = service.calendarList().list().execute()
            cals = cal_list.get("items", [])
            print(f"[Calendar] Calendar list has {len(cals)} calendar(s):")
            for c in cals[:5]:
                print(f"  - {c.get('id')} | {c.get('summary')} | primary={c.get('primary', False)}")
        except Exception as list_err:
            print(f"[Calendar] Could not list calendars: {list_err}")

    events = []
    for ev in items:
        start = ev["start"].get("dateTime", ev["start"].get("date", ""))
        end   = ev["end"].get("dateTime",   ev["end"].get("date",   ""))
        events.append({
            "id":          ev["id"],
            "title":       ev.get("summary", "Untitled Event"),
            "start_time":  start,
            "end_time":    end,
            "description": ev.get("description", ""),
            "location":    ev.get("location", ""),
            "html_link":   ev.get("htmlLink", ""),
        })
        print(f"[Calendar]   >> {start[:16] if start else '?'} | {ev.get('summary', 'Untitled')}")

    print(f"[Calendar] Returning {len(events)} event(s)")
    return events


def create_calendar_event(
    session_id: str,
    title: str,
    start_time: str,
    end_time: str,
    description: str = "",
    reminder_minutes: int = 30,
) -> dict:
    creds = get_credentials(session_id)
    if not creds:
        raise ValueError("Not authenticated")

    service = build("calendar", "v3", credentials=creds)

    body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start_time, "timeZone": "UTC"},
        "end":   {"dateTime": end_time,   "timeZone": "UTC"},
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": reminder_minutes},
                {"method": "email", "minutes": reminder_minutes * 2},
            ],
        },
    }

    print(f"[Calendar] Creating event: {title!r} {start_time} >> {end_time}")
    try:
        created = service.events().insert(calendarId="primary", body=body).execute()
    except Exception as e:
        print(f"[Calendar] Create event failed: {e}")
        raise

    print(f"[Calendar] Event created: {created.get('htmlLink')}")
    return {
        "id":         created["id"],
        "title":      created.get("summary", ""),
        "start_time": created["start"].get("dateTime", ""),
        "end_time":   created["end"].get("dateTime", ""),
        "html_link":  created.get("htmlLink", ""),
    }


def get_calendar_gaps(session_id: str, date: str, duration_minutes: int = 60) -> List[dict]:
    creds = get_credentials(session_id)
    if not creds:
        raise ValueError("Not authenticated")

    service = build("calendar", "v3", credentials=creds)

    target    = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    day_start = target.replace(hour=8,  minute=0, second=0, microsecond=0)
    day_end   = target.replace(hour=20, minute=0, second=0, microsecond=0)

    result = service.events().list(
        calendarId="primary",
        timeMin=day_start.isoformat(),
        timeMax=day_end.isoformat(),
        maxResults=30,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    busy = []
    for ev in result.get("items", []):
        s = ev["start"].get("dateTime", "")
        e = ev["end"].get("dateTime", "")
        if s and e:
            busy.append((
                datetime.fromisoformat(s.replace("Z", "+00:00")),
                datetime.fromisoformat(e.replace("Z", "+00:00")),
            ))

    busy.sort(key=lambda x: x[0])
    slots  = []
    cursor = day_start

    for bs, be in busy:
        if cursor + timedelta(minutes=duration_minutes) <= bs:
            slots.append({
                "start":            cursor.isoformat(),
                "end":              bs.isoformat(),
                "duration_minutes": int((bs - cursor).total_seconds() / 60),
            })
        cursor = max(cursor, be)

    if cursor + timedelta(minutes=duration_minutes) <= day_end:
        slots.append({
            "start":            cursor.isoformat(),
            "end":              day_end.isoformat(),
            "duration_minutes": int((day_end - cursor).total_seconds() / 60),
        })

    return [s for s in slots if s["duration_minutes"] >= duration_minutes]

