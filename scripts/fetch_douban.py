#!/usr/bin/env python3
"""Fetch Douban reading and movie data for a user and save as JSON.

Reads the mobile site's JSON API (m.douban.com/rexxar) for totals and the
most recent items; the desktop list pages answer scripts with 403. For the
homepage shelves each recent item also carries:

  books   id, author, pages
  movies  id, year, kind (movie / tv), minutes (per episode), episodes

plus its cover, downloaded to public/images/douban/<kind>-<id>.jpg, the
cover's aspect ratio and its main colour (the spine colour) with a readable
ink colour. Runtimes come from one detail request per movie; items already in
the previous data/douban.json are not fetched again.

When Douban refuses a request, that section keeps what the previous
data/douban.json had.
"""

import colorsys
import io
import json
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print('Pillow not installed, run: pip install Pillow')
    raise

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = REPO_ROOT / 'data' / 'douban.json'
COVER_DIR = REPO_ROOT / 'public' / 'images' / 'douban'
COVER_URL = '/images/douban'

DOUBAN_USER = '82387673'
API = 'https://m.douban.com/rexxar/api/v2'
REQUEST_DELAY = 1.5  # seconds between requests
COVER_WIDTH = 360    # px; the shelf shows covers at most ~190px wide

# How many items each section keeps
COUNTS = {
    ('books', 'read'): 12,
    ('books', 'reading'): 6,
    ('movies', 'watched'): 10,
    ('movies', 'watching'): 6,
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
                  'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}


# -- Helpers ----------------------------------------------------------------

def fetch(url, referer, retries=3, binary=False):
    """GET a URL with retries. Returns bytes/str or None on failure."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={**HEADERS, 'Referer': referer})
            resp = urllib.request.urlopen(req, timeout=30)
            data = resp.read()
            return data if binary else data.decode('utf-8')
        except urllib.error.HTTPError as e:
            print(f'  HTTP {e.code} for {url} (attempt {attempt + 1}/{retries})')
            if (e.code in (403, 429) or e.code >= 500) and attempt < retries - 1:
                time.sleep(REQUEST_DELAY * (attempt + 2))
                continue
            return None
        except Exception as e:
            print(f'  Error fetching {url}: {e} (attempt {attempt + 1}/{retries})')
            if attempt < retries - 1:
                time.sleep(REQUEST_DELAY)
                continue
            return None
    return None


def fetch_json(url, referer):
    text = fetch(url, referer)
    if not text:
        return None
    try:
        data = json.loads(text)
    except ValueError:
        print(f'  Not JSON: {url}')
        return None
    if isinstance(data, dict) and data.get('code') and not data.get('id') and 'interests' not in data:
        print(f'  API error {data.get("code")}: {data.get("msg")}')
        return None
    return data


def clean_author(authors):
    """'[美] 侯世达' → '侯世达'; several authors → first one + ' 等'."""
    names = [re.sub(r'^\s*[\[［(（【][^\]］)）】]*[\]］)）】]\s*', '', a).strip() for a in authors or []]
    names = [n for n in names if n]
    if not names:
        return ''
    return names[0] + (' 等' if len(names) > 1 else '')


def first_int(values):
    """['1053'] → 1053, ['24分钟'] → 24, ['118分钟(中国大陆)', ...] → 118."""
    for v in values or []:
        m = re.search(r'\d+', str(v))
        if m:
            return int(m.group(0))
    return None


def main_colour(im):
    """Main colour of the cover as #rrggbb: the biggest 32-level colour bucket,
    with saturated pixels counted heavier so a red title beats grey paper."""
    small = im.convert('RGB').resize((40, 56))
    buckets = {}
    px = small.tobytes()
    for i in range(0, len(px), 3):
        r, g, b = px[i], px[i + 1], px[i + 2]
        _, light, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        w = 0.25 + sat * (1 - abs(2 * light - 1)) * 3
        e = buckets.setdefault((r // 32, g // 32, b // 32), [0, 0, 0, 0])
        e[0] += r * w; e[1] += g * w; e[2] += b * w; e[3] += w
    e = max(buckets.values(), key=lambda v: v[3])
    return '#%02x%02x%02x' % (round(e[0] / e[3]), round(e[1] / e[3]), round(e[2] / e[3]))


def ink_for(hex_colour):
    """Dark ink on light spines, light ink on dark ones."""
    r, g, b = (int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
    _, light, _ = colorsys.rgb_to_hls(r, g, b)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return '#22201c' if lum > 0.55 or light > 0.82 else '#faf8f3'


def save_cover(kind, subject_id, url, referer, prev):
    """Download + shrink a cover; returns {cover, ar, spine, ink} or {}."""
    path = COVER_DIR / f'{kind}-{subject_id}.jpg'
    if path.exists() and prev.get('cover') and prev.get('spine'):
        return {k: prev[k] for k in ('cover', 'ar', 'spine', 'ink')}
    if not url:
        return {}
    # img1 … img9.doubanio.com serve the same files; try another host on a 5xx
    data = None
    for host in dict.fromkeys([url, re.sub(r'//img\d\.', '//img9.', url), re.sub(r'//img\d\.', '//img1.', url)]):
        data = fetch(host, referer, retries=2, binary=True)
        if data:
            break
    if not data:
        return {}
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception as e:
        print(f'  Bad cover {url}: {e}')
        return {}
    im = im.convert('RGB')
    if im.width > COVER_WIDTH:
        im = im.resize((COVER_WIDTH, round(im.height * COVER_WIDTH / im.width)), Image.LANCZOS)
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    im.save(path, 'JPEG', quality=84, optimize=True, progressive=True)
    spine = main_colour(im)
    time.sleep(REQUEST_DELAY / 2)
    return {
        'cover': f'{COVER_URL}/{path.name}',
        'ar': round(im.width / im.height, 4),
        'spine': spine,
        'ink': ink_for(spine),
    }


# -- Sections ---------------------------------------------------------------

def interests(kind, status, count):
    """One page of the user's marks. Returns (total, interests) or None."""
    url = f'{API}/user/{DOUBAN_USER}/interests?type={kind}&status={status}&count={count}&start=0'
    data = fetch_json(url, f'https://m.douban.com/people/{DOUBAN_USER}/')
    time.sleep(REQUEST_DELAY)
    if not data or 'interests' not in data:
        return None
    return int(data.get('total') or 0), data['interests']


def book_item(it, prev):
    s = it.get('subject') or {}
    sid = str(s.get('id') or '')
    item = {
        'id': sid,
        'title': s.get('title', ''),
        'rating': int((it.get('rating') or {}).get('value') or 0),
        'date': (it.get('create_time') or '')[:10],
        'author': clean_author(s.get('author')),
        'pages': first_int(s.get('pages')),
    }
    pic = (s.get('pic') or {}).get('large') or s.get('cover_url') or ''
    item.update(save_cover('book', sid, pic, 'https://book.douban.com/', prev.get(sid, {})))
    return item


def movie_item(it, prev):
    s = it.get('subject') or {}
    sid = str(s.get('id') or '')
    kind = 'tv' if s.get('subtype') == 'tv' else 'movie'
    item = {
        'id': sid,
        'title': s.get('title', ''),
        'rating': int((it.get('rating') or {}).get('value') or 0),
        'date': (it.get('create_time') or '')[:10],
        'year': int(s['year']) if str(s.get('year') or '').isdigit() else None,
        'kind': kind,
    }
    old = prev.get(sid, {})
    if old.get('minutes'):
        item['minutes'], item['episodes'] = old['minutes'], old.get('episodes')
    else:
        detail = fetch_json(f'{API}/{kind}/{sid}', f'https://m.douban.com/movie/subject/{sid}/') or {}
        time.sleep(REQUEST_DELAY)
        item['minutes'] = first_int(detail.get('durations'))
        episodes = int(detail.get('episodes_count') or 0)
        item['episodes'] = episodes if kind == 'tv' and episodes else None
    pic = (s.get('pic') or {}).get('large') or s.get('cover_url') or ''
    item.update(save_cover('movie', sid, pic, 'https://movie.douban.com/', old))
    return item


def fetch_douban_data(prev):
    """Fetch every section; a failed one keeps the previous data."""
    known = {}
    for category in ('books', 'movies'):
        for section in (prev.get(category) or {}).values():
            for it in (section or {}).get('items', []):
                if it.get('id'):
                    known[it['id']] = it

    pages = [
        ('books', 'read', 'book', 'done', book_item),
        ('books', 'reading', 'book', 'doing', book_item),
        ('books', 'wish', 'book', 'mark', None),
        ('movies', 'watched', 'movie', 'done', movie_item),
        ('movies', 'watching', 'movie', 'doing', movie_item),
        ('movies', 'wish', 'movie', 'mark', None),
    ]
    result = {'books': {}, 'movies': {}}
    for category, key, kind, status, make in pages:
        label = f'{category}/{key}'
        got = interests(kind, status, COUNTS.get((category, key), 1))
        if not got:
            old = (prev.get(category) or {}).get(key)
            print(f'  {label}: failed, keeping previous data')
            if old:
                result[category][key] = old
            continue
        total, marks = got
        if make:
            result[category][key] = {'total': total, 'items': [make(it, known) for it in marks]}
        else:
            result[category][key] = {'total': total}
        print(f'  {label}: total={total}' + (f', items={len(marks)}' if make else ''))

    result['updated_at'] = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    return result


def prune_covers(data):
    """Delete covers no item points at any more."""
    used = set()
    for category in ('books', 'movies'):
        for section in data.get(category, {}).values():
            for it in (section or {}).get('items', []):
                if it.get('cover'):
                    used.add(it['cover'].rsplit('/', 1)[-1])
    for path in COVER_DIR.glob('*.jpg'):
        if path.name not in used:
            path.unlink()


# -- Main -------------------------------------------------------------------

def main():
    print('Fetching Douban data...')
    prev = {}
    if OUT_FILE.exists():
        try:
            prev = json.loads(OUT_FILE.read_text(encoding='utf-8'))
        except ValueError:
            prev = {}
    data = fetch_douban_data(prev)
    prune_covers(data)
    # Keep the old timestamp when nothing changed, so the daily CI run does
    # not commit a new data/douban.json every day.
    strip = lambda d: {k: v for k, v in d.items() if k != 'updated_at'}
    if prev.get('updated_at') and strip(data) == strip(prev):
        data['updated_at'] = prev['updated_at']
        print('No changes since last fetch')

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'Written to {OUT_FILE}')


if __name__ == '__main__':
    main()
