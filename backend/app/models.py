"""ORM models — the database schema.

users ─1:N─ meetings ─1:N─ transcript_segments ─N:1─ participants
                     ├─1:1─ summaries
                     ├─1:N─ chapters
                     ├─1:N─ action_items ─N:1─ participants (assignee)
                     ├─1:N─ ask_messages
                     └─N:M─ participants   (via meeting_participants)
"""
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    """Workspace owner. Auth is out of scope; a single default user is seeded."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str] = mapped_column(String(9), default="#7C3AED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    meetings: Mapped[list["Meeting"]] = relationship(back_populates="owner")


class Participant(Base):
    """A person who can attend meetings / speak / own action items.
    Shared across meetings so one person's history is queryable."""

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    color: Mapped[str] = mapped_column(String(9))

    meeting_links: Mapped[list["MeetingParticipant"]] = relationship(back_populates="participant")


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (Index("ix_meetings_owner_date", "owner_id", "meeting_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255))
    meeting_date: Mapped[datetime] = mapped_column(DateTime)
    duration_sec: Mapped[int] = mapped_column(Integer, default=0)
    # How the meeting entered the system: seed | upload | paste | form
    source: Mapped[str] = mapped_column(String(16), default="form")
    platform: Mapped[str | None] = mapped_column(String(32), nullable=True)  # zoom / meet / teams
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    owner: Mapped[User] = relationship(back_populates="meetings")
    participant_links: Mapped[list["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="MeetingParticipant.position"
    )
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptSegment.position"
    )
    summary: Mapped["Summary | None"] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", uselist=False
    )
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="Chapter.position"
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="ActionItem.id"
    )
    ask_messages: Mapped[list["AskMessage"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", order_by="AskMessage.id"
    )


class MeetingParticipant(Base):
    """Association table (meeting N:M participant) carrying per-meeting data."""

    __tablename__ = "meeting_participants"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True
    )
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("participants.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16), default="attendee")  # host | attendee
    position: Mapped[int] = mapped_column(Integer, default=0)

    meeting: Mapped[Meeting] = relationship(back_populates="participant_links")
    participant: Mapped[Participant] = relationship(back_populates="meeting_links")


class TranscriptSegment(Base):
    """One utterance in a transcript. Times are milliseconds from meeting start."""

    __tablename__ = "transcript_segments"
    __table_args__ = (
        UniqueConstraint("meeting_id", "position", name="uq_segment_position"),
        Index("ix_segments_meeting_start", "meeting_id", "start_ms"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    speaker_id: Mapped[int] = mapped_column(ForeignKey("participants.id", ondelete="RESTRICT"))
    position: Mapped[int] = mapped_column(Integer)
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)

    meeting: Mapped[Meeting] = relationship(back_populates="segments")
    speaker: Mapped[Participant] = relationship()


class Summary(Base):
    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True
    )
    overview: Mapped[str] = mapped_column(Text, default="")
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    generated_by: Mapped[str] = mapped_column(String(16), default="heuristic")  # seed|heuristic|llm
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    meeting: Mapped[Meeting] = relationship(back_populates="summary")


class Chapter(Base):
    """Outline / key topic, anchored to a transcript timestamp."""

    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str] = mapped_column(Text, default="")
    start_ms: Mapped[int] = mapped_column(Integer, default=0)

    meeting: Mapped[Meeting] = relationship(back_populates="chapters")


class ActionItem(Base):
    __tablename__ = "action_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL"), nullable=True
    )
    # Segment the task was extracted from, so the UI can jump to it.
    source_segment_id: Mapped[int | None] = mapped_column(
        ForeignKey("transcript_segments.id", ondelete="SET NULL"), nullable=True
    )
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # auto = extracted by the summarizer (replaceable on regenerate); manual = added by the user
    origin: Mapped[str] = mapped_column(String(8), default="manual")
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    meeting: Mapped[Meeting] = relationship(back_populates="action_items")
    assignee: Mapped[Participant | None] = relationship()
    source_segment: Mapped[TranscriptSegment | None] = relationship()


class AskMessage(Base):
    """Chat history for the 'Ask about this meeting' assistant."""

    __tablename__ = "ask_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    # Timestamps (ms) of transcript segments the answer cites.
    citations: Mapped[list[int]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    meeting: Mapped[Meeting] = relationship(back_populates="ask_messages")
