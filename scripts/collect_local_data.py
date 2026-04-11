#!/usr/bin/env python3
"""Collect local-only data (health, mood, vibe coding) and write to data/local_data.json.

Run on the local Mac via cron. The JSON is committed to the repo so that
update_feed.py (which runs in CI) can inject it into index.html.
"""

import json
import csv
import os
import sys
import subprocess
import glob
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = Path(__file__).resolve().parent
OUT_FILE = REPO_ROOT / 'data' / 'local_data.json'

# Load .env from repo root so VIBE_REMOTE_* is available to the remote fetch.
_env_file = REPO_ROOT / '.env'
if _env_file.exists():
    with open(_env_file) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _v = _line.split('=', 1)
                os.environ.setdefault(_k.strip(), _v.strip())

# Import the standalone Claude/Codex/Gemini collector. Same module is also
# streamed to the remote work Mac over SSH and run there against its own
# ~/.codex, ~/.gemini, and ccusage install (see _collect_vibe_remote below).
sys.path.insert(0, str(SCRIPT_DIR))
from _vibe_collect import collect_all as collect_vibe_machine  # noqa: E402

HEALTH_BASE = os.path.expanduser(
    '~/Library/Mobile Documents/iCloud~com~ifunography~HealthExport/Documents'
)
HEALTH_DIR = os.path.join(HEALTH_BASE, 'iCloud Backup')
WORKOUT_DIR = os.path.join(HEALTH_BASE, 'Workouts Backup')
MOOD_DIR = os.path.join(HEALTH_BASE, 'Mood Backup')
DAYLIO_DIR = os.path.join(HEALTH_BASE, 'Daylio Backup')


# ── Helpers ──────────────────────────────────────────────────

def latest_file(directory, pattern='HealthAutoExport-*.json'):
    files = sorted(glob.glob(os.path.join(directory, pattern)))
    return files[-1] if files else None


def parse_health_date(s):
    """Parse 'YYYY-MM-DD HH:MM:SS +0800' → date string."""
    return s[:10] if s else ''


def sum_metric_today(metrics, name, date_str):
    """Sum all data points for a metric on a given date."""
    for m in metrics:
        if m['name'] == name:
            total = sum(
                d.get('qty', 0) for d in m.get('data', [])
                if parse_health_date(d.get('date', '')) == date_str
            )
            return total
    return 0


def avg_metric_today(metrics, name, date_str):
    """Average all data points for a metric on a given date."""
    for m in metrics:
        if m['name'] == name:
            vals = [
                d['qty'] for d in m.get('data', [])
                if parse_health_date(d.get('date', '')) == date_str and d.get('qty')
            ]
            return round(sum(vals) / len(vals), 1) if vals else 0
    return 0


def first_metric_today(metrics, name, date_str):
    """Get the first data point for a metric on a given date."""
    for m in metrics:
        if m['name'] == name:
            for d in m.get('data', []):
                if parse_health_date(d.get('date', '')) == date_str:
                    return d.get('qty', 0)
    return 0


# ── Vibe Coding ──────────────────────────────────────────────
#
# Final aggregation formula:
#
#     TOTAL = 本机   (local_claude   + local_codex   + local_gemini)
#           + 服务端 (server_claude × 2 + server_codex + server_gemini)
#
# Concretely:
#     total_claude = local_claude + 2 × server_claude
#     total_codex  = local_codex  + 1 × server_codex
#     total_gemini = local_gemini + 1 × server_gemini
#
# Both machines emit the SAME JSON shape — the same collector script
# (scripts/_vibe_collect.py) runs in-process locally, and is streamed over
# SSH to `python3 -` on the server Mac so it runs there against the server's
# own ~/.codex, ~/.gemini, and ccusage. The results are merged day-by-day.
#
# The server_claude × 2 multiplier is an intentional over-weighting: the
# work Mac runs a heavier Claude Code workflow than raw ccusage history
# reflects (parallel agents / multi-worktree sessions) — tweak
# SERVER_CLAUDE_FACTOR below if that ratio changes.
#
# Data sources per machine (identical on local + server):
#   • Claude → `ccusage daily --json --breakdown --since <90d>` (real API $)
#   • Codex  → ~/.codex/sessions/**/rollout-*.jsonl (last token_count event
#              per session; synthetic $ at OpenAI list-price)
#   • Gemini → ~/.gemini/tmp/*/chats/session-*.json (per-message tokens
#              summed; synthetic $ at Google list-price)
#
# Codex + Gemini are subscription-billed, so their marginal $ is really 0.
# The synthetic costs keep the headline number comparable to Claude's real
# spend; see CODEX_PRICING / GEMINI_PRICING in scripts/_vibe_collect.py.

