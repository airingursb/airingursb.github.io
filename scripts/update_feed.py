#!/usr/bin/env python3
"""Fetch blog feed + Telegram channel + Last.fm and update index.html."""

import urllib.request
import xml.etree.ElementTree as ET
import re
import sys
import json
import os
from html.parser import HTMLParser
from datetime import datetime

FEED_URL = 'https://blog.ursb.me/feed.xml'
TELEGRAM_URL = 'https://t.me/s/airingchannel'
HTML_FILE = 'index.html'
MAX_ARTICLES = 6
MAX_TELEGRAM = 6

READWISE_TOKEN = os.environ.get('READWISE_TOKEN', 'REDACTED_READWISE_TOKEN')
READWISE_BASE = 'https://readwise.io/api/v2'

LASTFM_USER = 'airingursb'
LASTFM_API_KEY = os.environ.get('LASTFM_API_KEY', 'REDACTED_LASTFM_KEY')
LASTFM_BASE = 'http://ws.audioscrobbler.com/2.0/'


# ── Helpers ──────────────────────────────────────────────────

def fetch_url(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)'
    })
    response = urllib.request.urlopen(req, timeout=30)
    return response.read().decode('utf-8')


def escape_html(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def format_date(raw, fmt_out='%Y.%m.%d'):
    for fmt in [
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S+00:00',
        '%a, %d %b %Y %H:%M:%S %z',
        '%a, %d %b %Y %H:%M:%S %Z',
    ]:
        try:
            dt = datetime.strptime(
                raw.replace('+08:00', '+0800').replace('+00:00', '+0000'), fmt)
            return dt.strftime(fmt_out)
        except ValueError:
            continue
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', raw)
    if m:
        return f'{m.group(1)}.{m.group(2)}.{m.group(3)}'
    return raw[:10] if raw else ''


def generate_items_html(items):
    lines = []
    for a in items:
        title = escape_html(a['title'])
        link = escape_html(a['link'])
        date = a['date']
        lines.append(f'            <a href="{link}" class="post-item" target="_blank">')
        lines.append(f'              <span class="post-title">{title}</span>')
        lines.append(f'              <span class="post-date">{date}</span>')
        lines.append(f'            </a>')
    return '\n'.join(lines)


def replace_section(content, start_marker, end_marker, new_html):
    pattern = rf'({re.escape(start_marker)})\n(.*?\n)?(\s*{re.escape(end_marker)})'
    return re.sub(pattern, lambda m: m.group(1) + '\n' + new_html + '\n' + m.group(3), content, flags=re.DOTALL)


# ── Blog Feed ────────────────────────────────────────────────

def parse_blog_feed(xml_str):
    root = ET.fromstring(xml_str)
    articles = []

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = (root.findall('atom:entry', ns)
               or root.findall('{http://www.w3.org/2005/Atom}entry')
               or root.findall('.//entry'))

    if entries:
        for entry in entries[:MAX_ARTICLES]:
            title_el = (entry.find('atom:title', ns)
                        or entry.find('{http://www.w3.org/2005/Atom}title')
                        or entry.find('title'))
            link_el = (entry.find('atom:link', ns)
                       or entry.find('{http://www.w3.org/2005/Atom}link')
                       or entry.find('link'))
            pub_el = (entry.find('atom:published', ns)
                      or entry.find('{http://www.w3.org/2005/Atom}published')
                      or entry.find('atom:updated', ns)
                      or entry.find('{http://www.w3.org/2005/Atom}updated')
                      or entry.find('published')
                      or entry.find('updated'))

            title = title_el.text.strip() if title_el is not None and title_el.text else ''
            link = link_el.get('href', '') if link_el is not None else ''
            date_raw = pub_el.text.strip() if pub_el is not None and pub_el.text else ''
            articles.append({'title': title, 'link': link, 'date': format_date(date_raw)})
        return articles

    # RSS fallback
    for item in root.findall('.//item')[:MAX_ARTICLES]:
        title_el = item.find('title')
        link_el = item.find('link')
        pub_el = item.find('pubDate')
        title = title_el.text.strip() if title_el is not None and title_el.text else ''
        link = link_el.text.strip() if link_el is not None and link_el.text else ''
        date_raw = pub_el.text.strip() if pub_el is not None and pub_el.text else ''
        articles.append({'title': title, 'link': link, 'date': format_date(date_raw)})

    return articles


# ── Telegram Channel ─────────────────────────────────────────

def strip_html_tags(s):
    """Remove HTML tags, decode entities, normalize whitespace."""
    s = re.sub(r'<br\s*/?>', ' ', s)
    s = re.sub(r'<[^>]+>', '', s)
    s = s.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    s = s.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
    return re.sub(r'\s+', ' ', s).strip()


def parse_telegram(html_str):
    # Split by message blocks using data-post attribute
    msg_pattern = re.compile(
        r'data-post="([^"]+)".*?'
        r'tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>.*?'
        r'<time\s+datetime="([^"]*)"',
        re.DOTALL
    )

    raw_messages = msg_pattern.findall(html_str)
    items = []
    seen = set()

    for post_id, text_html, dt_str in raw_messages:
        if post_id in seen:
            continue
        seen.add(post_id)

        text = strip_html_tags(text_html)
        if not text or len(text) < 4:
            continue

        # Take first sentence/line, clean up
        first_line = text.split('\n')[0]
        # Cut at first URL if present
        url_pos = first_line.find('http')
        if url_pos > 0:
            first_line = first_line[:url_pos].rstrip(' -—:：·')
        # Cut at first sentence break after 20 chars
        for sep in ['。', '，', '. ', ', ']:
            pos = first_line.find(sep, 20)
            if 20 < pos < 45:
                first_line = first_line[:pos + len(sep)].rstrip()
                break
        if len(first_line) > 45:
            first_line = first_line[:42] + '...'

        date_fmt = format_date(dt_str, '%m.%d')
        link = f"https://t.me/{post_id}"

        items.append({'title': first_line, 'link': link, 'date': date_fmt})

    # Most recent first (last N, reversed)
    return items[-MAX_TELEGRAM:][::-1]


# ── Last.fm ──────────────────────────────────────────────────

LASTFM_PERIODS = [
    ('7day', '7 days'),
    ('1month', '30 days'),
    ('12month', '365 days'),
    ('overall', 'all time'),
]

ARTIST_COLORS = [
    '#4ade80', '#38bdf8', '#f472b6', '#fbbf24',
    '#a78bfa', '#fb923c', '#2dd4bf',
]
OTHERS_COLOR = '#21262d'


def lastfm_api(method, **kwargs):
    params = '&'.join(f'{k}={v}' for k, v in kwargs.items())
    url = f'{LASTFM_BASE}?method={method}&user={LASTFM_USER}&api_key={LASTFM_API_KEY}&format=json&{params}'
    raw = fetch_url(url)
    return json.loads(raw)


MAX_NAMED_ARTISTS = 7  # top N get unique colors, rest merged into "Others"


def fetch_lastfm_data():
    # User info
    info = lastfm_api('user.getinfo')
    total_scrobbles = int(info['user']['playcount'])
    registered = info['user'].get('registered', {}).get('#text', '')
    reg_year = ''
    if registered:
        try:
            reg_year = datetime.fromtimestamp(int(registered)).strftime('%Y')
        except (ValueError, TypeError, OSError):
            pass

    # First pass: fetch all periods raw data
    raw_periods = []
    for period_key, period_label in LASTFM_PERIODS:
        artists_resp = lastfm_api('user.gettopartists', period=period_key, limit='10')
        tracks_resp = lastfm_api('user.gettoptracks', period=period_key, limit='10')
        raw_periods.append({
            'key': period_key,
            'label': period_label,
            'raw_artists': artists_resp.get('topartists', {}).get('artist', []),
            'raw_tracks': tracks_resp.get('toptracks', {}).get('track', []),
        })

    # Determine top N artists from "overall" period (last entry)
    overall_artists = raw_periods[-1]['raw_artists']
    top_names = [a['name'] for a in overall_artists[:MAX_NAMED_ARTISTS]]

    # Assign colors
    artist_color_map = {}
    for i, name in enumerate(top_names):
        artist_color_map[name] = ARTIST_COLORS[i % len(ARTIST_COLORS)]

    # Second pass: build period data, merging non-top artists into "Others"
    periods = []
    for rp in raw_periods:
        total_plays = sum(int(a['playcount']) for a in rp['raw_artists'])
        named = []
        others_plays = 0

        for a in rp['raw_artists']:
            name = a['name']
            plays = int(a['playcount'])
            if name in artist_color_map:
                named.append({
                    'name': name,
                    'plays': plays,
                    'pct': round(plays / total_plays, 3) if total_plays > 0 else 0,
                })
            else:
                others_plays += plays

        if others_plays > 0:
            named.append({
                'name': 'Others',
                'plays': others_plays,
                'pct': round(others_plays / total_plays, 3) if total_plays > 0 else 0,
            })

        tracks = []
        for t in rp['raw_tracks']:
            tracks.append({
                'name': t['name'],
                'artist': t['artist']['name'],
                'plays': int(t['playcount']),
            })

        periods.append({
            'key': rp['key'],
            'label': rp['label'],
            'total': total_plays,
            'artists': named,
            'tracks': tracks,
        })

    return {
        'totalScrobbles': total_scrobbles,
        'registeredYear': reg_year,
        'artistColors': artist_color_map,
        'othersColor': OTHERS_COLOR,
        'periods': periods,
    }


def generate_music_script(data):
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return f'            <script>window.__MUSIC_DATA__={json_str}</script>'


# ── Readwise ────────────────────────────────────────────────

import random

def readwise_api(endpoint, **params):
    params_str = '&'.join(f'{k}={v}' for k, v in params.items())
    url = f'{READWISE_BASE}/{endpoint}/?{params_str}' if params_str else f'{READWISE_BASE}/{endpoint}/'
    req = urllib.request.Request(url, headers={
        'Authorization': f'Token {READWISE_TOKEN}',
        'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)',
    })
    resp = urllib.request.urlopen(req, timeout=30)
    return json.loads(resp.read().decode('utf-8'))


def fetch_readwise_data():
    # 1. Fetch latest 100 highlights
    latest = []
    page_url = f'{READWISE_BASE}/highlights/?page_size=100'
    req = urllib.request.Request(page_url, headers={
        'Authorization': f'Token {READWISE_TOKEN}',
        'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)',
    })
    resp = urllib.request.urlopen(req, timeout=30)
    data = json.loads(resp.read().decode('utf-8'))
    latest = data.get('results', [])

    # 2. Fetch total count and pick random pages for another 100
    total = data.get('count', 0)
    random_highlights = []
    if total > 100:
        total_pages = (total + 99) // 100  # pages when page_size=100
        # Pick a few random pages to get ~100 random highlights
        random_pages = random.sample(range(2, total_pages + 1), min(3, total_pages - 1))
        for pg in random_pages:
            try:
                pg_url = f'{READWISE_BASE}/highlights/?page_size=40&page={pg}'
                req = urllib.request.Request(pg_url, headers={
                    'Authorization': f'Token {READWISE_TOKEN}',
                    'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)',
                })
                resp = urllib.request.urlopen(req, timeout=30)
                pg_data = json.loads(resp.read().decode('utf-8'))
                random_highlights.extend(pg_data.get('results', []))
            except Exception:
                pass

    # 3. Collect all unique book_ids
    all_highlights = latest + random_highlights
    book_ids = set(h['book_id'] for h in all_highlights if h.get('book_id'))

    # 4. Fetch book info for these highlights
    books_map = {}
    # Fetch books page by page until we have all needed
    books_page = 1
    while True:
        try:
            books_data = readwise_api('books', page_size=100, page=books_page)
            for b in books_data.get('results', []):
                if b['id'] in book_ids:
                    books_map[b['id']] = {
                        'title': b.get('title', ''),
                        'author': b.get('author', ''),
                        'category': b.get('category', ''),
                    }
            # Stop if we've found all or no more pages
            if len(books_map) >= len(book_ids) or not books_data.get('next'):
                break
            books_page += 1
            if books_page > 20:  # safety limit
                break
        except Exception:
            break

    # 5. Build output: deduplicate, clean, sort
    seen_ids = set()
    highlights = []
    for h in all_highlights:
        if h['id'] in seen_ids:
            continue
        seen_ids.add(h['id'])
        text = h.get('text', '').strip()
        if not text or len(text) < 6:
            continue
        # Strip markdown formatting
        text = re.sub(r'\*{1,2}(.*?)\*{1,2}', r'\1', text)
        # Strip markdown links [text](url) -> text
        text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
        # Strip raw URLs left behind
        text = re.sub(r'https?://\S+', '', text)
        # Clean up leftover markers
        text = re.sub(r'\s*--\s*\[?《?', '', text)  # trailing "-- [《" refs
        text = re.sub(r'》\]?\s*$', '', text)
        text = text.strip()
        book = books_map.get(h.get('book_id'), {})
        date_str = ''
        if h.get('highlighted_at'):
            date_str = format_date(h['highlighted_at'], '%Y.%m')
        highlights.append({
            'id': h['id'],
            'text': text,
            'title': book.get('title', ''),
            'author': book.get('author', ''),
            'date': date_str,
            'url': h.get('url') or h.get('readwise_url', ''),
        })

    # Sort by id desc (latest first) for the final list
    highlights.sort(key=lambda x: x['id'], reverse=True)

    # Keep max 200
    highlights = highlights[:200]

    return {
        'total': total,
        'highlights': highlights,
    }


def generate_highlights_script(data):
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return f'            <script>window.__HIGHLIGHTS_DATA__={json_str}</script>'


# ── GitHub ──────────────────────────────────────────────────

GITHUB_USER = 'airingursb'

def fetch_github_data():
    url = f'https://api.github.com/users/{GITHUB_USER}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; FeedBot/1.0)',
    })
    resp = urllib.request.urlopen(req, timeout=30)
    user = json.loads(resp.read().decode('utf-8'))

    created = user.get('created_at', '')
    since_year = ''
    if created:
        since_year = created[:4]

    return {
        'login': user.get('login', ''),
        'avatar': user.get('avatar_url', ''),
        'bio': user.get('bio', ''),
        'followers': user.get('followers', 0),
        'following': user.get('following', 0),
        'repos': user.get('public_repos', 0),
        'sinceYear': since_year,
    }


