#!/usr/bin/env python3
"""Weekly broken-link checker for ursb.me.

Crawls the sitemap, extracts all <a href> links from each page (in-scope
HTTP/HTTPS only), HEAD-checks each unique link, and posts a Telegram
report of the broken ones (4xx, 5xx, or timeout) to the noise channel.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from xml.etree import ElementTree as ET

SITEMAP_URLS = [
    'https://ursb.me/sitemap-index.xml',
    'https://ursb.me/sitemap-0.xml',
]
TIMEOUT = 10
USER_AGENT = 'ursb-link-checker/1.0 (+https://ursb.me)'
SKIP_PREFIXES = ('mailto:', 'tel:', 'javascript:', '#')
MAX_LINKS_REPORTED = 25

TG_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '')
TG_CHAT = os.environ.get('TELEGRAM_NOISE_CHAT_ID') or os.environ.get('TELEGRAM_CHAT_ID', '')


def fetch(url: str, head: bool = False) -> tuple[int, bytes]:
    """Return (status_code_or_0_on_failure, body_or_empty)."""
    method = 'HEAD' if head else 'GET'
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, b'' if head else r.read()
    except urllib.error.HTTPError as e:
        # Some servers reject HEAD; retry with GET if HEAD got 4xx/5xx
        if head and e.code in (400, 403, 405, 501):
            return fetch(url, head=False)
        return e.code, b''
    except Exception:
        return 0, b''


def collect_pages() -> list[str]:
    pages: list[str] = []
    for sitemap_url in SITEMAP_URLS:
        status, body = fetch(sitemap_url)
        if status != 200 or not body:
            continue
        try:
            root = ET.fromstring(body)
        except ET.ParseError:
            continue
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        # sitemap-index references multiple sub-sitemaps
        for sm in root.findall('sm:sitemap', ns):
            loc_el = sm.find('sm:loc', ns)
            if loc_el is None or not loc_el.text:
                continue
            sub_status, sub_body = fetch(loc_el.text.strip())
            if sub_status != 200 or not sub_body:
                continue
            try:
                sub_root = ET.fromstring(sub_body)
            except ET.ParseError:
                continue
            for u in sub_root.findall('sm:url', ns):
                lo = u.find('sm:loc', ns)
                if lo is not None and lo.text:
                    pages.append(lo.text.strip())
        # Or this sitemap itself may be flat
        for u in root.findall('sm:url', ns):
            lo = u.find('sm:loc', ns)
            if lo is not None and lo.text:
                pages.append(lo.text.strip())
        if pages:
            break
    return list(dict.fromkeys(pages))


LINK_RE = re.compile(r'href="([^"#]+)"', re.IGNORECASE)


def extract_links(html: str, base: str) -> set[str]:
    out: set[str] = set()
    for m in LINK_RE.finditer(html):
        href = m.group(1).strip()
        if not href or href.startswith(SKIP_PREFIXES):
            continue
        absolute = urllib.parse.urljoin(base, href)
        # Only HTTP/HTTPS
        if not absolute.startswith(('http://', 'https://')):
            continue
        out.add(absolute)
    return out


def main() -> None:
    if not TG_TOKEN or not TG_CHAT:
        print('TELEGRAM_BOT_TOKEN or TELEGRAM_(NOISE_)CHAT_ID missing', file=sys.stderr)
        sys.exit(1)

    pages = collect_pages()
    print(f'collected {len(pages)} pages')

    all_links: dict[str, str] = {}
    for p in pages:
        s, b = fetch(p)
        if s != 200 or not b:
            continue
        for link in extract_links(b.decode('utf-8', errors='ignore'), p):
            all_links.setdefault(link, p)
        time.sleep(0.05)
    print(f'extracted {len(all_links)} unique links')

    broken: list[dict] = []
    for link, source in all_links.items():
        s, _ = fetch(link, head=True)
        if s == 0 or s >= 400:
            broken.append({'link': link, 'status': s, 'source': source})
        time.sleep(0.03)

    week = time.strftime('%V')
    print(f'broken: {len(broken)}')
    if not broken:
        # Send a heartbeat so the operator knows the job ran
        send([f'🔍 *死链周报* (week {week})', '─────────────', '✅ 本周无新增坏链。'])
        return

    lines = [f'🔍 *死链周报* (week {week})', '─────────────', f'本周共发现 {len(broken)} 条坏链:']
    for b in broken[:MAX_LINKS_REPORTED]:
        st = b['status'] or 'TIMEOUT'
        lines.append(f'• [{st}] {b["link"]}')
        lines.append(f'  ← {b["source"]}')
    if len(broken) > MAX_LINKS_REPORTED:
        lines.append(f'… 还有 {len(broken) - MAX_LINKS_REPORTED} 条未列出')
    send(lines)


def send(lines: list[str]) -> None:
    text = '\n'.join(lines)
    body = json.dumps({
        'chat_id': TG_CHAT,
        'text': text,
        'parse_mode': 'Markdown',
        'disable_web_page_preview': True,
    }).encode()
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{TG_TOKEN}/sendMessage',
        data=body,
        headers={'Content-Type': 'application/json'},
    )
    try:
        urllib.request.urlopen(req, timeout=15).read()
    except Exception as e:
        print(f'telegram send failed: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
