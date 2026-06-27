"""Demo mode helpers — pure, no Firestore needed."""
import demo_data


def test_is_demo_recognizes_demo_sessions():
    assert demo_data.is_demo(demo_data.DEMO_SESSION_ID) is True
    assert demo_data.is_demo("demo-anything") is True


def test_is_demo_rejects_real_and_empty_sessions():
    assert demo_data.is_demo("a1b2c3d4-real-uuid") is False
    assert demo_data.is_demo("") is False


def test_demo_events_are_well_formed():
    events = demo_data.demo_events()
    assert isinstance(events, list) and len(events) >= 3
    for e in events:
        assert e["id"] and e["title"]
        assert e["start_time"] and e["end_time"]


def test_demo_events_are_in_the_future():
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    first = demo_data.demo_events()[0]
    assert datetime.fromisoformat(first["start_time"]) > now
