from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import DateOption
from ..schemas import DateOptionCreate, DateOptionOut, DateOptionUpdate
from ..security import require_admin

router = APIRouter(prefix="/admin/dates", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("", response_model=List[DateOptionOut])
def list_dates(db: Session = Depends(get_db)):
    return db.query(DateOption).order_by(DateOption.starts_at).all()


@router.post("", response_model=DateOptionOut, status_code=status.HTTP_201_CREATED)
def create_date(payload: DateOptionCreate, db: Session = Depends(get_db)):
    d = DateOption(**payload.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.patch("/{date_id}", response_model=DateOptionOut)
def update_date(date_id: str, payload: DateOptionUpdate, db: Session = Depends(get_db)):
    d = db.get(DateOption, date_id)
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{date_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_date(date_id: str, db: Session = Depends(get_db)):
    d = db.get(DateOption, date_id)
    if not d:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(d)
    db.commit()
    return None
