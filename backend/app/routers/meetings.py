"""/api/meetings — library listing, CRUD, transcript search, summary regeneration."""
from __future__ import annotations

import re
from datetime import date, datetime, time
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import current_user, meeting_or_404
from ..services import meetings as svc
from ..services.transcript_parser import TranscriptParseError

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

MAX_UPLOAD_BYTES = 2 * 1024 * 1024


def _snippet(text: str, q: str, width: int = 70) -> str:
    idx = text.lower().find(q.lower())
    if idx < 0:
        return text[: width * 2]
    start, end = max(0, idx - width), min(len(text), idx + len(q) + width)
    return ("…" if start else "") + text[start:end] + ("…" if end < len(text) else "")


@router.get("", response_model=schemas.MeetingListOut)
def list_meetings(
    q: str | None = Query(None, description="Matches title, participant name, keywords or transcript text"),
    participant: list[str] = Query(default=[], description="Participant name(s); meeting must include all"),
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Literal["recent", "oldest", "longest", "shortest", "title"] = "recent",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    M, MP, P, Seg = models.Meeting, models.MeetingParticipant, models.Participant, models.TranscriptSegment
    stmt = select(M).where(M.owner_id == user.id)

    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                M.title.ilike(like),
                exists().where(MP.meeting_id == M.id, MP.participant_id == P.id, P.name.ilike(like)),
                exists().where(Seg.meeting_id == M.id, Seg.text.ilike(like)),
            )
        )
    for name in participant:
        stmt = stmt.where(
            exists().where(MP.meeting_id == M.id, MP.participant_id == P.id, P.name.ilike(name.strip()))
        )
    if date_from:
        stmt = stmt.where(M.meeting_date >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(M.meeting_date <= datetime.combine(date_to, time.max))

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = {
        "recent": M.meeting_date.desc(),
        "oldest": M.meeting_date.asc(),
        "longest": M.duration_sec.desc(),
        "shortest": M.duration_sec.asc(),
        "title": func.lower(M.title).asc(),
    }[sort]
    rows = db.scalars(
        stmt.order_by(order, M.id.desc())
        .limit(limit)
        .offset(offset)
        .options(
            selectinload(M.participant_links).selectinload(MP.participant),
            selectinload(M.summary),
            selectinload(M.action_items),
        )
    ).all()

    items = []
    for m in rows:
        match = None
        if q and q.strip() and q.lower() not in m.title.lower():
            seg_text = db.scalar(select(Seg.text).where(Seg.meeting_id == m.id, Seg.text.ilike(f"%{q.strip()}%"))
                                 .order_by(Seg.position).limit(1))
            match = _snippet(seg_text, q.strip()) if seg_text else None
        overview = m.summary.overview if m.summary else ""
        items.append(
            schemas.MeetingListItem(
                id=m.id,
                title=m.title,
                meeting_date=m.meeting_date,
                duration_sec=m.duration_sec,
                source=m.source,
                platform=m.platform,
                participants=[svc.participant_out(link.participant) for link in m.participant_links],
                overview_snippet=re.sub(r"\s+", " ", overview)[:220],
                keywords=(m.summary.keywords if m.summary else [])[:4],
                action_items_total=len(m.action_items),
                action_items_open=sum(1 for a in m.action_items if not a.completed),
                match_snippet=match,
            )
        )
    return schemas.MeetingListOut(items=items, total=total)


@router.post("", response_model=schemas.MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(data: schemas.MeetingCreate, db: Session = Depends(get_db),
                   user: models.User = Depends(current_user)):
    """Create from a form, optionally with pasted transcript text."""
    try:
        meeting = svc.create_meeting(db, user, data, source="paste" if data.transcript_text else "form")
    except TranscriptParseError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return svc.meeting_detail_out(svc.load_meeting(db, meeting.id, user.id))


@router.post("/upload", response_model=schemas.MeetingDetail, status_code=status.HTTP_201_CREATED)
async def upload_meeting(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    participants: str | None = Form(None, description="Comma-separated names"),
    meeting_date: datetime | None = Form(None),
    generate_summary: bool = Form(True),
    db: Session = Depends(get_db),
    user: models.User = Depends(current_user),
):
    """Create a meeting from an uploaded .txt / .vtt / .json transcript."""
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Transcript file is larger than 2 MB")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="Transcript must be UTF-8 text") from exc

    name = file.filename or "transcript.txt"
    data = schemas.MeetingCreate(
        title=(title or name.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip() or "Uploaded meeting"),
        meeting_date=meeting_date,
        participants=[p for p in (participants or "").split(",") if p.strip()],
        transcript_text=text,
        generate_summary=generate_summary,
    )
    try:
        meeting = svc.create_meeting(db, user, data, source="upload", filename=name)
    except TranscriptParseError as exc:
        db.rollback()
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return svc.meeting_detail_out(svc.load_meeting(db, meeting.id, user.id))


@router.get("/{meeting_id}", response_model=schemas.MeetingDetail)
def get_meeting(meeting: models.Meeting = Depends(meeting_or_404)):
    return svc.meeting_detail_out(meeting)


@router.patch("/{meeting_id}", response_model=schemas.MeetingDetail)
def update_meeting(data: schemas.MeetingUpdate, meeting: models.Meeting = Depends(meeting_or_404),
                   db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    if data.title is not None:
        meeting.title = data.title.strip()
    if data.meeting_date is not None:
        meeting.meeting_date = data.meeting_date.replace(tzinfo=None)
    if data.platform is not None:
        meeting.platform = data.platform or None
    if data.participants is not None:
        svc.set_participants(db, meeting, data.participants)
    meeting.updated_at = models.utcnow()
    db.commit()
    return svc.meeting_detail_out(svc.load_meeting(db, meeting.id, user.id))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting: models.Meeting = Depends(meeting_or_404), db: Session = Depends(get_db)):
    db.delete(meeting)  # cascades to segments, summary, chapters, action items, chat
    db.commit()


@router.get("/{meeting_id}/transcript", response_model=list[schemas.SegmentOut])
def search_transcript(q: str | None = None, speaker_id: int | None = None,
                      meeting: models.Meeting = Depends(meeting_or_404)):
    """Server-side transcript filter (the UI also highlights client-side for instant feedback)."""
    return [
        svc.segment_out(s)
        for s in meeting.segments
        if (not q or q.lower() in s.text.lower()) and (not speaker_id or s.speaker_id == speaker_id)
    ]


@router.post("/{meeting_id}/summary/regenerate", response_model=schemas.MeetingDetail)
def regenerate_summary(meeting: models.Meeting = Depends(meeting_or_404), db: Session = Depends(get_db),
                       user: models.User = Depends(current_user)):
    if not meeting.segments:
        raise HTTPException(status_code=400, detail="Meeting has no transcript to summarize")
    svc.generate_summary(db, meeting, replace_actions=True)
    db.commit()
    return svc.meeting_detail_out(svc.load_meeting(db, meeting.id, user.id))


@router.patch("/{meeting_id}/summary", response_model=schemas.SummaryOut)
def edit_summary(data: schemas.SummaryUpdate, meeting: models.Meeting = Depends(meeting_or_404),
                 db: Session = Depends(get_db)):
    if meeting.summary is None:
        meeting.summary = models.Summary(overview="", keywords=[], generated_by="manual")
    if data.overview is not None:
        meeting.summary.overview = data.overview
    if data.keywords is not None:
        meeting.summary.keywords = [k.strip() for k in data.keywords if k.strip()][:12]
    db.commit()
    return schemas.SummaryOut.model_validate(meeting.summary)
