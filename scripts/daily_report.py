#!/usr/bin/env python3
"""Enriched daily report builder for ursb.me.

Reads yesterday's stats from the homepage Supabase project, upserts each
metric into `daily_metrics`, then computes sparklines + vs-yesterday +
vs-last-week + ±2σ flags from history. Adds comment excerpts, dormant-post
detection, Umami referrer top-3, blog-api health stats, and morning
quiet-hour summary. Sends one Markdown message to the main Telegram chat.

Required env:
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
  HOMEPAGE_SB_KEY                       (homepage = blog Supabase project)

Optional env:
  BLOG_SB_URL, BLOG_SB_KEY              (default: same as homepage)
  CHAT_SB_URL, CHAT_SB_KEY              (chat Supabase, for Chat stats)
  UMAMI_API_URL, UMAMI_API_KEY,
  UMAMI_WEBSITE_ID                      (referrer top-3)
  HEALTH_URL                            (default http://39.105.102.252:8904/health)
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any

# ── Config ───────────────────────────────────────────────────────────────────

HOMEPAGE_SB_URL = 'https://pcoyocvqfipuydhvdsle.supabase.co'
HOMEPAGE_SB_KEY = os.environ['HOMEPAGE_SB_KEY']
BLOG_SB_URL = os.environ.get('BLOG_SB_URL') or HOMEPAGE_SB_URL
BLOG_SB_KEY = os.environ.get('BLOG_SB_KEY') or HOMEPAGE_SB_KEY
CHAT_SB_URL = os.environ.get('CHAT_SB_URL', '')
CHAT_SB_KEY = os.environ.get('CHAT_SB_KEY', '')
UMAMI_API_URL = os.environ.get('UMAMI_API_URL', '')
UMAMI_API_KEY = os.environ.get('UMAMI_API_KEY', '')
UMAMI_WEBSITE_ID = os.environ.get('UMAMI_WEBSITE_ID', '')
HEALTH_URL = os.environ.get('HEALTH_URL', 'http://39.105.102.252:8904/health')
TG_TOKEN = os.environ['TELEGRAM_BOT_TOKEN']
TG_CHAT = os.environ['TELEGRAM_CHAT_ID']

YESTERDAY = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
TODAY = datetime.now(timezone.utc).strftime('%Y-%m-%d')

SPARK_CHARS = '▁▂▃▄▅▆▇█'

# ── Supabase REST helpers ────────────────────────────────────────────────────

def sb_get(url: str, key: str, path: str, params: dict | None = None) -> Any:
    full = f'{url}/rest/v1/{path}'
    if params:
        # Allow list values (e.g. multiple gte/lt filters)
        encoded = []
        for k, v in params.items():
            if isinstance(v, list):
                for item in v:
                    encoded.append((k, item))
            else:
                encoded.append((k, v))
        full += '?' + urllib.parse.urlencode(encoded)
    req = urllib.request.Request(full, headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Accept': 'application/json',
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def sb_count(url: str, key: str, path: str, filters: list[str]) -> int:
    qs = '&'.join(filters)
    full = f'{url}/rest/v1/{path}?select=id&{qs}'
    req = urllib.request.Request(full, headers={
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Prefer': 'count=exact',
        'Range': '0-0',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            cr = r.headers.get('content-range', '*/0')
            return int(cr.split('/')[-1])
    except Exception as e:
        print(f'sb_count failed for {path}: {e}', file=sys.stderr)
        return 0


def sb_upsert(url: str, key: str, table: str, row: dict) -> None:
    req = urllib.request.Request(
        f'{url}/rest/v1/{table}?on_conflict=date,metric_name',
        data=json.dumps([row]).encode(),
        headers={
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates',
        },
        method='POST',
    )
    try:
        urllib.request.urlopen(req, timeout=15).read()
    except Exception as e:
        print(f'sb_upsert failed for {table} ({row.get("metric_name")}): {e}', file=sys.stderr)


# ── Metric collection ────────────────────────────────────────────────────────

def day_filter(date_str: str, field: str = 'created_at') -> list[str]:
    """Return half-open day range filter strings for a Supabase REST query."""
    next_day = (datetime.fromisoformat(date_str) + timedelta(days=1)).strftime('%Y-%m-%d')
    return [f'{field}=gte.{date_str}T00:00:00Z', f'{field}=lt.{next_day}T00:00:00Z']


def collect_metrics() -> tuple[dict, list, dict]:
    metrics: dict[str, int] = {}

    # Homepage visitors — sourced from Umami (the on-page web analytics).
    #
    # The legacy `visitors` table was a single-row counter (count/daily_count
    # columns) bumped by an old Supabase RPC. That path was retired when the
    # counter moved to blog-api's in-memory batcher (lib/visitor-counter.js),
    # so the row froze — `daily_date` stuck at 2026-05-17, `count` near-static —
    # and `sum(count)` deltas collapsed to 0/1 even on 几十~100+ visitor days.
    # Umami holds the real daily + all-time figures, so read straight from it.
    yest = datetime.fromisoformat(YESTERDAY).replace(tzinfo=timezone.utc)
    day_start_ms = int(yest.timestamp() * 1000)
    day_end_ms = int((yest + timedelta(days=1)).timestamp() * 1000) - 1
    day_stats = fetch_umami_stats(day_start_ms, day_end_ms)
    all_stats = fetch_umami_stats(0, int(datetime.now(timezone.utc).timestamp() * 1000))

    # Legacy cumulative — kept only as a monotonic floor so "累计访客" never
    # visibly regresses if Umami's retention window starts later than the site.
    legacy = sb_get(HOMEPAGE_SB_URL, HOMEPAGE_SB_KEY, 'visitors', {'select': 'count'})
    legacy_total = sum(int(r.get('count', 0)) for r in (legacy or []))

    if day_stats is not None:
        metrics['home_uv'] = day_stats['visitors']
        metrics['home_total_uv'] = max(legacy_total, (all_stats or {}).get('visitors', 0))
    else:
        # Umami unavailable — fall back to the legacy cumulative-delta logic so
        # the report still renders (will under-report until Umami recovers).
        metrics['home_total_uv'] = legacy_total
        prev = sb_get(HOMEPAGE_SB_URL, HOMEPAGE_SB_KEY, 'daily_metrics', {
            'select': 'value',
            'metric_name': 'eq.home_total_uv',
            'date': f'lt.{YESTERDAY}',
            'order': 'date.desc',
            'limit': '1',
        })
        metrics['home_uv'] = max(0, legacy_total - int(float(prev[0]['value']))) if prev else 0

    # Blog
    rng_view = day_filter(YESTERDAY, 'viewed_at')
    metrics['blog_pv'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'post_views', rng_view)

    views = sb_get(BLOG_SB_URL, BLOG_SB_KEY, 'post_views', {
        'select': 'ip,post_slug',
        'viewed_at': [f'gte.{YESTERDAY}T00:00:00Z', f'lt.{TODAY}T00:00:00Z'],
    })
    metrics['blog_uv'] = len({v['ip'] for v in views})

    post_counts: dict[str, int] = {}
    for v in views:
        post_counts[v['post_slug']] = post_counts.get(v['post_slug'], 0) + 1
    top = sorted(post_counts.items(), key=lambda x: -x[1])[:5]

    rng_created = day_filter(YESTERDAY, 'created_at')
    metrics['blog_comments'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'post_comments', rng_created)
    metrics['blog_inline_comments'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'inline_comments', rng_created)
    metrics['blog_likes'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'post_likes', rng_created)

    metrics['notes_pv'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'post_views', rng_view + ['post_slug=like.note/*'])
    metrics['notes_comments'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'post_comments', rng_created + ['post_slug=like.note/*'])
    metrics['notes_likes'] = sb_count(BLOG_SB_URL, BLOG_SB_KEY, 'post_likes', rng_created + ['post_slug=like.note/*'])

    # Chat (separate Supabase project)
    if CHAT_SB_URL and CHAT_SB_KEY:
        metrics['chat_messages'] = sb_count(
            CHAT_SB_URL, CHAT_SB_KEY, 'chat_messages',
            ['role=eq.user'] + day_filter(YESTERDAY, 'created_at'),
        )
        metrics['chat_new_visitors'] = sb_count(
            CHAT_SB_URL, CHAT_SB_KEY, 'chat_visitors',
            day_filter(YESTERDAY, 'first_seen_at'),
        )
    else:
        metrics['chat_messages'] = 0
        metrics['chat_new_visitors'] = 0

    # Persist (one row per metric, with optional meta on blog_pv)
    for name, value in metrics.items():
        meta = json.dumps({'top': top}) if name == 'blog_pv' else None
        sb_upsert(HOMEPAGE_SB_URL, HOMEPAGE_SB_KEY, 'daily_metrics', {
            'date': YESTERDAY,
            'metric_name': name,
            'value': value,
            'meta': meta,
        })

    return metrics, top, post_counts


# ── History + sparkline + delta ──────────────────────────────────────────────

def history(metric_name: str, days: int = 8) -> list[float]:
    """Return up to `days` historical values, ascending by date, ending at YESTERDAY."""
    end = datetime.fromisoformat(YESTERDAY).date()
    start = end - timedelta(days=days - 1)
    rows = sb_get(HOMEPAGE_SB_URL, HOMEPAGE_SB_KEY, 'daily_metrics', {
        'select': 'date,value',
        'metric_name': f'eq.{metric_name}',
        'date': [f'gte.{start.isoformat()}', f'lte.{end.isoformat()}'],
        'order': 'date.asc',
    })
    # Build a dict so we can fill gaps with None (display only)
    return [float(r['value']) for r in rows]


def render_metric_line(name: str, value: int, label: str) -> str:
    h = history(name)
    if len(h) < 2:
        return f'{label}: {value}  (暂无历史)'

    today_val = float(value)
    delta_d = ''
    delta_w = ''
    flag = ''
    spark = ''

    # vs prev day = h[-2] (yesterday's value would be the just-upserted row;
    # the "previous" is the second-latest row in history)
    if len(h) >= 2 and h[-2] > 0:
        pct = (today_val - h[-2]) / h[-2] * 100
        arrow = '↑' if pct >= 0 else '↓'
        delta_d = f'  {arrow}{abs(int(round(pct)))}% vs 昨'

    # vs same-day-last-week = h[-8]
    if len(h) >= 8 and h[-8] > 0:
        pct = (today_val - h[-8]) / h[-8] * 100
        arrow = '↑' if pct >= 0 else '↓'
        delta_w = f'  {arrow}{abs(int(round(pct)))}% vs 上周'

    # 7-day sparkline (excluding today's just-upserted row)
    spark_vals = h[-8:-1] if len(h) >= 8 else h[:-1]
    if len(spark_vals) >= 2:
        lo, hi = min(spark_vals), max(spark_vals)
        if hi > lo:
            spark = ''.join(SPARK_CHARS[min(7, int((v - lo) / (hi - lo) * 7))] for v in spark_vals)
        else:
            spark = SPARK_CHARS[0] * len(spark_vals)

    # ±2σ on the historical baseline (excluding today)
    base = h[:-1]
    if len(base) >= 3:
        m = statistics.mean(base)
        s = statistics.pstdev(base) or 0
        if s > 0 and abs(today_val - m) > 2 * s and abs(today_val - m) > 0.2 * m:
            flag = ' ⚠️'

    parts = f'{label}: {value}{flag}{delta_d}{delta_w}'
    if spark:
        parts += f'  {spark}'
    return parts


# ── External integrations ────────────────────────────────────────────────────

def fetch_umami_stats(start_ms: int, end_ms: int) -> dict | None:
    """Return {'visitors': int, 'pageviews': int} for [start_ms, end_ms], or None.

    Uses the same Umami v2 endpoint family + Bearer auth as fetch_referrers
    (confirmed working in CI). Returns None when Umami is unconfigured or the
    request fails, so callers can fall back gracefully.
    """
    if not (UMAMI_API_URL and UMAMI_API_KEY and UMAMI_WEBSITE_ID):
        return None
    url = (f'{UMAMI_API_URL}/api/websites/{UMAMI_WEBSITE_ID}/stats'
           f'?startAt={start_ms}&endAt={end_ms}')
    try:
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {UMAMI_API_KEY}'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
    except Exception as e:
        print(f'umami stats failed: {e}', file=sys.stderr)
        return None

    def field(name: str) -> int:
        v = data.get(name)
        if isinstance(v, dict):   # Umami v2 shape: {"value": N, "prev": M}
            v = v.get('value', 0)
        try:
            return int(v or 0)
        except (TypeError, ValueError):
            return 0

    return {'visitors': field('visitors'), 'pageviews': field('pageviews')}


def fetch_referrers() -> list[tuple[str, int]] | None:
    if not (UMAMI_API_URL and UMAMI_API_KEY and UMAMI_WEBSITE_ID):
        return None
    end = int(time.time() * 1000)
    start = end - 86400_000
    url = (f'{UMAMI_API_URL}/api/websites/{UMAMI_WEBSITE_ID}/metrics'
           f'?type=referrer&startAt={start}&endAt={end}')
    try:
        req = urllib.request.Request(url, headers={'Authorization': f'Bearer {UMAMI_API_KEY}'})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        out = []
        for d in data:
            try:
                domain = urllib.parse.urlparse(d['x']).hostname or d['x']
            except Exception:
                domain = d['x']
            out.append((domain or 'direct', int(d['y'])))
        return sorted(out, key=lambda x: -x[1])[:3]
    except Exception as e:
        print(f'umami referrers failed: {e}', file=sys.stderr)
        return None


def fetch_comment_excerpts() -> list[tuple[str, str, str]]:
    rng = [f'gte.{YESTERDAY}T00:00:00Z', f'lt.{TODAY}T00:00:00Z']
    excerpts: list[tuple[str, str, str]] = []
    # Schema differs between the two tables: post_comments uses `content`,
    # inline_comments uses `comment`.
    for table, body_col in (('post_comments', 'content'), ('inline_comments', 'comment')):
        try:
            rows = sb_get(BLOG_SB_URL, BLOG_SB_KEY, table, {
                'select': f'post_slug,nickname,{body_col},created_at',
                'created_at': rng,
                'order': 'created_at.desc',
                'limit': '3',
            })
            for r in rows:
                content = (r.get(body_col) or '').strip()
                if not content:
                    continue
                if len(content) > 80:
                    content = content[:80] + '…'
                excerpts.append((
                    r['post_slug'],
                    r.get('nickname') or '匿名',
                    content,
                ))
        except Exception as e:
            print(f'comment fetch failed ({table}): {e}', file=sys.stderr)
    return excerpts[:3]


def fetch_dormant_posts(post_counts: dict[str, int]) -> list[tuple[str, str, int]]:
    """Posts viewed yesterday whose pubDate (from feed.xml) is >30 days ago."""
    if not post_counts:
        return []
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    pub_map = _load_feed_pubdates()
    if not pub_map:
        return []
    dormant: list[tuple[str, str, int]] = []
    for slug, n in post_counts.items():
        meta = pub_map.get(slug)
        if not meta:
            continue
        title, pub = meta
        if pub < cutoff:
            dormant.append((title, pub.strftime('%Y-%m-%d'), n))
    dormant.sort(key=lambda x: -x[2])
    return dormant[:3]


_feed_cache: dict[str, tuple[str, datetime]] | None = None

def _load_feed_pubdates() -> dict[str, tuple[str, datetime]]:
    """Parse feed.xml for slug -> (title, pubDate)."""
    global _feed_cache
    if _feed_cache is not None:
        return _feed_cache
    feed_url = 'https://ursb.me/blog/feed.xml'
    try:
        with urllib.request.urlopen(feed_url, timeout=10) as r:
            xml = r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f'feed.xml fetch failed: {e}', file=sys.stderr)
        _feed_cache = {}
        return _feed_cache

    import re
    out: dict[str, tuple[str, datetime]] = {}
    for m in re.finditer(r'<item>(.*?)</item>', xml, re.DOTALL):
        block = m.group(1)
        tm = re.search(r'<title>(.*?)</title>', block, re.DOTALL)
        lm = re.search(r'<link>(.*?)</link>', block, re.DOTALL)
        pm = re.search(r'<pubDate>(.*?)</pubDate>', block, re.DOTALL)
        if not (tm and lm and pm):
            continue
        slug_m = re.search(r'/posts/([^/]+)/', lm.group(1).strip())
        if not slug_m:
            continue
        try:
            pub = datetime.strptime(pm.group(1).strip(), '%a, %d %b %Y %H:%M:%S GMT').replace(tzinfo=timezone.utc)
        except ValueError:
            continue
        out[slug_m.group(1)] = (tm.group(1).strip(), pub)
    _feed_cache = out
    return _feed_cache


def fetch_health() -> dict | None:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=5) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f'health fetch failed: {e}', file=sys.stderr)
        return None


# ── Message rendering ────────────────────────────────────────────────────────

def build_message(metrics, top, post_counts, refs, dormant, excerpts, health) -> str:
    L: list[str] = []
    L.append(f'📊 *ursb.me 日报* · {YESTERDAY}')
    L.append('─────────────')
    L.append('🌐 *主页*')
    L.append('  ' + render_metric_line('home_uv', metrics['home_uv'], '访客 (UV)'))
    L.append(f'  累计访客: {metrics["home_total_uv"]}')
    L.append('')
    L.append('📝 *博客*')
    L.append('  ' + render_metric_line('blog_pv', metrics['blog_pv'], 'PV'))
    L.append('  ' + render_metric_line('blog_uv', metrics['blog_uv'], 'UV'))
    L.append(f'  评论: {metrics["blog_comments"]} (+ 划线 {metrics["blog_inline_comments"]})  点赞: {metrics["blog_likes"]}')
    L.append('')

    if top:
        L.append('🔥 *热门文章*')
        for slug, n in top:
            L.append(f'  • {slug}: {n} PV')
        L.append('')

    L.append('📓 *Notes*')
    L.append(f'  PV: {metrics["notes_pv"]}  评论: {metrics["notes_comments"]}  点赞: {metrics["notes_likes"]}')
    note_top = sorted(
        [(s, n) for s, n in post_counts.items() if s.startswith('note/')],
        key=lambda x: -x[1],
    )[:3]
    for slug, n in note_top:
        L.append(f'  • {slug}: {n} PV')
    L.append('')

    L.append('💬 *Chat*')
    L.append(f'  对话: {metrics["chat_messages"]}  新访客: {metrics["chat_new_visitors"]}')
    L.append('')

    if excerpts:
        L.append('─────────────')
        L.append('💭 *昨日评论摘录*')
        for slug, author, content in excerpts:
            L.append(f'  《{slug}》· {author}')
            L.append(f'  > {content}')
        L.append('')

    if dormant:
        L.append('🔥 *回暖老文* (发布 >30 天，昨日有访问)')
        for title, pub, n in dormant:
            L.append(f'  • {title} ({pub}): {n} PV')
        L.append('')

    if refs:
        L.append('🌍 *来源 Top 3* (Umami)')
        L.append('  ' + ' | '.join(f'{d}: {n}' for d, n in refs))
        L.append('')
    elif not UMAMI_API_KEY:
        L.append('🌍 来源: (Umami 未配置)')
        L.append('')

    if health:
        rl = health.get('rateLimit', {})
        L.append('🩺 *服务健康度*')
        L.append(f'  blog-api 状态: {health.get("status", "?")}')
        L.append(f'  rate-limit 跟踪: {rl.get("tracked", 0)} | 已封禁: {rl.get("banned", 0)} | 在途: {rl.get("inflight", 0)}')

    return '\n'.join(L)


def send(text: str) -> None:
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


def main() -> None:
    metrics, top, post_counts = collect_metrics()
    refs = fetch_referrers()
    dormant = fetch_dormant_posts(post_counts)
    excerpts = fetch_comment_excerpts()
    health = fetch_health()
    msg = build_message(metrics, top, post_counts, refs, dormant, excerpts, health)
    print(msg)
    send(msg)


if __name__ == '__main__':
    main()
