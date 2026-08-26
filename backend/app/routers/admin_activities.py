from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Activity
from ..schemas import ActivityCreate, ActivityOut, ActivityUpdate
from ..security import require_admin

router = APIRouter(prefix="/admin/activities", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[ActivityOut])
def list_activities(db: Session = Depends(get_db)):
    return db.query(Activity).order_by(Activity.sort_order, Activity.created_at).all()


@router.post("", response_model=ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db)):
    a = Activity(**payload.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.patch("/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: str, payload: ActivityUpdate, db: Session = Depends(get_db)):
    a = db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    data = payload.model_dump(exclude_unset=True)
    clear_image = data.pop("clear_image", False)
    for k, v in data.items():
        setattr(a, k, v)
    if clear_image:
        a.image_url = None
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity(activity_id: str, db: Session = Depends(get_db)):
    a = db.get(Activity, activity_id)
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(a)
    db.commit()
    return None
