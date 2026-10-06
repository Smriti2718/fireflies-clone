"""Populate an empty database with sample meetings. Run directly to reset: `python -m app.seed --reset`."""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models
from .database import Base, SessionLocal, engine
from .deps import DEFAULT_USER_EMAIL, DEFAULT_USER_NAME
from .seed_data import MEETINGS, PEOPLE
from .services.meetings import color_for

WORDS_PER_SEC = 2.6
GAP_MS = 700
LEAD_IN_MS = 3000


def _timeline(lines: list[tuple[str, str]]) -> list[tuple[str, int, int, str]]:
    """Assign plausible start/end times from speaking pace."""
    out, cursor = [], LEAD_IN_MS
    for speaker, text in lines:
        dur = max(2000, int(len(text.split()) / WORDS_PER_SEC * 1000))
        out.append((speaker, cursor, cursor + dur, text))
        cursor += dur + GAP_MS
    return out


def seed(db: Session) -> None:
    user = db.scalar(select(models.User).where(models.User.email == DEFAULT_USER_EMAIL))
    if user is None:
        user = models.User(name=DEFAULT_USER_NAME, email=DEFAULT_USER_EMAIL, avatar_color="#7C3AED")
        db.add(user)

    people: dict[str, models.Participant] = {}
    for name, email in PEOPLE.items():
        p = db.scalar(select(models.Participant).where(models.Participant.name == name))
        if p is None:
            p = models.Participant(name=name, email=email, color=color_for(name))
            db.add(p)
        people[name] = p
    db.flush()

    now = datetime.now().replace(second=0, microsecond=0)
    for spec in MEETINGS:
        when = (now - timedelta(days=spec["days_ago"])).replace(hour=spec["hour"], minute=spec["minute"])
        timed = _timeline(spec["transcript"])
        meeting = models.Meeting(
            owner=user, title=spec["title"], meeting_date=when, platform=spec["platform"], source="seed",
            duration_sec=round(timed[-1][2] / 1000) + 5,
        )
        for i, name in enumerate(spec["participants"]):
            meeting.participant_links.append(
                models.MeetingParticipant(participant=people[name], role="host" if i == 0 else "attendee", position=i)
            )
        segments = [
            models.TranscriptSegment(speaker=people[spk], position=i, start_ms=start, end_ms=end, text=text)
            for i, (spk, start, end, text) in enumerate(timed)
        ]
        meeting.segments = segments
        meeting.summary = models.Summary(overview=spec["overview"], keywords=spec["keywords"], generated_by="seed")
        meeting.chapters = [
            models.Chapter(position=i, title=title, summary=summary, start_ms=segments[idx].start_ms)
            for i, (idx, title, summary) in enumerate(spec["chapters"])
        ]
        meeting.action_items = [
            models.ActionItem(
                origin="auto",
                text=text,
                assignee=people[assignee],
                source_segment=segments[idx],
                completed=done,
                completed_at=when + timedelta(days=1) if done else None,
                due_date=(when.date() + timedelta(days=due)) if due else None,
            )
            for idx, text, assignee, done, due in spec["actions"]
        ]
        db.add(meeting)
    db.commit()


def seed_if_empty(db: Session) -> bool:
    if db.scalar(select(func.count(models.Meeting.id))):
        return False
    seed(db)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="drop all tables and reseed")
    args = parser.parse_args()
    if args.reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        if args.reset:
            seed(session)
            print("Database reset and seeded.")
        else:
            print("Seeded." if seed_if_empty(session) else "Already has data; use --reset to reseed.")
