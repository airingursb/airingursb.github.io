#!/usr/bin/env python3
"""Fetch the recent posts of the @airingchannel Telegram channel for the
homepage Channel card and save them to src/data/telegram.json.

Reads the public preview page t.me/s/airingchannel (plus a few `?before=`
pages until MAX_MESSAGES posts are collected) and keeps, per post:

  id, url, date (ISO), title (one-line headline), text (plain), html
  (sanitised: <a>, <b>, <i>, <code>, <s>, <u> and newlines only), views,
  images, link preview, reactions, forwarded-from name, and for Douban
  "看过 / 读过 …" posts the poster, rating and runtime from data/douban.json

and, for the channel: title, handle, subscriber / photo / video / link
counters, message count (latest post id) and the avatar.

Images are downloaded at build time because telesco.pe links are signed and
expire: posts to public/images/tg/<post>-<n>.webp, link previews to
<post>-lp.webp, Douban posters to douban-<subject>.webp and the avatar to
avatar-<hash>.webp, each shrunk to at most 800px wide. Existing files are
not downloaded again; files no post points at any more are deleted.

Service messages ("Channel photo updated", pins) and posts with nothing we
can show (stickers, polls, files) are skipped. When Telegram cannot be
reached or the page does not parse, the previous JSON and images are kept
and the script still exits 0, so a deploy never fails on it.
"""

import hashlib
import html as htmllib
import io
import json
import re
import shutil
import sys
import time
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin

try:
    from PIL import Image
except ImportError:  # pragma: no cover - CI installs Pillow before this step
    Image = None

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = REPO_ROOT / 'src' / 'data' / 'telegram.json'
DOUBAN_FILE = REPO_ROOT / 'data' / 'douban.json'
DOUBAN_COVER_DIR = REPO_ROOT / 'public' / 'images' / 'douban'
IMG_DIR = REPO_ROOT / 'public' / 'images' / 'tg'
IMG_URL = '/images/tg'

HANDLE = 'airingchannel'
CHANNEL_URL = f'https://t.me/s/{HANDLE}'
MAX_MESSAGES = 30   # homepage shows 6, "load older" reveals the rest
MAX_PAGES = 4       # each preview page holds ~20 posts
IMG_WIDTH = 800
POSTER_WIDTH = 240
REQUEST_DELAY = 0.6

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

BG_URL_RE = re.compile(r"background-image:\s*url\(['\"]?([^'\")]+)['\"]?\)")
DOUBAN_RE = re.compile(
    r"^\s*(看过|想看|在看|读过|想读|在读)\s*(.+?)\s+-\s+(https?://(movie|book)\.douban\.com/subject/(\d+)/?)\s*$",
    re.S)
URL_RE = re.compile(r'https?://\S+')
KEEP_TAGS = {'a', 'b', 'strong', 'i', 'em', 'code', 'pre', 's', 'del', 'u'}


def log(msg):
    print(f'Telegram: {msg}')


