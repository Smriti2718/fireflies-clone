"""Domain logic for meetings, kept out of the HTTP layer so routers stay thin."""
from __future__ import annotations

import hashlib
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from .summarizer import Line, SummaryResult, summarize
from .transcript_parser import ParsedSegment, parse_transcript

PALETTE = ["#7C3AED", "#2563EB", "#DB2777", "#059669", "#D97706", "#0891B2", "#DC2626", "#4F46E5",
           "#65A30D", "#C026D3"]

DETAIL_OPTIONS = (
    selectinload(models.Meeting.participant_links).selectinload(models.MeetingParticipant.participant),
    selectinload(models.Meeting.segments).selectinload(models.TranscriptSegment.speaker),
    selectinload(models.Meeting.summary),
    selectinload(models.Meeting.chapters),
    selectinload(models.Meeting.action_items).selectinload(models.ActionItem.assignee),
    selectinload(models.Meeting.action_items).selectinload(models.ActionItem.source_segment),
)


def color_for(name: str) -> str:
    return PALETTE[int(hashlib.md5(name.lower().encode()).hexdigest(), 16) % len(PALETTE)]


def get_or_create_participant(db: Session, name: str, email: str | None = None) -> models.Participant:
    name = " ".join(name.split())[:120]
    p = db.scalar(select(models.Participant).where(models.Participant.name.ilike(name)))
    if p is None:
        p = models.Participant(name=name, email=email, color=color_for(name))
        db.add(p)
        db.flush()
    return p


def set_participants(db: Session, meeting: models.Meeting, names: list[str]) -> None:
    """Replace the meeting's participant list, keeping order (first = host)."""
    unique = list(dict.fromkeys(n.strip() for n in names if n and n.strip()))
    meeting.participant_links.clear()
    db.flush()
    for i, name in enumerate(unique):
        p = get_or_create_participant(db, name)
        meeting.participant_links.append(
            models.MeetingParticipant(participant=p, role="host" if i == 0 else "attendee", position=i)
        )


def set_segments(db: Session, meeting: models.Meeting, parsed: list[ParsedSegment]) -> None:
    meeting.segments.clear()
    db.flush()
    for i, seg in enumerate(parsed):
        meeting.segments.append(
            models.TranscriptSegment(
                speaker=get_or_create_participant(db, seg.speaker),
                position=i,
                start_ms=seg.start_ms or 0,
                end_ms=seg.end_ms or seg.start_ms or 0,
                text=seg.text,
            )
        )
    meeting.duration_sec = round(max((s.end_ms or 0) for s in parsed) / 1000) if parsed else 0


def nearest_segment(meeting: models.Meeting, start_ms: int | None) -> models.TranscriptSegment | None:
    if start_ms is None or not meeting.segments:
        return None
    candidates = [s for s in meeting.segments if s.start_ms <= start_ms] or meeting.segments[:1]
    return candidates[-1]


def apply_summary(db: Session, meeting: models.Meeting, result: SummaryResult, replace_actions: bool) -> None:
    if meeting.summary is None:
        meeting.summary = models.Summary(overview=result.overview, keywords=result.keywords,
                                         generated_by=result.generated_by)
    else:
        meeting.summary.overview = result.overview
        meeting.summary.keywords = result.keywords
        meeting.summary.generated_by = result.generated_by

    meeting.chapters.clear()
    for i, ch in enumerate(result.chapters):
        meeting.chapters.append(models.Chapter(position=i, title=ch.title[:255], summary=ch.summary,
                                               start_ms=ch.start_ms))

    if replace_actions:
        # Regeneration replaces only open, auto-extracted items; user-added and completed ones stay.
        meeting.action_items[:] = [a for a in meeting.action_items if a.origin == "manual" or a.completed]
        for a in result.action_items:
            meeting.action_items.append(
                models.ActionItem(
                    origin="auto",
                    text=a.text,
                    assignee=get_or_create_participant(db, a.assignee) if a.assignee else None,
                    source_segment=nearest_segment(meeting, a.start_ms),
                )
            )


def generate_summary(db: Session, meeting: models.Meeting, replace_actions: bool = True) -> None:
    lines = [Line(s.speaker.name, s.start_ms, s.text) for s in meeting.segments]
    names = [link.participant.name for link in meeting.participant_links]
    apply_summary(db, meeting, summarize(lines, names), replace_actions)


def create_meeting(db: Session, owner: models.User, data: schemas.MeetingCreate, source: str,
                   filename: str | None = None) -> models.Meeting:
    meeting = models.Meeting(
        owner=owner,
        title=data.title.strip(),
        meeting_date=(data.meeting_date or datetime.now()).replace(tzinfo=None),
        platform=data.platform,
        source=source,
    )
    db.add(meeting)
    db.flush()

    parsed = parse_transcript(data.transcript_text, data.transcript_format, filename) if data.transcript_text else []
    speakers = list(dict.fromkeys(s.speaker for s in parsed))
    # Participants = explicitly listed people + anyone who spoke.
    set_participants(db, meeting, list(data.participants) + speakers)
    if parsed:
        set_segments(db, meeting, parsed)
        if data.generate_summary:
            generate_summary(db, meeting)
    db.commit()
    return meeting


def load_meeting(db: Session, meeting_id: int, owner_id: int) -> models.Meeting | None:
    return db.scalar(
        select(models.Meeting)
        .where(models.Meeting.id == meeting_id, models.Meeting.owner_id == owner_id)
        .options(*DETAIL_OPTIONS)
        .execution_options(populate_existing=True)
    )


# ---------------------------------------------------------------- serialization

def participant_out(p: models.Participant) -> schemas.ParticipantOut:
    return schemas.ParticipantOut(id=p.id, name=p.name, email=p.email, color=p.color)


def action_item_out(a: models.ActionItem) -> schemas.ActionItemOut:
    return schemas.ActionItemOut(
        id=a.id,
        meeting_id=a.meeting_id,
        text=a.text,
        assignee=participant_out(a.assignee) if a.assignee else None,
        due_date=a.due_date,
        completed=a.completed,
        completed_at=a.completed_at,
        source_start_ms=a.source_segment.start_ms if a.source_segment else None,
        created_at=a.created_at,
    )


def segment_out(s: models.TranscriptSegment) -> schemas.SegmentOut:
    return schemas.SegmentOut(id=s.id, position=s.position, speaker_id=s.speaker_id, speaker_name=s.speaker.name,
                              start_ms=s.start_ms, end_ms=s.end_ms, text=s.text)


def meeting_detail_out(m: models.Meeting) -> schemas.MeetingDetail:
    talk: dict[int, int] = {}
    for s in m.segments:
        talk[s.speaker_id] = talk.get(s.speaker_id, 0) + max(0, s.end_ms - s.start_ms)
    return schemas.MeetingDetail(
        id=m.id,
        title=m.title,
        meeting_date=m.meeting_date,
        duration_sec=m.duration_sec,
        source=m.source,
        platform=m.platform,
        media_url=m.media_url,
        created_at=m.created_at,
        updated_at=m.updated_at,
        participants=[
            schemas.MeetingParticipantOut(
                **participant_out(link.participant).model_dump(),
                role=link.role,
                talk_time_sec=round(talk.get(link.participant_id, 0) / 1000),
            )
            for link in m.participant_links
        ],
        segments=[segment_out(s) for s in m.segments],
        summary=schemas.SummaryOut.model_validate(m.summary) if m.summary else None,
        chapters=[schemas.ChapterOut.model_validate(c) for c in m.chapters],
        action_items=[action_item_out(a) for a in m.action_items],
    )
