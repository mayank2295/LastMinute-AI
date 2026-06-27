"""Pydantic request/response models validate as expected."""
import pytest
from pydantic import ValidationError

import models


def test_priority_enum_values():
    assert models.Priority.URGENT_IMPORTANT.value == "urgent_important"
    assert {p.value for p in models.Priority} == {
        "urgent_important", "important", "urgent", "neither"
    }


def test_create_task_request_requires_title():
    ok = models.CreateTaskRequest(title="Write report")
    assert ok.title == "Write report"
    assert ok.source == "manual"
    with pytest.raises(ValidationError):
        models.CreateTaskRequest()  # missing required title


def test_chat_request_requires_message_and_session():
    req = models.ChatRequest(message="hi", session_id="s1")
    assert req.message == "hi"
    with pytest.raises(ValidationError):
        models.ChatRequest(message="hi")  # missing session_id


def test_brain_dump_request():
    assert models.BrainDumpRequest(text="essay due friday").text
