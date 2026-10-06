"""'Ask about this meeting' chat (AskFred-style)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import meeting_or_404
from ..services.assistant import answer_question

router = APIRouter(prefix="/api/meetings/{meeting_id}/ask", tags=["ask"])


@router.get("", response_model=list[schemas.AskMessageOut])
def history(meeting: models.Meeting = Depends(meeting_or_404)):
    return meeting.ask_messages


@router.post("", response_model=schemas.AskExchangeOut, status_code=status.HTTP_201_CREATED)
def ask(data: schemas.AskIn, meeting: models.Meeting = Depends(meeting_or_404), db: Session = Depends(get_db)):
    answer = answer_question(meeting, data.question.strip())
    q = models.AskMessage(meeting=meeting, role="user", content=data.question.strip(), citations=[])
    a = models.AskMessage(meeting=meeting, role="assistant", content=answer.text, citations=answer.citations)
    db.add_all([q, a])
    db.commit()
    return schemas.AskExchangeOut(question=q, answer=a)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_history(meeting: models.Meeting = Depends(meeting_or_404), db: Session = Depends(get_db)):
    meeting.ask_messages.clear()
    db.commit()
