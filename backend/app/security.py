from __future__ import annotations

from typing import Optional

from fastapi import HTTPException, Request, Response, status
from itsdangerous import BadSignature, SignatureExpired, TimestampSigner
from passlib.context import CryptContext

from .config import get_settings

settings = get_settings()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_signer = TimestampSigner(settings.secret_key, salt="dp-session")


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _pwd_context.verify(password, password_hash)
    except ValueError:
        return False


def issue_session(response: Response, admin_id: str) -> None:
    token = _signer.sign(admin_id.encode("utf-8")).decode("utf-8")
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        secure=settings.public_base_url.startswith("https://"),
        samesite="lax",
        path="/",
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")


def read_session(request: Request) -> Optional[str]:
    raw = request.cookies.get(settings.session_cookie_name)
    if not raw:
        return None
    try:
        admin_id = _signer.unsign(raw, max_age=settings.session_max_age_seconds).decode("utf-8")
        return admin_id
    except (BadSignature, SignatureExpired):
        return None


def require_admin(request: Request) -> str:
    admin_id = read_session(request)
    if not admin_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return admin_id
