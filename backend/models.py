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
    estimated_minutes: Optional[int] = None
    source: Optional[str] = "ai"
    completed: bool = False
    created_at: Optional[str] = None


class CreateTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: Optional[str] = None
    estimated_minutes: Optional[int] = None
    source: Optional[str] = "manual"
    add_to_calendar: Optional[bool] = False


class UpdateTaskRequest(BaseModel):
    priority: Optional[str] = None
    quadrant: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    completed: Optional[bool] = None
    estimated_minutes: Optional[int] = None


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


class MoveTaskRequest(BaseModel):
    priority: Priority


class SubscribeRequest(BaseModel):
    subscription: dict
    task_title: str
    deadline: str


class FocusSessionRequest(BaseModel):
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    duration_minutes: int = 25
    completed_at: Optional[str] = None


class BrainDumpRequest(BaseModel):
    text: str


class PushSubscribeRequest(BaseModel):
    subscription: dict


class ProductivityScore(BaseModel):
    score: int
    analysis: str
    recommendations: List[str]
    meeting_load: float
    focus_time_available: int


class CreateGoalRequest(BaseModel):
    title: str
    target_date: Optional[str] = None
    motivation: Optional[str] = None


class UpdateGoalRequest(BaseModel):
    title: Optional[str] = None
    target_date: Optional[str] = None
    motivation: Optional[str] = None
    milestones: Optional[List[dict]] = None
    status: Optional[str] = None


class CreateHabitRequest(BaseModel):
    title: str
    frequency: Optional[str] = "daily"
