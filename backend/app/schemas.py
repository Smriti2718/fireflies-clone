"""Pydantic request/response schemas (the API contract)."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- people ----------
class UserOut(ORM):
    id: int
    name: str
    email: str
    avatar_color: str


class ParticipantOut(ORM):
    id: int
    name: str
    email: str | None
    color: str


class MeetingParticipantOut(ParticipantOut):
    role: str
    talk_time_sec: int = 0


# ---------- transcript / summary ----------
class SegmentOut(ORM):
    id: int
    position: int
    speaker_id: int
    speaker_name: str
    start_ms: int
    end_ms: int
    text: str


class SummaryOut(ORM):
    overview: str
    keywords: list[str]
    generated_by: str
    updated_at: datetime


class ChapterOut(ORM):
    id: int
    title: str
    summary: str
    start_ms: int


class ActionItemOut(ORM):
    id: int
    meeting_id: int
    text: str
    assignee: ParticipantOut | None
    due_date: date | None
    completed: bool
    completed_at: datetime | None
    source_start_ms: int | None
    created_at: datetime


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    assignee_name: str | None = Field(default=None, max_length=120)
    due_date: date | None = None


class ActionItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=2000)
    # "" clears the assignee; None leaves it unchanged
    assignee_name: str | None = Field(default=None, max_length=120)
    due_date: date | None = None
    clear_due_date: bool = False
    completed: bool | None = None


# ---------- meetings ----------
class MeetingListItem(ORM):
    id: int
    title: str
    meeting_date: datetime
    duration_sec: int
    source: str
    platform: str | None
    participants: list[ParticipantOut]
    overview_snippet: str
    keywords: list[str]
    action_items_total: int
    action_items_open: int
    # Present when the list was filtered by a transcript text match.
    match_snippet: str | None = None


class MeetingListOut(BaseModel):
    items: list[MeetingListItem]
    total: int


class MeetingDetail(ORM):
    id: int
    title: str
    meeting_date: datetime
    duration_sec: int
    source: str
    platform: str | None
    media_url: str | None
    created_at: datetime
    updated_at: datetime
    participants: list[MeetingParticipantOut]
    segments: list[SegmentOut]
    summary: SummaryOut | None
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]


TranscriptFormat = Literal["auto", "txt", "vtt", "json"]


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    meeting_date: datetime | None = None
    participants: list[str] = Field(default_factory=list)
    platform: str | None = Field(default=None, max_length=32)
    transcript_text: str | None = None
    transcript_format: TranscriptFormat = "auto"
    generate_summary: bool = True


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    meeting_date: datetime | None = None
    participants: list[str] | None = None
    platform: str | None = Field(default=None, max_length=32)


class SummaryUpdate(BaseModel):
    overview: str | None = None
    keywords: list[str] | None = None


# ---------- ask ----------
class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class AskMessageOut(ORM):
    id: int
    role: str
    content: str
    citations: list[int]
    created_at: datetime


class AskExchangeOut(BaseModel):
    question: AskMessageOut
    answer: AskMessageOut