def generate_github_script(data):
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return f'            <script>window.__GITHUB_DATA__={json_str}</script>'


# ── Life + Vibe Coding (local data) ──────────────────────────

def load_local_data():
    """Load data/local_data.json (committed by local cron)."""
    local_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'local_data.json')
    if not os.path.exists(local_file):
        return None
    with open(local_file, encoding='utf-8') as f:
        return json.load(f)


def generate_local_data_script(data):
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    return f'            <script>window.__LOCAL_DATA__={json_str}</script>'


# ── Main ─────────────────────────────────────────────────────

def main():
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    # Blog feed
    try:
        xml_str = fetch_url(FEED_URL)
        articles = parse_blog_feed(xml_str)
        if articles:
            html = generate_items_html(articles)
            content = replace_section(content, '<!-- ARTICLES_START -->', '<!-- ARTICLES_END -->', html)
            print(f'Blog: {len(articles)} articles')
            changed = True
        else:
            print('Blog: no articles found', file=sys.stderr)
    except Exception as e:
        print(f'Blog: error - {e}', file=sys.stderr)

    # Telegram channel
    try:
        tg_html = fetch_url(TELEGRAM_URL)
        tg_items = parse_telegram(tg_html)
        if tg_items:
            html = generate_items_html(tg_items)
            content = replace_section(content, '<!-- TELEGRAM_START -->', '<!-- TELEGRAM_END -->', html)
            print(f'Telegram: {len(tg_items)} messages')
            changed = True
        else:
            print('Telegram: no messages found', file=sys.stderr)
    except Exception as e:
        print(f'Telegram: error - {e}', file=sys.stderr)

    # Readwise
    try:
        rw_data = fetch_readwise_data()
        rw_html = generate_highlights_script(rw_data)
        content = replace_section(content, '<!-- HIGHLIGHTS_DATA_START -->', '<!-- HIGHLIGHTS_DATA_END -->', rw_html)
        print(f'Readwise: {len(rw_data["highlights"])} highlights (total {rw_data["total"]})')
        changed = True
    except Exception as e:
        print(f'Readwise: error - {e}', file=sys.stderr)

    # GitHub
    try:
        gh_data = fetch_github_data()
        gh_html = generate_github_script(gh_data)
        content = replace_section(content, '<!-- GITHUB_DATA_START -->', '<!-- GITHUB_DATA_END -->', gh_html)
        print(f'GitHub: @{gh_data["login"]} - {gh_data["followers"]} followers, {gh_data["repos"]} repos')
        changed = True
    except Exception as e:
        print(f'GitHub: error - {e}', file=sys.stderr)

    # Local data (vibe coding + health + mood)
    try:
        local_data = load_local_data()
        if local_data:
            local_html = generate_local_data_script(local_data)
            content = replace_section(content, '<!-- LOCAL_DATA_START -->', '<!-- LOCAL_DATA_END -->', local_html)
            print(f'Local data: updated {local_data.get("updatedAt", "?")}')
            changed = True
        else:
            print('Local data: no file found', file=sys.stderr)
    except Exception as e:
        print(f'Local data: error - {e}', file=sys.stderr)

    # Last.fm
    try:
        music_data = fetch_lastfm_data()
        script_html = generate_music_script(music_data)
        content = replace_section(content, '<!-- MUSIC_DATA_START -->', '<!-- MUSIC_DATA_END -->', script_html)
        print(f'Last.fm: {len(music_data["periods"])} periods, {music_data["totalScrobbles"]} scrobbles')
        changed = True
    except Exception as e:
        print(f'Last.fm: error - {e}', file=sys.stderr)

    if changed:
        with open(HTML_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {HTML_FILE}')
    else:
        print('No changes.')


if __name__ == '__main__':
    main()
