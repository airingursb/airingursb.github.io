"""Detect localhost / 127.0.0.1 pageviews so reports do not count local dev."""

from __future__ import annotations

from urllib.parse import urlparse

LOCAL_DEV_HOSTS = frozenset({'localhost', '127.0.0.1', '::1'})

# Keep null/empty referrers (real visitors, or clients that omit Referer).
# Drop rows whose referrer host is a local loopback / dev server.
POSTGREST_EXCLUDE_LOCAL_DEV = (
    'or=(referrer.is.null,'
    'and(referrer.not.ilike.*localhost*,referrer.not.ilike.*127.0.0.1*))'
)


def hostname_of(value: str | None) -> str:
    if not value:
        return ''
    text = value.strip()
    if not text:
        return ''
    if '://' not in text:
        text = 'http://' + text
    try:
        host = (urlparse(text).hostname or '').lower()
    except ValueError:
        return ''
    return host.strip('[]')


def is_local_dev_source(*values: str | None) -> bool:
    return any(hostname_of(value) in LOCAL_DEV_HOSTS for value in values)


def exclude_local_dev_views(rows: list[dict]) -> list[dict]:
    return [row for row in rows if not is_local_dev_source(row.get('referrer'))]
