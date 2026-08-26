from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .config import get_settings
from .database import Base, SessionLocal, engine
from .limiter import limiter
from .models import Admin, Invitation
from .routers import (
    admin_activities,
    admin_dates,
    admin_invitations,
    admin_misc,
    admin_restaurants,
    auth,
    media,
    public,
)
from .security import hash_password

log = logging.getLogger("datepicker")
logging.basicConfig(level=logging.INFO)

settings = get_settings()


def _ensure_initial_data() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(Admin).count() == 0:
            admin = Admin(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
            )
            db.add(admin)
            log.info("Created initial admin user '%s'", settings.admin_username)
        if db.query(Invitation).count() == 0:
            inv = Invitation(name=settings.initial_invitation_name)
            db.add(inv)
            log.info("Created initial invitation '%s'", settings.initial_invitation_name)
        os.makedirs(settings.upload_dir, exist_ok=True)
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _ensure_initial_data()
    yield


app = FastAPI(
    title="DatePicker API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
    root_path="/api",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return resp


@app.get("/health", include_in_schema=False)
def health():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(public.router)
app.include_router(media.router)
app.include_router(admin_activities.router)
app.include_router(admin_restaurants.router)
app.include_router(admin_dates.router)
app.include_router(admin_invitations.router)
app.include_router(admin_misc.router)
