from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Setting
from ..schemas import AppSettings

_KEY = "app"


def get_app_settings(db: Session) -> AppSettings:
    row = db.get(Setting, _KEY)
    if not row:
        return AppSettings()
    try:
        return AppSettings(**(row.value or {}))
    except Exception:
        return AppSettings()


def save_app_settings(db: Session, settings: AppSettings) -> AppSettings:
    row = db.get(Setting, _KEY)
    if not row:
        row = Setting(key=_KEY, value=settings.model_dump())
        db.add(row)
    else:
        row.value = settings.model_dump()
    db.commit()
    return settings
