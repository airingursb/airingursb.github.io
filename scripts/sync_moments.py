#!/usr/bin/env python3
"""Fetch Telegram channel messages and upsert them to Supabase moments table."""

import urllib.request
import urllib.error
import re
import json
import os
import sys
import html as html_module
import hashlib
import hmac
import time
import tempfile

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

# Tencent Cloud COS config
COS_SECRET_ID = os.environ.get('COS_SECRET_ID', '')
COS_SECRET_KEY = os.environ.get('COS_SECRET_KEY', '')
COS_BUCKET = os.environ.get('COS_BUCKET', '')
COS_REGION = os.environ.get('COS_REGION', '')
COS_DIRECTORY = os.environ.get('COS_DIRECTORY', '')
COS_DOMAIN = os.environ.get('COS_DOMAIN', '')

# URL regex for extracting links from text
URL_RE = re.compile(r'https?://[^\s<>\'"，。、！？；：）》\]]+')


# ── COS Upload ──────────────────────────────────────────────

def cos_enabled():
    return all([COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION, COS_DOMAIN])


def cos_sign(method, key, headers_dict):
    """Generate Tencent Cloud COS authorization signature."""
    now = int(time.time())
    expire = now + 600  # 10 min validity
    key_time = f'{now};{expire}'

    # SignKey
    sign_key = hmac.new(
        COS_SECRET_KEY.encode(), key_time.encode(), hashlib.sha1
    ).hexdigest()

    # Lowercase header keys/values for signing
    signed_headers = {}
    for k, v in headers_dict.items():
        lk = k.lower()
        if lk in ('content-type', 'content-length', 'host'):
            signed_headers[lk] = str(v)

    header_list = ';'.join(sorted(signed_headers.keys()))
    header_string = '&'.join(
        f'{k}={urllib.request.quote(str(v), safe="")}'
        for k, v in sorted(signed_headers.items())
    )

    http_string = f'{method.lower()}\n/{key}\n\n{header_string}\n'
    string_to_sign = f'sha1\n{key_time}\n{hashlib.sha1(http_string.encode()).hexdigest()}\n'
    signature = hmac.new(sign_key.encode(), string_to_sign.encode(), hashlib.sha1).hexdigest()

    return (
        f'q-sign-algorithm=sha1'
        f'&q-ak={COS_SECRET_ID}'
        f'&q-sign-time={key_time}'
        f'&q-key-time={key_time}'
        f'&q-header-list={header_list}'
        f'&q-url-param-list='
        f'&q-signature={signature}'
    )


def upload_to_cos(image_data, key, content_type='image/jpeg'):
    """Upload binary data to COS. Returns the public URL on success, None on failure."""
    host = f'{COS_BUCKET}.cos.{COS_REGION}.myqcloud.com'
    url = f'https://{host}/{key}'

    headers_dict = {
        'Host': host,
        'Content-Type': content_type,
        'Content-Length': str(len(image_data)),
    }
    auth = cos_sign('PUT', key, headers_dict)
    headers_dict['Authorization'] = auth

    req = urllib.request.Request(url, data=image_data, method='PUT', headers=headers_dict)
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        if resp.getcode() == 200:
            public_url = f'https://{COS_DOMAIN}/{key}'
            return public_url
        print(f'[COS] Upload failed: HTTP {resp.getcode()}', file=sys.stderr)
        return None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        print(f'[COS] Upload error: HTTP {e.code} - {body}', file=sys.stderr)
        return None
    except Exception as e:
        print(f'[COS] Upload error: {e}', file=sys.stderr)
        return None


def download_image(url):
    """Download image from URL, return (data, content_type) or (None, None)."""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)'
        })
        resp = urllib.request.urlopen(req, timeout=30)
        data = resp.read()
        content_type = resp.headers.get('Content-Type', 'image/jpeg')
        return data, content_type
    except Exception as e:
        print(f'[COS] Download failed ({url}): {e}', file=sys.stderr)
        return None, None


