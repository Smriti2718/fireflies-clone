"""Action items: list/create under a meeting, update/delete by id, and a cross-meeting task list."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .. import models, schemas
from ..database import get_db
from ..deps import current_user, meeting_or_404
from ..services import meetings as svc

router = APIRouter(prefix="/api", tags=["action items"])


def _item_or_404(item_id: int, db: Session, user: models.User) -> models.ActionItem:
    item = db.scalar(
        select(models.ActionItem)
        .join(models.Meeting)
        .where(models.ActionItem.id == item_id, models.Meeting.owner_id == user.id)
        .options(selectinload(models.ActionItem.assignee), selectinload(models.ActionItem.source_segment))
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Action item not found")
    return item


@router.get("/action-items", response_model=list[schemas.ActionItemOut])
def all_action_items(completed: bool | None = Query(None), db: Session = Depends(get_db),
                     user: models.User = Depends(current_user)):
    stmt = (
        select(models.ActionItem)
        .join(models.Meeting)
        .where(models.Meeting.owner_id == user.id)
        .options(selectinload(models.ActionItem.assignee), selectinload(models.ActionItem.source_segment))
        .order_by(models.Meeting.meeting_date.desc(), models.ActionItem.id)
    )
    if completed is not None:
        stmt = stmt.where(models.ActionItem.completed == completed)
    return [svc.action_item_out(a) for a in db.scalars(stmt)]


@router.get("/meetings/{meeting_id}/action-items", response_model=list[schemas.ActionItemOut])
def list_action_items(meeting: models.Meeting = Depends(meeting_or_404)):
    return [svc.action_item_out(a) for a in meeting.action_items]


@router.post("/meetings/{meeting_id}/action-items", response_model=schemas.ActionItemOut,
             status_code=status.HTTP_201_CREATED)
def create_action_item(data: schemas.ActionItemCreate, meeting: models.Meeting = Depends(meeting_or_404),
                       db: Session = Depends(get_db)):
    item = models.ActionItem(
        meeting=meeting,
        text=data.text.strip(),
        due_date=data.due_date,
        assignee=svc.get_or_create_participant(db, data.assignee_name) if data.assignee_name else None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return svc.action_item_out(item)


@router.patch("/action-items/{item_id}", response_model=schemas.ActionItemOut)
def update_action_item(item_id: int, data: schemas.ActionItemUpdate, db: Session = Depends(get_db),
                       user: models.User = Depends(current_user)):
    item = _item_or_404(item_id, db, user)
    if data.text is not None:
        item.text = data.text.strip()
    if data.assignee_name is not None:
        item.assignee = svc.get_or_create_participant(db, data.assignee_name) if data.assignee_name.strip() else None
    if data.clear_due_date:
        item.due_date = None
    elif data.due_date is not None:
        item.due_date = data.due_date
    if data.completed is not None and data.completed != item.completed:
        item.completed = data.completed
        item.completed_at = models.utcnow() if data.completed else None
    db.commit()
    return svc.action_item_out(_item_or_404(item_id, db, user))


@router.delete("/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    db.delete(_item_or_404(item_id, db, user))
    db.commit()
