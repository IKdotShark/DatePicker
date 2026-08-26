from __future__ import annotations

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import Invitation


def get_invitation_by_token(token: str = Path(min_length=8, max_length=64), db: Session = Depends(get_db)) -> Invitation:
    inv = db.query(Invitation).filter(Invitation.token == token).one_or_none()
    if not inv or not inv.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    return inv
