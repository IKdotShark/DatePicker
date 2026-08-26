from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_invitation_by_token
from ..limiter import limiter
from ..models import Activity, AuditEvent, DateOption, Invitation, Restaurant, Submission
from ..schemas import (
    AuditEventCreate,
    PublicBootstrap,
    PublicSettings,
    SubmissionCreate,
    SubmissionOut,
)
from ..services.ics import build_ics
from ..services.notifications import notify_submission
from ..services.settings_store import get_app_settings

router = APIRouter(prefix="/public", tags=["public"])


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else ""


@router.get("/i/{token}", response_model=PublicBootstrap)
def bootstrap(
    token: str,
    request: Request,
    inv: Invitation = Depends(get_invitation_by_token),
    db: Session = Depends(get_db),
):
    s = get_app_settings(db)

    activities = (
        db.query(Activity)
        .filter(Activity.is_active.is_(True))
        .order_by(Activity.sort_order, Activity.created_at)
        .all()
    )
    restaurants = (
        db.query(Restaurant)
        .filter(Restaurant.is_active.is_(True))
        .order_by(Restaurant.sort_order, Restaurant.created_at)
        .all()
        if s.enable_restaurant_step
        else []
    )
    dates = (
        db.query(DateOption)
        .filter(DateOption.is_active.is_(True))
        .order_by(DateOption.starts_at)
        .all()
    )

    last_sub = (
        db.query(Submission)
        .filter(Submission.invitation_id == inv.id)
        .order_by(Submission.created_at.desc())
        .first()
    )

    db.add(
        AuditEvent(
            invitation_id=inv.id,
            event_type="bootstrap",
            payload={},
            ip=_client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:500],
        )
    )
    db.commit()

    return PublicBootstrap(
        invitation_name=inv.name,
        settings=PublicSettings(
            title=s.title,
            default_theme=s.default_theme,
            default_language=s.default_language,
            allow_theme_switch=s.allow_theme_switch,
            allow_language_switch=s.allow_language_switch,
            confetti_enabled=s.confetti_enabled,
        ),
        activities=activities,
        restaurants=restaurants,
        date_options=dates,
        allow_custom_datetime=s.allow_custom_datetime,
        enforce_future_dates=s.enforce_future_dates,
        last_submission=SubmissionOut.model_validate(last_sub) if last_sub else None,
        allow_resubmit=s.allow_resubmit,
    )


@router.post("/i/{token}/event", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("60/minute")
def log_event(
    token: str,
    payload: AuditEventCreate,
    request: Request,
    inv: Invitation = Depends(get_invitation_by_token),
    db: Session = Depends(get_db),
):
    allowed = {"opened", "no_attempt", "yes_clicked", "step_changed", "edit_requested", "calendar_exported"}
    if payload.event_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported event type")
    safe_payload = payload.payload if isinstance(payload.payload, dict) else {}
    if len(str(safe_payload)) > 2000:
        safe_payload = {"truncated": True}
    db.add(
        AuditEvent(
            invitation_id=inv.id,
            event_type=payload.event_type,
            payload=safe_payload,
            ip=_client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:500],
        )
    )
    db.commit()
    return None


@router.post("/i/{token}/submit", response_model=SubmissionOut)
@limiter.limit("10/minute")
async def submit(
    token: str,
    payload: SubmissionCreate,
    request: Request,
    background: BackgroundTasks,
    inv: Invitation = Depends(get_invitation_by_token),
    db: Session = Depends(get_db),
):
    s = get_app_settings(db)

    if not s.allow_resubmit:
        existing = (
            db.query(Submission)
            .filter(Submission.invitation_id == inv.id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=409, detail="Already submitted")

    activity_name = payload.activity_name or ""
    if payload.activity_id:
        a = db.get(Activity, payload.activity_id)
        if a:
            activity_name = a.name

    restaurant_name = payload.restaurant_name or ""
    if payload.restaurant_id and s.enable_restaurant_step:
        r = db.get(Restaurant, payload.restaurant_id)
        if r:
            restaurant_name = r.name

    if not activity_name:
        raise HTTPException(status_code=400, detail="Activity is required")

    if s.enforce_future_dates and payload.starts_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=400, detail="Date must be in the future")

    sub = Submission(
        invitation_id=inv.id,
        activity_id=payload.activity_id,
        activity_name=activity_name,
        restaurant_id=payload.restaurant_id if s.enable_restaurant_step else None,
        restaurant_name=restaurant_name if s.enable_restaurant_step else "",
        starts_at=payload.starts_at,
        duration_minutes=payload.duration_minutes,
        note=payload.note,
        confirmed=True,
    )
    db.add(sub)
    db.add(
        AuditEvent(
            invitation_id=inv.id,
            event_type="submitted",
            payload={
                "activity": activity_name,
                "restaurant": restaurant_name,
                "starts_at": payload.starts_at.isoformat(),
                "duration_minutes": payload.duration_minutes,
            },
            ip=_client_ip(request),
            user_agent=request.headers.get("user-agent", "")[:500],
        )
    )
    db.commit()
    db.refresh(sub)

    background.add_task(notify_submission, inv, sub)
    return sub


@router.get("/i/{token}/ics")
def download_ics(
    token: str,
    inv: Invitation = Depends(get_invitation_by_token),
    db: Session = Depends(get_db),
):
    sub = (
        db.query(Submission)
        .filter(Submission.invitation_id == inv.id)
        .order_by(Submission.created_at.desc())
        .first()
    )
    if not sub:
        raise HTTPException(status_code=404, detail="No submission yet")
    title = f"Свидание: {sub.activity_name}"
    description_parts = [f"С {inv.name}"]
    if sub.restaurant_name:
        description_parts.append(f"Ресторан: {sub.restaurant_name}")
    if sub.note:
        description_parts.append(sub.note)
    body = build_ics(
        title=title,
        starts_at=sub.starts_at,
        duration_minutes=sub.duration_minutes,
        description="\n".join(description_parts),
        location=sub.restaurant_name or sub.activity_name,
        uid=sub.id,
    )
    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="date-{sub.id[:8]}.ics"'},
    )
