#!/usr/bin/env python3
"""Fetch Telegram channel messages and upsert them to Supabase moments table."""

import urllib.request
import urllib.error
import re
import json
import os
import sys

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
    # Collapse multiple blank lines to at most two newlines
    s = re.sub(r'\n{3,}', '\n\n', s)
    return s.strip()


# ── Telegram Parsing ─────────────────────────────────────────

def parse_telegram_messages(html_str):
    """Parse full Telegram channel messages: text, images, datetime, post_id."""

    # Split HTML into individual message blocks by data-post attribute
    # Each block starts at data-post="..." and runs until the next one
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

        # Extract image URLs from background-image:url('...') inside photo wrap elements
        images = []
        # Match photo wrap elements: tgme_widget_message_photo_wrap or similar
        photo_wraps = re.findall(
            r'tgme_widget_message_photo_wrap[^>]*style="[^"]*background-image:url\(\'([^\']+)\'\)',
            block
        )
        images.extend(photo_wraps)

        # Also catch background-image patterns without the photo_wrap class name
        # (some messages use inline style on other elements)
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

        messages.append({
            'telegram_post_id': post_id,
            'content': text if text else None,
            'images': images if images else None,
            'published_at': published_at if published_at else None,
        })

    return messages


# ── Supabase Upsert ──────────────────────────────────────────

def upsert_moments(records):
    """Upsert records to Supabase moments table via REST API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print('Error: BLOG_SUPABASE_URL and BLOG_SUPABASE_SERVICE_KEY must be set.', file=sys.stderr)
        sys.exit(1)

    endpoint = f'{SUPABASE_URL.rstrip("/")}/rest/v1/moments'
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
