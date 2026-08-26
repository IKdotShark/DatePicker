from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from ..config import get_settings


def _fmt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
        .replace("\r", "")
    )


def _fold(line: str) -> str:
    out = []
    while len(line) > 72:
        out.append(line[:72])
        line = " " + line[72:]
    out.append(line)
    return "\r\n".join(out)


def build_ics(
    title: str,
    starts_at: datetime,
    duration_minutes: int,
    description: str = "",
    location: str = "",
    uid: Optional[str] = None,
) -> str:
    settings = get_settings()
    host = (
        settings.public_base_url.replace("https://", "").replace("http://", "").split("/")[0]
        or "datepicker.local"
    )
    end = starts_at + timedelta(minutes=duration_minutes)
    now = datetime.now(tz=timezone.utc)
    fields = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//DatePicker//RU",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid or 'event'}@{host}",
        f"DTSTAMP:{_fmt(now)}",
        f"DTSTART:{_fmt(starts_at)}",
        f"DTEND:{_fmt(end)}",
        f"SUMMARY:{_escape(title)}",
    ]
    if description:
        fields.append(f"DESCRIPTION:{_escape(description)}")
    if location:
        fields.append(f"LOCATION:{_escape(location)}")
    fields += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(line) for line in fields) + "\r\n"