VIBE_SINCE_DAYS = 90

# Server-side multipliers per the formula above.
SERVER_CLAUDE_FACTOR = 2
SERVER_CODEX_FACTOR = 1
SERVER_GEMINI_FACTOR = 1

# Friendly model names + display colors (union of Anthropic / OpenAI / Google).
MODEL_NAME_MAP = {
    # Anthropic (Claude Code)
    'claude-opus-4-6': 'Opus 4.6',
    'claude-opus-4-5-20251101': 'Opus 4.5',
    'claude-sonnet-4-6': 'Sonnet 4.6',
    'claude-sonnet-4-5-20241022': 'Sonnet 3.5',
    'claude-haiku-4-5-20251001': 'Haiku 4.5',
    'claude-haiku-4-5': 'Haiku 4.5',
    # OpenAI (Codex CLI)
    'gpt-5': 'GPT-5',
    'gpt-5.4': 'GPT-5',
    'gpt-5-codex': 'GPT-5 Codex',
    'gpt-5.3-codex': 'GPT-5 Codex',
    # Google (Gemini CLI) — collapse 3.x and 3.1.x previews under one name
    'gemini-3-pro-preview': 'Gemini 3 Pro',
    'gemini-3.1-pro-preview': 'Gemini 3 Pro',
    'gemini-3-flash-preview': 'Gemini 3 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
}
MODEL_COLORS = {
    'Opus 4.6': '#4ade80',
    'Opus 4.5': '#a78bfa',
    'Sonnet 4.6': '#f472b6',
    'Sonnet 3.5': '#fb923c',
    'Haiku 4.5': '#38bdf8',
    'GPT-5': '#10b981',
    'GPT-5 Codex': '#0ea5e9',
    'Gemini 3 Pro': '#facc15',
    'Gemini 3 Flash': '#fbbf24',
    'Gemini 2.5 Pro': '#eab308',
    'Gemini 2.5 Flash': '#fde047',
}


# ── Daily-map helpers ────────────────────────────────────────

def _add_day(dst_map, date, cost, tokens, models):
    entry = dst_map.setdefault(date, {'cost': 0.0, 'tokens': 0, 'models': []})
    entry['cost'] += cost
    entry['tokens'] += tokens
    for m in models or []:
        if m and m not in entry['models']:
            entry['models'].append(m)


def _multiply_map(daily_map, factor):
    """Return a copy of daily_map with each day's cost/tokens scaled."""
    return {
        date: {
            'cost': e['cost'] * factor,
            'tokens': e['tokens'] * factor,
            'models': list(e['models']),
        }
        for date, e in daily_map.items()
    }


def _merge_maps(*maps):
    """Sum cost/tokens and union models across several daily_maps."""
    merged = {}
    for m in maps:
        if not m:
            continue
        for date, e in m.items():
            _add_day(merged, date, e['cost'], e['tokens'], e['models'])
    for e in merged.values():
        e['cost'] = round(e['cost'], 2)
    return merged


def _summarize(label, daily_map):
    n = len(daily_map or {})
    cost = sum(e['cost'] for e in (daily_map or {}).values())
    tokens = sum(e['tokens'] for e in (daily_map or {}).values())
    print(f'  {label:<22} {n:>3} days  ${cost:>10,.2f}  {tokens:>16,} tokens')


# ── Remote fetch (server Mac via SSH + paramiko) ─────────────

