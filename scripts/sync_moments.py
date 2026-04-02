#!/usr/bin/env python3
"""Fetch Telegram channel messages and upsert them to Supabase moments table."""

import urllib.request
import urllib.error
import re
import json
import os
import sys
import html as html_module

# Load .env file from repo root (for local development)
_env_file = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(_env_file):
    with open(_env_file) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _v = _line.split('=', 1)
                os.environ.setdefault(_k.strip(), _v.strip())

TELEGRAM_URL = 'https://t.me/s/airingchannel'
SUPABASE_URL = os.environ.get('BLOG_SUPABASE_URL', '')
SUPABASE_SERVICE_KEY = os.environ.get('BLOG_SUPABASE_SERVICE_KEY', '')

# URL regex for extracting links from text
URL_RE = re.compile(r'https?://[^\s<>\'"，。、！？；：）》\]]+')


# ── Helpers ──────────────────────────────────────────────────

def fetch_url(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)'
    })
    response = urllib.request.urlopen(req, timeout=30)
    return response.read().decode('utf-8')


def strip_html_preserve_newlines(s):
    """Strip HTML tags but convert <br> to newlines, decode entities."""
    # Convert <br> variants to newlines
    s = re.sub(r'<br\s*/?>', '\n', s)
    # Remove all other tags
    s = re.sub(r'<[^>]+>', '', s)
    # Decode common HTML entities
    s = s.replace('&amp;', '&')
    s = s.replace('&lt;', '<')
    s = s.replace('&gt;', '>')
    s = s.replace('&quot;', '"')
    s = s.replace('&#39;', "'")
    s = s.replace('&nbsp;', ' ')
    # Decode numeric HTML entities (&#NNN; and &#xHHH;)
    s = re.sub(r'&#(\d+);', lambda m: chr(int(m.group(1))), s)
    s = re.sub(r'&#x([0-9a-fA-F]+);', lambda m: chr(int(m.group(1), 16)), s)
    # Collapse multiple blank lines to at most two newlines
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


def is_pin_message(text):
    """Check if message is a Telegram pin notification (should be skipped)."""
    if not text:
        return False
    return text.strip().startswith('Airing Channel pinned')


# ── OG Metadata Fetching ────────────────────────────────────

def extract_urls(text):
    """Extract URLs from text content."""
    if not text:
        return []
    return URL_RE.findall(text)


def fetch_og_metadata(url):
    """Fetch Open Graph metadata for a URL. Returns dict or None."""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; OGBot/1.0)',
            'Accept': 'text/html',
        })
        resp = urllib.request.urlopen(req, timeout=10)
        # Only parse HTML responses
        content_type = resp.headers.get('Content-Type', '')
        if 'text/html' not in content_type and 'application/xhtml' not in content_type:
            return None
        raw = resp.read(64 * 1024)  # Read at most 64KB
        html_str = raw.decode('utf-8', errors='replace')

        og = {}
        # Extract <meta property="og:..." content="...">
        for m in re.finditer(
            r'<meta\s+(?:[^>]*?)property=["\']og:(\w+)["\'](?:[^>]*?)content=["\']([^"\']*)["\']',
            html_str, re.IGNORECASE
        ):
            og[m.group(1)] = html_module.unescape(m.group(2))

        # Also try content before property order
        for m in re.finditer(
            r'<meta\s+(?:[^>]*?)content=["\']([^"\']*)["\'](?:[^>]*?)property=["\']og:(\w+)["\']',
            html_str, re.IGNORECASE
        ):
            key = m.group(2)
            if key not in og:
                og[key] = html_module.unescape(m.group(1))

        # Fallback to <title> if no og:title
        if 'title' not in og:
            title_m = re.search(r'<title[^>]*>([^<]+)</title>', html_str, re.IGNORECASE)
            if title_m:
                og['title'] = html_module.unescape(title_m.group(1).strip())

        if not og.get('title'):
            return None

        return {
            'url': url,
            'title': og.get('title', ''),
            'description': og.get('description', ''),
            'image': og.get('image', ''),
        }
    except Exception:
        return None


