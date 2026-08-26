from __future__ import annotations

from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, ConfigDict, Field


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=200)


class AdminInfo(OrmBase):
    id: str
    username: str


# ---------- Activities ----------

class ActivityBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    link: Optional[str] = Field(default=None, max_length=1024)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    is_active: bool = True
    allowed_restaurant_ids: Optional[List[str]] = None
    sort_order: int = 0


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    link: Optional[str] = Field(default=None, max_length=1024)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    is_active: Optional[bool] = None
    allowed_restaurant_ids: Optional[List[str]] = None
    sort_order: Optional[int] = None
    clear_image: bool = False


class ActivityOut(ActivityBase, OrmBase):
    id: str
    created_at: datetime
    updated_at: datetime


# ---------- Restaurants ----------

class RestaurantBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    link: Optional[str] = Field(default=None, max_length=1024)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    is_active: bool = True
    sort_order: int = 0


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    link: Optional[str] = Field(default=None, max_length=1024)
    image_url: Optional[str] = Field(default=None, max_length=1024)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    clear_image: bool = False


class RestaurantOut(RestaurantBase, OrmBase):
    id: str
    created_at: datetime
    updated_at: datetime


# ---------- Date options ----------

class DateOptionBase(BaseModel):
    starts_at: datetime
    duration_minutes: int = Field(default=120, ge=15, le=24 * 60)
    note: str = ""
    is_active: bool = True


class DateOptionCreate(DateOptionBase):
    pass


class DateOptionUpdate(BaseModel):
    starts_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(default=None, ge=15, le=24 * 60)
    note: Optional[str] = None
    is_active: Optional[bool] = None


class DateOptionOut(DateOptionBase, OrmBase):
    id: str
    created_at: datetime


# ---------- Invitations ----------

class InvitationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class InvitationOut(OrmBase):
    id: str
    token: str
    name: str
    is_active: bool
    created_at: datetime
    url: Optional[str] = None


# ---------- Public bootstrap ----------

class PublicSettings(BaseModel):
    title: str
    default_theme: str
    default_language: str
    allow_theme_switch: bool
    allow_language_switch: bool
    confetti_enabled: bool


class PublicBootstrap(BaseModel):
    invitation_name: str
    settings: PublicSettings
    activities: List[ActivityOut]
    restaurants: List[RestaurantOut]
    date_options: List[DateOptionOut]
    allow_custom_datetime: bool
    enforce_future_dates: bool
    last_submission: Optional["SubmissionOut"] = None
    allow_resubmit: bool


# ---------- Submissions ----------

class SubmissionCreate(BaseModel):
    activity_id: Optional[str] = None
    activity_name: Optional[str] = Field(default=None, max_length=200)
    restaurant_id: Optional[str] = None
    restaurant_name: Optional[str] = Field(default=None, max_length=200)
    starts_at: datetime
    duration_minutes: int = Field(default=120, ge=15, le=24 * 60)
    note: str = Field(default="", max_length=2000)


class SubmissionOut(OrmBase):
    id: str
    invitation_id: str
    activity_id: Optional[str]
    activity_name: str
    restaurant_id: Optional[str]
    restaurant_name: str
    starts_at: datetime
    duration_minutes: int
    note: str
    confirmed: bool
    created_at: datetime


# ---------- Audit ----------

class AuditEventCreate(BaseModel):
    event_type: str = Field(min_length=1, max_length=64)
    payload: dict[str, Any] = Field(default_factory=dict)


class AuditEventOut(OrmBase):
    id: str
    invitation_id: Optional[str]
    event_type: str
    payload: dict[str, Any]
    ip: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


# ---------- Settings (admin) ----------

class AppSettings(BaseModel):
    title: str = "Свидание?"
    default_theme: str = Field(default="romantic", pattern="^(romantic|minimal)$")
    default_language: str = Field(default="ru", pattern="^(ru|en)$")
    allow_theme_switch: bool = True
    allow_language_switch: bool = True
    enable_restaurant_step: bool = True
    allow_custom_datetime: bool = True
    enforce_future_dates: bool = True
    allow_resubmit: bool = True
    confetti_enabled: bool = True


# ---------- OG scrape ----------

class OgScrapeRequest(BaseModel):
    url: str = Field(min_length=4, max_length=2048)


class OgScrapeResponse(BaseModel):
    image_url: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None


# ---------- Upload ----------

class UploadResponse(BaseModel):
    url: str


PublicBootstrap.model_rebuild()
