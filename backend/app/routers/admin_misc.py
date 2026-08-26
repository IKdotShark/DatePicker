from __future__ import annotations

import secrets
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..limiter import limiter
from ..models import AuditEvent, Submission
from ..schemas import (
    AppSettings,
    AuditEventOut,
    OgScrapeRequest,
    OgScrapeResponse,
    SubmissionOut,
    UploadResponse,
)
from ..security import require_admin
from ..services.og_scraper import scrape_og
from ..services.settings_store import get_app_settings, save_app_settings

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

_ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


@router.get("/settings", response_model=AppSettings)
def read_settings(db: Session = Depends(get_db)):
    return get_app_settings(db)


@router.put("/settings", response_model=AppSettings)
def update_settings(payload: AppSettings, db: Session = Depends(get_db)):
    return save_app_settings(db, payload)


@router.post("/scrape-og", response_model=OgScrapeResponse)
@limiter.limit("20/minute")
async def scrape_og_endpoint(request: Request, payload: OgScrapeRequest):
    res = await scrape_og(payload.url)
    return OgScrapeResponse(**res)


@router.post("/uploads", response_model=UploadResponse)
async def upload_image(file: UploadFile = File(...)):
    settings = get_settings()
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename")
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in _ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    body = await file.read(_MAX_IMAGE_BYTES + 1)
    if len(body) > _MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="File too large")

    from io import BytesIO
    try:
        img = Image.open(BytesIO(body))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    safe_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{secrets.token_hex(6)}.{ext}"
    dst = Path(settings.upload_dir) / safe_name
    with open(dst, "wb") as f:
        f.write(body)

    return UploadResponse(url=f"/media/{safe_name}")


@router.get("/submissions", response_model=List[SubmissionOut])
def list_submissions(
    db: Session = Depends(get_db),
    invitation_id: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
):
    q = db.query(Submission)
    if invitation_id:
        q = q.filter(Submission.invitation_id == invitation_id)
    return q.order_by(Submission.created_at.desc()).limit(limit).all()


@router.get("/audit", response_model=List[AuditEventOut])
def list_audit(
    db: Session = Depends(get_db),
    invitation_id: Optional[str] = None,
    limit: int = Query(default=200, ge=1, le=1000),
):
    q = db.query(AuditEvent)
    if invitation_id:
        q = q.filter(AuditEvent.invitation_id == invitation_id)
    return q.order_by(AuditEvent.created_at.desc()).limit(limit).all()
