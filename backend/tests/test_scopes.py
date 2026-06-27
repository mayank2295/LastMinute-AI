"""OAuth scopes should stay least-privilege (calendar.events, not full calendar)."""
import calendar_service


def test_uses_calendar_events_scope():
    assert "https://www.googleapis.com/auth/calendar.events" in calendar_service.SCOPES


def test_does_not_request_full_calendar_scope():
    # Full 'calendar' grants access to all calendars/settings/ACLs — we don't need it.
    assert "https://www.googleapis.com/auth/calendar" not in calendar_service.SCOPES


def test_requests_basic_signin_scopes():
    assert "https://www.googleapis.com/auth/userinfo.email" in calendar_service.SCOPES
    assert "https://www.googleapis.com/auth/userinfo.profile" in calendar_service.SCOPES
    assert "openid" in calendar_service.SCOPES


def test_no_gmail_or_drive_scopes():
    joined = " ".join(calendar_service.SCOPES)
    assert "gmail" not in joined
    assert "auth/drive" not in joined
