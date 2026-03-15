#!/usr/bin/env python3
"""Collect local-only data (health, mood, vibe coding) and write to data/local_data.json.

Run on the local Mac via cron. The JSON is committed to the repo so that
update_feed.py (which runs in CI) can inject it into index.html.
"""

import json
import csv
import os
import subprocess
import glob
from datetime import datetime, timedelta
from pathlib import Path
from collections import Counter

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = REPO_ROOT / 'data' / 'local_data.json'

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

def collect_vibe_coding():
    """Run ccusage to get daily usage data."""
    # Get data for the last 90 days
    since = (datetime.now() - timedelta(days=90)).strftime('%Y%m%d')
    try:
        result = subprocess.run(
            ['ccusage', 'daily', '--json', '--breakdown', '--since', since],
            capture_output=True, text=True, timeout=60
        )
        if result.returncode != 0:
            print(f'ccusage error: {result.stderr}')
            return None
        data = json.loads(result.stdout)
    except Exception as e:
        print(f'ccusage failed: {e}')
        return None

    days = data.get('daily', [])
    if not days:
        return None

    total_tokens = sum(d['totalTokens'] for d in days)
    total_cost = sum(d['totalCost'] for d in days)

    # Collect all models used
    model_set = set()
    for d in days:
        for m in d.get('modelsUsed', []):
            model_set.add(m)

    # Build daily map: date → {cost, tokens, models}
    daily_map = {}
    for d in days:
        date = d['date']
        models = d.get('modelsUsed', [])
        # Pick the dominant model for display
        top_model = models[0] if models else ''
        daily_map[date] = {
            'cost': round(d['totalCost'], 2),
            'tokens': d['totalTokens'],
            'models': models,
        }

    # Friendly model names
    model_name_map = {
        'claude-opus-4-6': 'Opus 4.6',
        'claude-opus-4-5-20251101': 'Opus 4.5',
        'claude-sonnet-4-6': 'Sonnet 4.6',
        'claude-sonnet-4-5-20241022': 'Sonnet 3.5',
        'claude-haiku-4-5-20251001': 'Haiku 4.5',
        'claude-haiku-4-5': 'Haiku 4.5',
    }
    model_colors = {
        'Opus 4.6': '#4ade80',
        'Opus 4.5': '#a78bfa',
        'Sonnet 4.6': '#f472b6',
        'Sonnet 3.5': '#fb923c',
        'Haiku 4.5': '#38bdf8',
    }

    # Deduplicate models by friendly name
    seen_models = set()
    models_display = []
    for raw in sorted(model_set):
        friendly = model_name_map.get(raw, raw)
        if friendly not in seen_models:
            seen_models.add(friendly)
            color = model_colors.get(friendly, '#7d8590')
            models_display.append({'name': friendly, 'color': color})

    # Calculate actual weeks spanned
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
        'numDays': len(days),
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
    vc = collect_vibe_coding()
    if vc:
        result['vibeCoding'] = vc
        print(f'  Vibe Coding: {vc["numDays"]} days, ${vc["totalCost"]}, {len(vc["models"])} models')
    else:
        print('  Vibe Coding: skipped')

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
