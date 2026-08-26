from __future__ import annotations

import ipaddress
import logging
import socket
from typing import Optional
from urllib.parse import urlparse, urljoin

import httpx
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(8.0, connect=4.0)
_MAX_BYTES = 1_500_000
_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def _is_private_host(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return True
    for info in infos:
        addr = info[4][0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            continue
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return True
    return False


def _safe_url(url: str) -> Optional[str]:
    try:
        p = urlparse(url)
    except Exception:
        return None
    if p.scheme not in ("http", "https"):
        return None
    if not p.hostname:
        return None
    if _is_private_host(p.hostname):
        return None
    return url


async def scrape_og(url: str) -> dict:
    safe = _safe_url(url)
    if not safe:
        return {"image_url": None, "title": None, "description": None}

    headers = {"User-Agent": _UA, "Accept": "text/html,application/xhtml+xml"}
    try:
        async with httpx.AsyncClient(
            timeout=_TIMEOUT, follow_redirects=True, max_redirects=5, headers=headers
        ) as client:
            async with client.stream("GET", safe) as resp:
                if resp.status_code >= 400:
                    return {"image_url": None, "title": None, "description": None}
                ctype = resp.headers.get("content-type", "")
                if "html" not in ctype.lower():
                    return {"image_url": None, "title": None, "description": None}
                buf = bytearray()
                async for chunk in resp.aiter_bytes():
                    buf.extend(chunk)
                    if len(buf) >= _MAX_BYTES:
                        break
                html = bytes(buf).decode(resp.encoding or "utf-8", errors="replace")
                final_url = str(resp.url)
    except Exception:
        log.exception("OG scrape failed for %s", safe)
        return {"image_url": None, "title": None, "description": None}

    soup = BeautifulSoup(html, "html.parser")

    def meta(*names: str) -> Optional[str]:
        for n in names:
            tag = soup.find("meta", attrs={"property": n}) or soup.find("meta", attrs={"name": n})
            if tag and tag.get("content"):
                return tag["content"].strip()
        return None

    image = meta("og:image", "og:image:url", "twitter:image", "twitter:image:src")
    title = meta("og:title", "twitter:title") or (soup.title.string.strip() if soup.title and soup.title.string else None)
    description = meta("og:description", "twitter:description", "description")

    if image and not image.startswith(("http://", "https://")):
        image = urljoin(final_url, image)

    if image and not _safe_url(image):
        image = None

    return {"image_url": image, "title": title, "description": description}
