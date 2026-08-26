from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Invitation
from ..schemas import InvitationCreate, InvitationOut
from ..security import require_admin

router = APIRouter(prefix="/admin/invitations", tags=["admin"], dependencies=[Depends(require_admin)])


def _with_url(inv: Invitation) -> InvitationOut:
    settings = get_settings()
    base = settings.public_base_url.rstrip("/")
    return InvitationOut(
        id=inv.id,
        token=inv.token,
        name=inv.name,
        is_active=inv.is_active,
        created_at=inv.created_at,
        url=f"{base}/i/{inv.token}",
    )


@router.get("", response_model=List[InvitationOut])
def list_invitations(db: Session = Depends(get_db)):
    items = db.query(Invitation).order_by(Invitation.created_at.desc()).all()
    return [_with_url(i) for i in items]


@router.post("", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
def create_invitation(payload: InvitationCreate, db: Session = Depends(get_db)):
    inv = Invitation(name=payload.name)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return _with_url(inv)


@router.post("/{inv_id}/rotate", response_model=InvitationOut)
def rotate_token(inv_id: str, db: Session = Depends(get_db)):
    inv = db.get(Invitation, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    inv.token = uuid.uuid4().hex
    db.commit()
    db.refresh(inv)
    return _with_url(inv)


@router.patch("/{inv_id}", response_model=InvitationOut)
def toggle_invitation(inv_id: str, is_active: bool, db: Session = Depends(get_db)):
    inv = db.get(Invitation, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    inv.is_active = is_active
    db.commit()
    db.refresh(inv)
    return _with_url(inv)


@router.delete("/{inv_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invitation(inv_id: str, db: Session = Depends(get_db)):
    inv = db.get(Invitation, inv_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(inv)
    db.commit()
    return None