def _collect_vibe_remote(since_dt, host, user, password):
    """Stream scripts/_vibe_collect.py to HOST and run it there via `python3 -`.

    The remote stdout is a single JSON object with the shape
    `{"claude": {...}, "codex": {...}, "gemini": {...}}` — exactly the same
    shape our local collect_vibe_machine() returns — so the caller can merge
    without special-casing the source.

    Returns None on any failure (missing paramiko, bad credentials, ccusage
    absent on the remote, parse error …) and the caller falls back to
    local-only numbers rather than aborting the whole collection.
    """
    try:
        import paramiko  # lazy: only needed when VIBE_REMOTE_* is set
    except ImportError:
        print('  remote skipped: paramiko not installed (pip install --user paramiko)')
        return None

    script_path = SCRIPT_DIR / '_vibe_collect.py'
    try:
        script_src = script_path.read_text()
    except OSError as e:
        print(f'  remote: cannot read {script_path}: {e}')
        return None

    since_str = since_dt.strftime('%Y%m%d')
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            host, username=user, password=password,
            timeout=15, look_for_keys=False, allow_agent=False,
        )
        # `python3 -` reads the script from stdin; argv past `-` is forwarded.
        stdin, stdout, stderr = client.exec_command(
            f'python3 - --since {since_str}', timeout=180,
        )
        stdin.write(script_src)
        stdin.channel.shutdown_write()
        out = stdout.read().decode()
        err = stderr.read().decode()
        if not out.strip():
            msg = err.strip()[:200] or '(empty)'
            print(f'  remote: no output from {host}: {msg}')
            return None
        return json.loads(out)
    except Exception as e:
        print(f'  remote fetch failed ({host}): {e}')
        return None
    finally:
        try:
            client.close()
        except Exception:
            pass


# ── Entry point ──────────────────────────────────────────────

def collect_vibe_coding():
    """Collect Claude + Codex + Gemini from this Mac AND the server, and merge.

    Returns a single daily_map-style result; schema is kept compatible with
    the previous version (daily, totalTokens, totalCost, avgWeekCost, models,
    numDays) so downstream consumers (index.html / src/pages/index.astro)
    don't need changes.
    """
    since_dt = datetime.now() - timedelta(days=VIBE_SINCE_DAYS)

    # 1) LOCAL machine — direct in-process call, no subprocess overhead.
    local = collect_vibe_machine(since_dt)

    # 2) SERVER machine — same collector streamed over SSH. Skipped silently
    #    if VIBE_REMOTE_* isn't configured (local-only run).
    remote_host = os.environ.get('VIBE_REMOTE_HOST', '').strip()
    remote_user = os.environ.get('VIBE_REMOTE_USER', '').strip()
    remote_pw = os.environ.get('VIBE_REMOTE_PASSWORD', '').strip()
    remote = None
    if remote_host and remote_user and remote_pw:
        remote = _collect_vibe_remote(since_dt, remote_host, remote_user, remote_pw)
    else:
        print('  remote skipped: VIBE_REMOTE_{HOST,USER,PASSWORD} not set')
    if remote is None:
        remote = {'claude': {}, 'codex': {}, 'gemini': {}}

    # 3) Apply the server-side factors (claude ×2, the rest ×1) up-front so
    #    the per-component log lines actually sum to the TOTAL row below.
    server_claude = _multiply_map(remote.get('claude', {}), SERVER_CLAUDE_FACTOR)
    server_codex = _multiply_map(remote.get('codex', {}), SERVER_CODEX_FACTOR)
    server_gemini = _multiply_map(remote.get('gemini', {}), SERVER_GEMINI_FACTOR)

    # Log every (post-multiplier) component — makes a bad fetch obvious.
    _summarize('local claude', local.get('claude', {}))
    _summarize('local codex', local.get('codex', {}))
    _summarize('local gemini', local.get('gemini', {}))
    _summarize(f'server claude ×{SERVER_CLAUDE_FACTOR}', server_claude)
    _summarize(f'server codex  ×{SERVER_CODEX_FACTOR}', server_codex)
    _summarize(f'server gemini ×{SERVER_GEMINI_FACTOR}', server_gemini)

    any_local = any(local.get(t) for t in ('claude', 'codex', 'gemini'))
    any_remote = any(remote.get(t) for t in ('claude', 'codex', 'gemini'))
    if not (any_local or any_remote):
        return None

    # 4) Merge all six maps into the final daily_map.
    daily_map = _merge_maps(
        local.get('claude', {}),
        local.get('codex', {}),
        local.get('gemini', {}),
        server_claude,
        server_codex,
        server_gemini,
    )
    if not daily_map:
        return None

    _summarize('TOTAL merged', daily_map)

    total_tokens = sum(e['tokens'] for e in daily_map.values())
    total_cost = sum(e['cost'] for e in daily_map.values())

    # Union of raw model identifiers across all six maps.
    model_set = set()
    for entry in daily_map.values():
        model_set.update(entry['models'])

    # Deduplicate by friendly display name.
    seen = set()
    models_display = []
    for raw in sorted(model_set):
        friendly = MODEL_NAME_MAP.get(raw, raw)
        if friendly not in seen:
            seen.add(friendly)
            models_display.append({
                'name': friendly,
                'color': MODEL_COLORS.get(friendly, '#7d8590'),
            })

    # Weeks spanned (for avgWeekCost).
    dates = sorted(daily_map.keys())
    if len(dates) >= 2:
        first = datetime.strptime(dates[0], '%Y-%m-%d')
        last = datetime.strptime(dates[-1], '%Y-%m-%d')
        num_weeks = max(1, round((last - first).days / 7))
    else:
        num_weeks = 1

    return {
        'daily': daily_map,
        'totalTokens': total_tokens,
        'totalCost': round(total_cost, 2),
        'avgWeekCost': round(total_cost / num_weeks, 0),
        'models': models_display,
        'numDays': len(daily_map),
    }