def fetch(url, binary=False, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
            return data if binary else data.decode('utf-8')
        except Exception as e:  # noqa: BLE001 - any network failure is non-fatal
            if attempt < retries:
                time.sleep(REQUEST_DELAY * (attempt + 2))
                continue
            log(f'fetch failed {url[:80]}: {e}')
            return None


def has_class(attrs, name):
    return name in (attrs.get('class') or '').split()


def bg_url(attrs):
    m = BG_URL_RE.search(attrs.get('style') or '')
    if not m:
        return ''
    u = m.group(1)
    return 'https:' + u if u.startswith('//') else u


# -- Parser -----------------------------------------------------------------

class ChannelParser(HTMLParser):
    """One pass over a t.me/s page: channel header + every post bubble."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.channel = {}
        self.messages = []
        self.msg = None
        self.depth = 0            # open elements inside the current post
        self.cap = None           # (field, depth at which it ends)
        self.buf = []
        self.html_buf = None      # sanitised html of the message text
        self.text_depth = None
        self.skip_depth = None    # inside a reply quote / nested text: ignore
        self.counter_val = None
        self.counter_wait = False

    # Elements that never get an end tag
    VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'wbr'}

    def start_cap(self, field):
        self.cap = (field, self.depth)
        self.buf = []

    def handle_starttag(self, tag, attrs_list):
        attrs = {k: (v or '') for k, v in attrs_list}
        cls = attrs.get('class') or ''

        # Channel header (outside posts)
        if self.msg is None:
            if 'tgme_channel_info_header' in cls.split() or has_class(attrs, 'tgme_page_photo_image'):
                pass
            if tag == 'img' and 'avatar' not in self.channel and self._in_header_photo:
                self.channel['avatar'] = attrs.get('src', '')
            if has_class(attrs, 'tgme_page_photo_image'):
                self._in_header_photo = True
            if has_class(attrs, 'tgme_channel_info_header_title'):
                self.start_cap('ch_title')
            if has_class(attrs, 'counter_value'):
                self.start_cap('counter_value')
            if has_class(attrs, 'counter_type'):
                self.start_cap('counter_type')
            if tag == 'div' and attrs.get('data-post'):
                self._begin_post(attrs)
                return
            if tag not in self.VOID:
                self.depth += 1
            return

        if tag == 'div' and attrs.get('data-post'):
            self._end_post()
            self._begin_post(attrs)
            return

        if tag not in self.VOID:
            self.depth += 1
        m = self.msg

        if self.skip_depth is not None:
            return

        # Message text (sanitised html)
        if self.html_buf is not None:
            if tag == 'br':
                self.html_buf.append('\n')
            elif tag == 'div' and has_class(attrs, 'tgme_widget_message_text'):
                pass  # forwarded posts nest a second text div — flatten it
            elif tag == 'a':
                href = attrs.get('href', '')
                if href.startswith('?q='):
                    href = f'https://t.me/s/{HANDLE}' + href
                elif href.startswith('//'):
                    href = 'https:' + href
                if href.startswith(('http://', 'https://', 'tg://')):
                    self.html_buf.append(f'<a href="{htmllib.escape(href, quote=True)}" target="_blank" rel="noopener">')
                else:
                    self.html_buf.append('<a>')
            elif tag in KEEP_TAGS:
                t = {'strong': 'b', 'em': 'i', 'del': 's', 'pre': 'code'}.get(tag, tag)
                # emoji glyphs come as <i class="emoji"><b>👍</b></i>: keep the glyph only
                if tag == 'i' and has_class(attrs, 'emoji'):
                    self.html_buf.append('<!--e-->')
                elif tag == 'b' and self.html_buf and self.html_buf[-1] == '<!--e-->':
                    self.html_buf.append('<!--eb-->')
                else:
                    self.html_buf.append(f'<{t}>')
            return

        if has_class(attrs, 'service_message') or has_class(attrs, 'tgme_widget_message_service_photo'):
            m['service'] = True
        if has_class(attrs, 'tgme_widget_message_reply'):
            self.skip_depth = self.depth
            return
        if has_class(attrs, 'tgme_widget_message_forwarded_from_name'):
            self.start_cap('fwd')
        elif has_class(attrs, 'tgme_widget_message_photo_wrap'):
            u = bg_url(attrs)
            if u:
                ratio = attrs.get('data-ratio')
                m['images'].append({'src': u, 'video': False, 'ratio': float(ratio) if ratio else None})
        elif has_class(attrs, 'tgme_widget_message_video_thumb'):
            u = bg_url(attrs)
            if u:
                m['images'].append({'src': u, 'video': True, 'ratio': None})
        elif tag == 'div' and has_class(attrs, 'tgme_widget_message_text') and m['html'] is None and not m['_in_lp']:
            self.html_buf = []
            self.text_depth = self.depth
        elif has_class(attrs, 'tgme_widget_message_link_preview'):
            m['_in_lp'] = True
            m['_lp_depth'] = self.depth
            m['preview'] = {'url': attrs.get('href', ''), 'site': '', 'title': '', 'description': '', 'image': '', 'side': False}
        elif m['_in_lp'] and has_class(attrs, 'link_preview_site_name'):
            self.start_cap('lp_site')
        elif m['_in_lp'] and has_class(attrs, 'link_preview_title'):
            self.start_cap('lp_title')
        elif m['_in_lp'] and has_class(attrs, 'link_preview_description'):
            self.start_cap('lp_desc')
        elif m['_in_lp'] and (has_class(attrs, 'link_preview_image') or has_class(attrs, 'link_preview_right_image')):
            m['preview']['image'] = bg_url(attrs)
            m['preview']['side'] = has_class(attrs, 'link_preview_right_image')
        elif has_class(attrs, 'tgme_reaction'):
            self.start_cap('reaction')
        elif has_class(attrs, 'tgme_widget_message_views'):
            self.start_cap('views')
        elif tag == 'time' and attrs.get('datetime') and not m['date']:
            m['date'] = attrs['datetime']

    _in_header_photo = False

    def handle_endtag(self, tag):
        if tag in self.VOID:
            return
        if self.msg is None:
            if self.cap and self.depth == self.cap[1] + 1:
                self._finish_cap()
            if self._in_header_photo and tag == 'i':
                self._in_header_photo = False
            self.depth = max(0, self.depth - 1)
            return
        m = self.msg
        if self.depth == 0:
            # the post's own wrapper closed
            self._end_post()
            return
        if self.html_buf is not None and self.depth == self.text_depth:
            m['html'] = self._join_html()
            self.html_buf = None
            self.text_depth = None
        elif self.html_buf is not None:
            if tag == 'a':
                self.html_buf.append('</a>')
            elif tag in KEEP_TAGS:
                t = {'strong': 'b', 'em': 'i', 'del': 's', 'pre': 'code'}.get(tag, tag)
                if tag == 'b' and self.html_buf and self.html_buf[-1].startswith('<!--eb-->'):
                    pass
                elif tag == 'i' and self._closing_emoji():
                    pass
                else:
                    self.html_buf.append(f'</{t}>')
        if self.cap and self.depth == self.cap[1]:
            self._finish_cap()
        if self.skip_depth is not None and self.depth == self.skip_depth:
            self.skip_depth = None
        if m['_in_lp'] and self.depth == m['_lp_depth']:
            m['_in_lp'] = False
        self.depth -= 1

    def _closing_emoji(self):
        # find the most recent emoji opener that has not been closed yet
        for i in range(len(self.html_buf) - 1, -1, -1):
            tok = self.html_buf[i]
            if tok == '<!--e-->':
                self.html_buf[i] = ''
                return True
            if tok.startswith('<!--eb-->'):
                self.html_buf[i] = tok[len('<!--eb-->'):]
                continue
            if tok.startswith('<') and not tok.startswith('<!--'):
                return False
        return False

    def handle_data(self, data):
        if self.msg is not None and self.skip_depth is not None:
            return
        if self.html_buf is not None:
            esc = htmllib.escape(data, quote=False)
            if self.html_buf and self.html_buf[-1].startswith('<!--eb-->'):
                self.html_buf[-1] += esc
            else:
                self.html_buf.append(esc)
        if self.cap:
            self.buf.append(data)

    def _finish_cap(self):
        field, _ = self.cap
        val = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
        self.cap = None
        if field == 'ch_title':
            self.channel['title'] = val
        elif field == 'counter_value':
            self.counter_val = val
        elif field == 'counter_type':
            if self.counter_val is not None:
                self.channel.setdefault('counters', {})[val] = self.counter_val
                self.counter_val = None
        elif self.msg is not None:
            m = self.msg
            if field == 'fwd':
                m['forwarded_from'] = val
            elif field == 'views':
                m['views'] = val
            elif field == 'reaction':
                mm = re.match(r'^(.*?)\s*([\d.,]+[KM]?)$', val)
                if mm and mm.group(1):
                    m['reactions'].append({'emoji': mm.group(1), 'count': mm.group(2)})
            elif field.startswith('lp_') and m.get('preview'):
                key = {'lp_site': 'site', 'lp_title': 'title', 'lp_desc': 'description'}[field]
                m['preview'][key] = val

    def _join_html(self):
        s = ''.join(t for t in self.html_buf if t not in ('<!--e-->',))
        s = s.replace('<!--eb-->', '')
        s = s.replace('\r', '')
        return s.strip()

    def _begin_post(self, attrs):
        post = attrs['data-post']
        try:
            pid = int(post.rsplit('/', 1)[-1])
        except ValueError:
            pid = None
        self.msg = {
            'id': pid, 'service': has_class(attrs, 'service_message'), 'html': None,
            'images': [], 'preview': None, 'reactions': [], 'views': '', 'date': '',
            'forwarded_from': '', '_in_lp': False, '_lp_depth': 0,
        }
        self._outer_depth = self.depth
        self.depth = 0
        self.cap = None
        self.html_buf = None
        self.skip_depth = None

    def _end_post(self):
        if self.msg is not None:
            if self.html_buf is not None:
                self.msg['html'] = self._join_html()
                self.html_buf = None
            self.messages.append(self.msg)
        self.msg = None
        self.depth = getattr(self, '_outer_depth', 0)
        self.cap = None
        self.skip_depth = None


def html_to_text(s):
    s = re.sub(r'<[^>]+>', '', s or '')
    return htmllib.unescape(s).strip()


def headline(text):
    """One line for the CLI / status API and alt texts."""
    line = next((x for x in (text or '').split('\n') if x.strip()), '')
    line = URL_RE.sub('', line).strip().rstrip(' -—:：·')
    line = re.sub(r'\s{2,}.*$', '', line)  # bot posts: stop at the first paragraph
    for sep in ['。', '，', '. ', ', ']:
        pos = line.find(sep, 20)
        if 20 < pos < 45:
            line = line[:pos + len(sep)].rstrip()
            break
    if len(line) > 45:
        line = line[:42] + '...'
    return line


# -- Images -----------------------------------------------------------------

def save_image(url, name, width=IMG_WIDTH, data=None):
    """Download, shrink and store as WebP. Returns {src, w, h} or None."""
    path = IMG_DIR / f'{name}.webp'
    if path.exists():
        try:
            with Image.open(path) as im:
                return {'src': f'{IMG_URL}/{path.name}', 'w': im.width, 'h': im.height}
        except Exception:  # noqa: BLE001
            path.unlink()
    if data is None:
        if not url:
            return None
        data = fetch(url, binary=True)
        time.sleep(REQUEST_DELAY / 2)
    if not data:
        return None
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception as e:  # noqa: BLE001
        log(f'bad image {name}: {e}')
        return None
    im = im.convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=80, method=6)
    return {'src': f'{IMG_URL}/{path.name}', 'w': im.width, 'h': im.height}


def save_avatar(url, prev_avatar):
    data = fetch(url, binary=True) if url else None
    if not data:
        return prev_avatar
    try:
        im = Image.open(io.BytesIO(data))
        im = im.convert('RGB')
    except Exception:  # noqa: BLE001
        return prev_avatar
    im.thumbnail((240, 240), Image.LANCZOS)
    digest = hashlib.sha1(im.tobytes()).hexdigest()[:8]
    out = save_image('', f'avatar-{digest}', width=240, data=data)
    return out['src'] if out else prev_avatar


# -- Douban -----------------------------------------------------------------

def load_douban():
    try:
        d = json.loads(DOUBAN_FILE.read_text(encoding='utf-8'))
    except Exception:  # noqa: BLE001
        return {}
    out = {}
    for cat, kind in (('movies', 'movie'), ('books', 'book')):
        for section in (d.get(cat) or {}).values():
            for it in (section or {}).get('items', []) or []:
                if it.get('id'):
                    out[(kind, str(it['id']))] = it
    return out


def douban_card(text, douban, prev):
    m = DOUBAN_RE.match(text or '')
    if not m:
        return None
    verb, title, href, kind, sid = m.groups()
    card = {'kind': kind, 'id': sid, 'verb': verb, 'title': title, 'url': href}
    it = douban.get((kind, sid))
    if it:
        for k in ('rating', 'year', 'minutes', 'episodes', 'author', 'pages'):
            if it.get(k) is not None:
                card[k] = it[k]
        if kind == 'movie':
            card['tv'] = it.get('kind') == 'tv'
        cover = DOUBAN_COVER_DIR / Path(it.get('cover') or '').name if it.get('cover') else None
        if cover and cover.exists():
            img = save_image('', f'douban-{sid}', width=POSTER_WIDTH, data=cover.read_bytes())
            if img:
                card['cover'] = img
    elif prev:
        # Dropped off the Douban shelves since: keep what we stored last time
        for k, v in prev.items():
            card.setdefault(k, v)
    if 'cover' not in card and (IMG_DIR / f'douban-{sid}.webp').exists():
        card['cover'] = save_image('', f'douban-{sid}', width=POSTER_WIDTH)
    return card


# -- Main -------------------------------------------------------------------

def collect():
    pages = []
    url = CHANNEL_URL
    seen = {}
    channel = {}
    for _ in range(MAX_PAGES):
        page = fetch(url)
        if not page:
            break
        p = ChannelParser()
        p.feed(page)
        p.close()
        if not channel and p.channel:
            channel = p.channel
        pages.append(len(p.messages))
        for m in p.messages:
            if m['id'] is not None and m['id'] not in seen:
                seen[m['id']] = m
        usable = [m for m in seen.values() if is_usable(m)]
        if len(usable) >= MAX_MESSAGES or not p.messages:
            break
        oldest = min(m['id'] for m in p.messages if m['id'] is not None)
        url = f'{CHANNEL_URL}?before={oldest}'
        time.sleep(REQUEST_DELAY)
    return channel, sorted(seen.values(), key=lambda m: -m['id'])


def is_usable(m):
    if m['service']:
        return False
    text = html_to_text(m['html'] or '')
    if text.startswith('Airing Channel pinned'):
        return False
    return bool(text or m['images'] or (m['preview'] and m['preview'].get('title')))


def to_int(s):
    s = (s or '').strip().upper().replace(',', '')
    mult = 1
    if s.endswith('K'):
        mult, s = 1000, s[:-1]
    elif s.endswith('M'):
        mult, s = 1_000_000, s[:-1]
    try:
        return int(float(s) * mult)
    except ValueError:
        return None


def build(prev):
    channel_raw, raw = collect()
    msgs = [m for m in raw if is_usable(m)][:MAX_MESSAGES]
    if not msgs:
        return None

    prev_msgs = {m['id']: m for m in (prev.get('messages') or [])}
    douban = load_douban()
    out = []
    for m in msgs:
        pid = m['id']
        html = m['html'] or ''
        text = html_to_text(html)
        item = {
            'id': pid,
            'url': f'https://t.me/{HANDLE}/{pid}',
            'date': m['date'],
            'title': headline(text),
            'text': text,
            'html': html,
            'views': m['views'],
        }
        if m['forwarded_from']:
            item['forwarded_from'] = m['forwarded_from']
        images = []
        for n, im in enumerate(m['images'][:4]):
            saved = save_image(im['src'], f'{pid}-{n}')
            if saved:
                if im['video']:
                    saved['video'] = True
                images.append(saved)
        item['images'] = images
        lp = m['preview']
        if lp and (lp.get('title') or lp.get('description')):
            preview = {k: lp[k] for k in ('url', 'site', 'title', 'description')}
            if lp.get('image'):
                img = save_image(lp['image'], f'{pid}-lp')
                if img:
                    # Telegram's "right image" or a portrait image: thumbnail beside the text
                    preview['image'] = img
                    preview['layout'] = 'side' if lp.get('side') or img['h'] > img['w'] * 1.05 else 'wide'
            item['preview'] = preview
        else:
            item['preview'] = None
        card = douban_card(text, douban, (prev_msgs.get(pid) or {}).get('douban'))
        if card:
            item['douban'] = card
        item['reactions'] = m['reactions']
        out.append(item)

    counters = channel_raw.get('counters') or {}
    prev_ch = prev.get('channel') or {}
    channel = {
        'title': channel_raw.get('title') or prev_ch.get('title') or 'Airing Channel',
        'handle': HANDLE,
        'url': f'https://t.me/{HANDLE}',
        'subscribers': to_int(counters.get('subscribers')) or prev_ch.get('subscribers'),
        'photos': to_int(counters.get('photos')) or prev_ch.get('photos'),
        'videos': to_int(counters.get('videos')) or prev_ch.get('videos'),
        'links': to_int(counters.get('links')) or prev_ch.get('links'),
        'messages': max(m['id'] for m in raw if m['id']) if raw else prev_ch.get('messages'),
        'avatar': save_avatar(channel_raw.get('avatar'), prev_ch.get('avatar')),
    }
    return {'channel': channel, 'messages': out}


def used_files(data):
    used = set()

    def add(src):
        if src and src.startswith(IMG_URL + '/'):
            used.add(src.rsplit('/', 1)[-1])

    add(data['channel'].get('avatar'))
    for m in data['messages']:
        for im in m.get('images') or []:
            add(im.get('src'))
        add(((m.get('preview') or {}).get('image') or {}).get('src'))
        add(((m.get('douban') or {}).get('cover') or {}).get('src'))
    return used


def main():
    if Image is None:
        log('Pillow not installed (pip install Pillow); keeping previous data')
        return
    prev = {}
    if OUT_FILE.exists():
        try:
            prev = json.loads(OUT_FILE.read_text(encoding='utf-8'))
            if not isinstance(prev, dict):
                prev = {}  # the old list-of-headlines format
        except ValueError:
            prev = {}
    try:
        data = build(prev)
    except Exception as e:  # noqa: BLE001 - never fail the deploy over the channel card
        log(f'error - {e}; keeping previous data')
        return
    if not data:
        log('no messages parsed; keeping previous data')
        return

    data['updated_at'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    strip = lambda d: {k: v for k, v in d.items() if k != 'updated_at'}
    if prev.get('updated_at') and strip(prev) == strip(data):
        data['updated_at'] = prev['updated_at']
        log('no changes since last fetch')

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    used = used_files(data)
    removed = 0
    for path in IMG_DIR.glob('*'):
        if path.is_file() and path.name not in used:
            path.unlink()
            removed += 1
    n_img = len(used)
    log(f"{len(data['messages'])} messages, {n_img} images ({removed} old removed) -> {OUT_FILE.relative_to(REPO_ROOT)}")


if __name__ == '__main__':
    main()
