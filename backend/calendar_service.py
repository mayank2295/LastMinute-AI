import os
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

    # Fetch user profile via OAuth2 API
    service = build("oauth2", "v2", credentials=creds)
    user_info = service.userinfo().get().execute()

    database.save_session(
        session_id=session_id,
        user_id=user_info.get("email", ""),
        access_token=creds.token,
        refresh_token=creds.refresh_token or "",
        token_expiry=creds.expiry.isoformat() if creds.expiry else "",
    )

    return {
        "email": user_info.get("email", ""),
        "name": user_info.get("name", ""),
    }


def get_credentials(session_id: str) -> Optional[Credentials]:
    session = database.get_session(session_id)
    if not session:
        return None

    creds = Credentials(
        token=session["access_token"],
        refresh_token=session["refresh_token"],
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=SCOPES,
    )

    # Auto-refresh expired token and persist updated tokens to Firestore
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        database.save_session(
            session_id=session_id,
            user_id=session["user_id"],
            access_token=creds.token,
            refresh_token=creds.refresh_token,
            token_expiry=creds.expiry.isoformat() if creds.expiry else "",
        )

    return creds


def get_upcoming_events(session_id: str, days: int = 7) -> List[dict]:
    creds = get_credentials(session_id)
    if not creds:
        raise ValueError("Not authenticated")

    service = build("calendar", "v3", credentials=creds)
    now = datetime.utcnow().replace(tzinfo=timezone.utc)
    time_max = now + timedelta(days=days)

    result = service.events().list(
        calendarId="primary",
        timeMin=now.isoformat(),
        timeMax=time_max.isoformat(),
        maxResults=50,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for ev in result.get("items", []):
        start = ev["start"].get("dateTime", ev["start"].get("date", ""))
        end = ev["end"].get("dateTime", ev["end"].get("date", ""))
        events.append({
            "id": ev["id"],
            "title": ev.get("summary", "Untitled Event"),
            "start_time": start,
            "end_time": end,
            "description": ev.get("description", ""),
            "location": ev.get("location", ""),
            "html_link": ev.get("htmlLink", ""),
        })
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
        "end": {"dateTime": end_time, "timeZone": "UTC"},
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": reminder_minutes},
                {"method": "email", "minutes": reminder_minutes * 2},
            ],
        },
    }

    created = service.events().insert(calendarId="primary", body=body).execute()
    return {
        "id": created["id"],
        "title": created.get("summary", ""),
        "start_time": created["start"].get("dateTime", ""),
        "end_time": created["end"].get("dateTime", ""),
        "html_link": created.get("htmlLink", ""),
    }


def get_calendar_gaps(session_id: str, date: str, duration_minutes: int = 60) -> List[dict]:
    creds = get_credentials(session_id)
    if not creds:
        raise ValueError("Not authenticated")

    service = build("calendar", "v3", credentials=creds)

    target = datetime.fromisoformat(date).replace(tzinfo=timezone.utc)
    day_start = target.replace(hour=8, minute=0, second=0, microsecond=0)
    day_end = target.replace(hour=20, minute=0, second=0, microsecond=0)

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
    slots = []
    cursor = day_start

    for bs, be in busy:
        if cursor + timedelta(minutes=duration_minutes) <= bs:
            slots.append({
                "start": cursor.isoformat(),
                "end": bs.isoformat(),
                "duration_minutes": int((bs - cursor).total_seconds() / 60),
            })
        cursor = max(cursor, be)

    if cursor + timedelta(minutes=duration_minutes) <= day_end:
        slots.append({
            "start": cursor.isoformat(),
            "end": day_end.isoformat(),
            "duration_minutes": int((day_end - cursor).total_seconds() / 60),
        })

    return [s for s in slots if s["duration_minutes"] >= duration_minutes]