# ── Health / Activity ────────────────────────────────────────

def collect_health():
    """Parse the latest HealthAutoExport JSON for activity ring + stats."""
    health_file = latest_file(HEALTH_DIR)
    if not health_file:
        print('No health file found')
        return None

    with open(health_file) as f:
        raw = json.load(f)

    metrics = raw.get('data', {}).get('metrics', [])
    # Use the date from the filename
    fname = os.path.basename(health_file)
    date_str = fname.replace('HealthAutoExport-', '').replace('.json', '')

    # Find yesterday too (some metrics log for previous day)
    yesterday = (datetime.strptime(date_str, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')

    # Steps: sum for the date
    steps = int(sum_metric_today(metrics, 'step_count', date_str))
    if steps == 0:
        steps = int(sum_metric_today(metrics, 'step_count', yesterday))

    # Sleep (use totalSleep field from sleep_analysis)
    sleep = 0
    for m in metrics:
        if m['name'] == 'sleep_analysis':
            for d in m.get('data', []):
                d_date = parse_health_date(d.get('date', ''))
                if d_date in (date_str, yesterday):
                    sleep = round(d.get('totalSleep', 0), 1)
                    if sleep > 0:
                        break
            if sleep > 0:
                break

    # Resting HR
    resting_hr = int(first_metric_today(metrics, 'resting_heart_rate', date_str))
    if resting_hr == 0:
        resting_hr = int(first_metric_today(metrics, 'resting_heart_rate', yesterday))

    # SpO2 (values are already in %, e.g. 97)
    spo2_vals = []
    for m in metrics:
        if m['name'] == 'blood_oxygen_saturation':
            for d in m.get('data', []):
                if parse_health_date(d.get('date', '')) in (date_str, yesterday):
                    spo2_vals.append(d.get('qty', 0))
    spo2 = round(sum(spo2_vals) / len(spo2_vals)) if spo2_vals else 0

    # Active energy (Move ring) - kJ
    active_energy = round(sum_metric_today(metrics, 'active_energy', date_str))

    # Exercise minutes
    exercise_min = int(sum_metric_today(metrics, 'apple_exercise_time', date_str))

    # Stand hours
    stand_hours = int(sum_metric_today(metrics, 'apple_stand_hour', date_str))

    return {
        'date': date_str,
        'steps': steps,
        'sleep': sleep,
        'restingHR': resting_hr,
        'spo2': int(spo2),
        'activeEnergy': int(active_energy),
        'exerciseMin': exercise_min,
        'standHours': stand_hours,
    }


# ── Workouts ─────────────────────────────────────────────────

def collect_workouts():
    """Get recent workout types from the last few export files."""
    files = sorted(glob.glob(os.path.join(WORKOUT_DIR, 'HealthAutoExport-*.json')))
    if not files:
        return None

    # Check last 7 files
    recent_files = files[-7:]
    workout_types = Counter()

    for fpath in recent_files:
        try:
            with open(fpath) as f:
                raw = json.load(f)
            workouts = raw.get('data', {}).get('workouts', [])
            for w in workouts:
                name = w.get('name', '')
                if name:
                    workout_types[name] += 1
        except Exception:
            pass

    # Top workout types
    top = [{'name': name, 'count': count} for name, count in workout_types.most_common(5)]
    return {'recentWorkouts': top}


# ── Mood / Daylio ────────────────────────────────────────────

def collect_mood():
    """Parse Daylio CSV for mood data."""
    daylio_files = sorted(glob.glob(os.path.join(DAYLIO_DIR, 'daylio_export_*.csv')))
    if not daylio_files:
        print('No Daylio file found')
        return None

    daylio_file = daylio_files[-1]

    moods = []
    activities_counter = Counter()
    earliest_date = None

    with open(daylio_file, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mood = row.get('mood', '').strip().lower()
            date_str = row.get('full_date', '')
            activities_str = row.get('activities', '')

            if mood:
                moods.append({'date': date_str, 'mood': mood})

            if not earliest_date or date_str < earliest_date:
                earliest_date = date_str

            # Count activities from recent entries (last 60)
            if activities_str:
                for a in activities_str.split(' | '):
                    a = a.strip()
                    if a:
                        activities_counter[a] += 1

    # Recent 60 mood dots (latest first in file, but CSV is chronological)
    recent_moods = [m['mood'] for m in moods[-150:]]

    # Top recent activities from last 60 entries
    recent_activities_counter = Counter()
    for row_data in moods[-60:]:
        # We need to re-read for activities of recent entries
        pass

    # Re-read last 60 entries for their activities
    recent_activities_counter = Counter()
    with open(daylio_file, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    for row in rows[-60:]:
        acts = row.get('activities', '')
        if acts:
            for a in acts.split(' | '):
                a = a.strip()
                if a:
                    recent_activities_counter[a] += 1

    top_activities = [a for a, _ in recent_activities_counter.most_common(6)]

    # Parse earliest date
    since_str = ''
    if earliest_date:
        try:
            dt = datetime.strptime(earliest_date, '%Y-%m-%d')
            since_str = dt.strftime('%b %Y')
        except ValueError:
            since_str = earliest_date[:7]

    return {
        'recentMoods': recent_moods,
        'totalEntries': len(moods),
        'since': since_str,
        'recentActivities': top_activities,
    }


# ── Main ─────────────────────────────────────────────────────

def main():
    print('Collecting local data...')
    result = {}

    # Vibe Coding
    print('Vibe Coding:')
    vc = collect_vibe_coding()
    if vc:
        result['vibeCoding'] = vc
        print(f'  merged: {vc["numDays"]} days, ${vc["totalCost"]:,.2f}, {vc["totalTokens"]:,} tokens, {len(vc["models"])} models')
    else:
        print('  skipped')

    # Health
    health = collect_health()
    if health:
        result['health'] = health
        print(f'  Health: steps={health["steps"]}, sleep={health["sleep"]}h, HR={health["restingHR"]}')
    else:
        print('  Health: skipped')

    # Workouts
    workouts = collect_workouts()
    if workouts:
        result['workouts'] = workouts
        print(f'  Workouts: {len(workouts["recentWorkouts"])} types')
    else:
        print('  Workouts: skipped')

    # Mood
    mood = collect_mood()
    if mood:
        result['mood'] = mood
        print(f'  Mood: {mood["totalEntries"]} entries since {mood["since"]}')
    else:
        print('  Mood: skipped')

    result['updatedAt'] = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

    # Write output
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f'Written to {OUT_FILE}')


if __name__ == '__main__':
    main()
