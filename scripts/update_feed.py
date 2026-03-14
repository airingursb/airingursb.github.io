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
    pattern = rf'({re.escape(start_marker)})\n.*?\n(\s*{re.escape(end_marker)})'
    replacement = f'\\1\n{new_html}\n\\2'
    return re.sub(pattern, replacement, content, flags=re.DOTALL)


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
