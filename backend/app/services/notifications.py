from __future__ import annotations

import logging
from datetime import datetime

import httpx

from ..config import get_settings
from ..models import Submission, Invitation

log = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(8.0)


def _format_datetime(dt: datetime) -> str:
    return dt.astimezone().strftime("%d.%m.%Y %H:%M")


def _format_text(inv: Invitation, sub: Submission) -> str:
    lines = [
        f"💌 Новое подтверждение свидания от: {inv.name}",
        "",
        f"📍 Активность: {sub.activity_name or '—'}",
    ]
    if sub.restaurant_name:
        lines.append(f"🍽 Ресторан: {sub.restaurant_name}")
    lines.append(f"🗓 Когда: {_format_datetime(sub.starts_at)} ({sub.duration_minutes} мин)")
    if sub.note:
        lines.append(f"📝 Заметка: {sub.note}")
    return "\n".join(lines)


async def notify_submission(inv: Invitation, sub: Submission) -> None:
    settings = get_settings()
    text = _format_text(inv, sub)

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        if settings.telegram_bot_token and settings.telegram_chat_id:
            try:
                await client.post(
                    f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
                    json={
                        "chat_id": settings.telegram_chat_id,
                        "text": text,
                        "disable_web_page_preview": True,
                    },
                )
            except Exception:
                log.exception("Telegram notify failed")

        if settings.notify_webhook_url:
            try:
                payload = {"content": text, "text": text}
                await client.post(settings.notify_webhook_url, json=payload)
            except Exception:
                log.exception("Webhook notify failed")
