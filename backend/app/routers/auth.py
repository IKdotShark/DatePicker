from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..limiter import limiter
from ..models import Admin
from ..schemas import AdminInfo, LoginRequest
from ..security import (
    clear_session,
    issue_session,
    read_session,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AdminInfo)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    admin = db.query(Admin).filter(Admin.username == payload.username).one_or_none()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    issue_session(response, admin.id)
    return AdminInfo(id=admin.id, username=admin.username)


@router.post("/logout")
def logout(response: Response):
    clear_session(response)
    return {"ok": True}


@router.get("/me", response_model=AdminInfo)
def me(request: Request, db: Session = Depends(get_db)):
    admin_id = read_session(request)
    if not admin_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    admin = db.get(Admin, admin_id)
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return AdminInfo(id=admin.id, username=admin.username)