def get_link_previews(text):
    """Extract URLs from text and fetch OG metadata for each."""
    urls = extract_urls(text)
    previews = []
    seen = set()
    for url in urls:
        if url in seen:
            continue
        seen.add(url)
        meta = fetch_og_metadata(url)
        if meta:
            previews.append(meta)
        if len(previews) >= 3:  # Limit to 3 previews per moment
            break
    return previews


# ── Telegram Parsing ─────────────────────────────────────────

def parse_telegram_messages(html_str):
    """Parse full Telegram channel messages: text, images, datetime, post_id."""

    # Split HTML into individual message blocks by data-post attribute
    block_pattern = re.compile(
        r'<div[^>]+data-post="([^"]+)"[^>]*>(.*?)(?=<div[^>]+data-post="|$)',
        re.DOTALL
    )

    messages = []
    seen_ids = set()

    for match in block_pattern.finditer(html_str):
        post_id = match.group(1)
        block = match.group(2)

        if post_id in seen_ids:
            continue
        seen_ids.add(post_id)

        # Extract text content from tgme_widget_message_text div
        text = ''
        text_match = re.search(
            r'<div[^>]+class="[^"]*tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>',
            block,
            re.DOTALL
        )
        if text_match:
            text = strip_html_preserve_newlines(text_match.group(1))

        # Skip pin notification messages
        if is_pin_message(text):
            continue

        # Extract image URLs from background-image:url('...') inside photo wrap elements
        images = []
        photo_wraps = re.findall(
            r'tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:url\(\'([^\']+)\'\)',
            block
        )
        images.extend(photo_wraps)

        extra_bg = re.findall(
            r'background-image:url\(\'(https://cdn\d*\.telegram-cdn\.org/[^\']+)\'\)',
            block
        )
        for url in extra_bg:
            if url not in images:
                images.append(url)

        # Extract datetime from <time datetime="...">
        published_at = ''
        time_match = re.search(r'<time[^>]+datetime="([^"]+)"', block)
        if time_match:
            published_at = time_match.group(1)

        # Skip messages with no text AND no images (system messages)
        if not text and not images:
            continue

        # Fetch OG metadata for links in the text
        link_previews = get_link_previews(text) if text else []

        messages.append({
            'telegram_post_id': post_id,
            'content': text or '',
            'images': images or [],
            'published_at': published_at or None,
            'link_previews': link_previews,
        })

    return messages


# ── Supabase Upsert ──────────────────────────────────────────

def upsert_moments(records):
    """Upsert records to Supabase moments table via REST API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print('Error: BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_KEY must be set.', file=sys.stderr)
        sys.exit(1)

    endpoint = f'{SUPABASE_URL.rstrip("/")}/rest/v1/moments?on_conflict=telegram_post_id'
    payload = json.dumps(records, ensure_ascii=False).encode('utf-8')

    req = urllib.request.Request(
        endpoint,
        data=payload,
        method='POST',
        headers={
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
        }
    )

    try:
        response = urllib.request.urlopen(req, timeout=30)
        status = response.getcode()
        print(f'Supabase upsert: HTTP {status}, {len(records)} records')
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        print(f'Supabase upsert failed: HTTP {e.code} - {body}', file=sys.stderr)
        return False
    except Exception as e:
        print(f'Supabase upsert error: {e}', file=sys.stderr)
        return False


# ── Main ─────────────────────────────────────────────────────

def main():
    print(f'Fetching Telegram channel: {TELEGRAM_URL}')
    try:
        html = fetch_url(TELEGRAM_URL)
    except Exception as e:
        print(f'Failed to fetch Telegram: {e}', file=sys.stderr)
        sys.exit(1)

    messages = parse_telegram_messages(html)
    print(f'Parsed {len(messages)} messages')

    if not messages:
        print('No messages to upsert.')
        return

    # Upsert all messages in a single request
    success = upsert_moments(messages)
    if not success:
        sys.exit(1)

    print('Done.')


if __name__ == '__main__':
    main()
