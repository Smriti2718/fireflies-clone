"""Current user, participants directory, health."""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import current_user
from ..services.llm import llm_enabled

router = APIRouter(prefix="/api", tags=["misc"])


@router.get("/health")
def health():
    return {"status": "ok", "llm": llm_enabled()}


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(current_user)):
    return user


@router.get("/participants", response_model=list[schemas.ParticipantOut])
def participants(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    """People who appear in the user's meetings, most frequent first (for filters / autocomplete)."""
    MP = models.MeetingParticipant
    stmt = (
        select(models.Participant)
        .join(MP, MP.participant_id == models.Participant.id)
        .join(models.Meeting, models.Meeting.id == MP.meeting_id)
        .where(models.Meeting.owner_id == user.id)
        .group_by(models.Participant.id)
        .order_by(func.count(MP.meeting_id).desc(), models.Participant.name)
    )
    return db.scalars(stmt).all()