def image_filename_from_url(url):
    """Extract a stable filename from a Telegram CDN URL."""
    # e.g. https://cdn4.telegram-cdn.org/file/XXXXX.jpg → XXXXX.jpg
    path = urllib.request.urlparse(url).path if hasattr(urllib.request, 'urlparse') else url.split('?')[0]
    # Use urllib.parse for proper parsing
    from urllib.parse import urlparse
    parsed = urlparse(url)
    basename = parsed.path.rstrip('/').split('/')[-1]
    if not basename:
        basename = hashlib.md5(url.encode()).hexdigest() + '.jpg'
    return basename


def migrate_images_to_cos(images):
    """Download images from Telegram CDN and upload to COS.
    Returns a new list of image URLs (COS URLs for successful uploads, original for failures)."""
    if not cos_enabled():
        return images

    new_images = []
    for url in images:
        # Skip if already on COS
        if COS_DOMAIN in url:
            new_images.append(url)
            continue

        filename = image_filename_from_url(url)
        key = f'{COS_DIRECTORY}/{filename}'

        data, content_type = download_image(url)
        if data is None:
            print(f'[COS] Skipping (download failed): {url}')
            new_images.append(url)
            continue

        cos_url = upload_to_cos(data, key, content_type)
        if cos_url:
            print(f'[COS] Uploaded: {filename} → {cos_url}')
            new_images.append(cos_url)
        else:
            new_images.append(url)

    return new_images


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
        # Use fxtwitter.com proxy for x.com/twitter.com URLs to get OG metadata
        fetch_url = url
        if re.match(r'https?://(x\.com|twitter\.com)/', url):
            fetch_url = re.sub(r'https?://(x\.com|twitter\.com)/', 'https://fxtwitter.com/', url)
        req = urllib.request.Request(fetch_url, headers={
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


def fetch_existing_images(post_ids):
    """Fetch existing image URLs from Supabase for given telegram_post_ids.
    Returns dict: { telegram_post_id: [image_urls] }"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY or not post_ids:
        return {}

    # Query moments by telegram_post_id, only select images column
    ids_param = ','.join(f'"{pid}"' for pid in post_ids)
    endpoint = (
        f'{SUPABASE_URL.rstrip("/")}/rest/v1/moments'
        f'?select=telegram_post_id,images'
        f'&telegram_post_id=in.({ids_param})'
    )

    req = urllib.request.Request(endpoint, headers={
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    })

    try:
        resp = urllib.request.urlopen(req, timeout=15)
        data = json.loads(resp.read().decode('utf-8'))
        result = {}
        for row in data:
            imgs = row.get('images') or []
            if imgs:
                result[row['telegram_post_id']] = imgs
        return result
    except Exception as e:
        print(f'[COS] Failed to fetch existing images: {e}', file=sys.stderr)
        return {}


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

    # Migrate images from Telegram CDN to COS (skip already-migrated ones)
    if cos_enabled():
        existing_images = fetch_existing_images([m['telegram_post_id'] for m in messages])
        migrated = 0
        skipped = 0
        for msg in messages:
            if not msg.get('images'):
                continue
            post_id = msg['telegram_post_id']
            # If Supabase already has COS URLs for this moment, reuse them
            if post_id in existing_images and all(COS_DOMAIN in u for u in existing_images[post_id]):
                msg['images'] = existing_images[post_id]
                skipped += len(msg['images'])
            else:
                msg['images'] = migrate_images_to_cos(msg['images'])
                migrated += len(msg['images'])
        print(f'[COS] Migrated: {migrated}, Skipped (already on COS): {skipped}')
    else:
        print('COS not configured, skipping image migration.')

    # Upsert all messages in a single request
    success = upsert_moments(messages)
    if not success:
        sys.exit(1)

    print('Done.')


if __name__ == '__main__':
    main()
