"""Shared FastAPI dependencies."""
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .services.meetings import load_meeting

DEFAULT_USER_EMAIL = "priya@acmeflow.io"
DEFAULT_USER_NAME = "Priya Sharma"


def current_user(db: Session = Depends(get_db)) -> models.User:
    """Auth is out of scope: every request acts as the seeded default user.
    Swapping this for a real token check is the only change needed to add auth."""
    user = db.scalar(select(models.User).where(models.User.email == DEFAULT_USER_EMAIL))
    if user is None:
        user = models.User(name=DEFAULT_USER_NAME, email=DEFAULT_USER_EMAIL, avatar_color="#7C3AED")
        db.add(user)
        db.commit()
    return user


def meeting_or_404(meeting_id: int, db: Session = Depends(get_db),
                   user: models.User = Depends(current_user)) -> models.Meeting:
    meeting = load_meeting(db, meeting_id, user.id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting
