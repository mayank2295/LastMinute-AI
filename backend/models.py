from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum


class Priority(str, Enum):
    URGENT_IMPORTANT = "urgent_important"
    IMPORTANT = "important"
    URGENT = "urgent"
    NEITHER = "neither"


class Task(BaseModel):
    id: Optional[str] = None
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[Priority] = None
    urgency_score: Optional[float] = None
    importance_score: Optional[float] = None
    effort_estimate: Optional[int] = None
    completed: bool = False
    created_at: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: str


class CalendarEvent(BaseModel):
    id: str
    title: str
    start_time: str
    end_time: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    html_link: Optional[str] = None


class CreateEventRequest(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None
    reminder_minutes: Optional[int] = 30


class PrioritizeRequest(BaseModel):
    tasks: List[dict]


class SubscribeRequest(BaseModel):
    subscription: dict
    task_title: str
    deadline: str


class ProductivityScore(BaseModel):
    score: int
    analysis: str
    recommendations: List[str]
    meeting_load: float
    focus_time_available: int
