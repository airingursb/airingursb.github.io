#!/usr/bin/env python3
"""Standalone per-machine collector for Claude / Codex / Gemini token usage.

Emits a single JSON object to stdout of the form:

    {
      "claude": { "2026-04-11": {"cost": 123.45, "tokens": 1000, "models": [...]} , ... },
      "codex":  { ...daily_map... },
      "gemini": { ...daily_map... }
    }

Two invocation modes:

1. Imported by scripts/collect_local_data.py (local machine)
       from _vibe_collect import collect_all
       data = collect_all(datetime.now() - timedelta(days=90))

2. Streamed to a remote machine via paramiko / ssh
       cat scripts/_vibe_collect.py | ssh HOST python3 - --since 20260111
   so the exact same logic runs on the remote Mac against *its* own
   ~/.codex/sessions, ~/.gemini/tmp, and ccusage install. The stdout JSON
   is then merged into the local run's result.

The claude data is gathered by shelling out to `ccusage` through an
interactive zsh (`zsh -ic`) so that nvm-managed paths resolve in both
local and remote contexts.
"""

import argparse
import glob
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta

# ── Pricing tables ─────────────────────────────────────────
# USD per 1M tokens. Claude costs come from ccusage directly (real API $).
# Codex + Gemini are subscription-billed, so we synthesize a cost from
# published list prices so the headline number is comparable to Claude.
# Unknown models fall back to the *_DEFAULT_PRICE entry below.

CODEX_PRICING = {
    'gpt-5':         {'input': 1.25, 'cached_input': 0.125, 'output': 10.00},
    'gpt-5.4':       {'input': 1.25, 'cached_input': 0.125, 'output': 10.00},
    'gpt-5-codex':   {'input': 1.25, 'cached_input': 0.125, 'output': 10.00},
    'gpt-5.3-codex': {'input': 1.25, 'cached_input': 0.125, 'output': 10.00},
}
CODEX_DEFAULT_PRICE = {'input': 1.25, 'cached_input': 0.125, 'output': 10.00}

GEMINI_PRICING = {
    'gemini-3-pro-preview':    {'input': 1.25, 'cached_input': 0.31,  'output': 10.00},
    'gemini-3.1-pro-preview':  {'input': 1.25, 'cached_input': 0.31,  'output': 10.00},
    'gemini-3-flash-preview':  {'input': 0.30, 'cached_input': 0.075, 'output':  2.50},
    'gemini-2.5-pro':          {'input': 1.25, 'cached_input': 0.31,  'output': 10.00},
    'gemini-2.5-flash':        {'input': 0.30, 'cached_input': 0.075, 'output':  2.50},
}
GEMINI_DEFAULT_PRICE = {'input': 1.25, 'cached_input': 0.31, 'output': 10.00}


# ── Helpers ────────────────────────────────────────────────

def _add_day(dst_map, date, cost, tokens, models):
    entry = dst_map.setdefault(date, {'cost': 0.0, 'tokens': 0, 'models': []})
    entry['cost'] += cost
    entry['tokens'] += tokens
    for m in models or []:
        if m and m not in entry['models']:
            entry['models'].append(m)


def _round_costs(daily_map):
    for e in daily_map.values():
        e['cost'] = round(e['cost'], 2)
    return daily_map


# ── Claude (ccusage) ───────────────────────────────────────

def collect_claude(since_str):
    """Run `ccusage daily --json` through an interactive zsh.

    Returns {date: {cost, tokens, models}}. Empty dict on any failure.
    """
    # zsh -ic gives us the user's interactive PATH (nvm, etc.) so ccusage
    # resolves correctly on both local + remote macs.
    cmd = ['zsh', '-ic', 'ccusage daily --json --breakdown --since ' + since_str]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=90)
    except FileNotFoundError:
        print('  [claude] zsh not found', file=sys.stderr)
        return {}
    except Exception as e:
        print('  [claude] ccusage failed: ' + str(e), file=sys.stderr)
        return {}
    if result.returncode != 0:
        print('  [claude] ccusage rc=' + str(result.returncode) + ': ' + result.stderr.strip()[:200], file=sys.stderr)
        return {}
    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        print('  [claude] ccusage non-JSON output: ' + result.stdout[:200], file=sys.stderr)
        return {}

    out = {}
    for d in data.get('daily', []) or []:
        _add_day(
            out,
            d['date'],
            float(d.get('totalCost', 0) or 0),
            int(d.get('totalTokens', 0) or 0),
            d.get('modelsUsed', []) or [],
        )
    return _round_costs(out)


# ── Codex (rollout jsonl) ──────────────────────────────────

CODEX_SESSIONS_DIR = os.path.expanduser('~/.codex/sessions')


def _codex_session_cost(usage, model):
    price = CODEX_PRICING.get(model, CODEX_DEFAULT_PRICE)
    input_tokens = usage.get('input_tokens', 0) or 0
    cached = usage.get('cached_input_tokens', 0) or 0
    output_tokens = usage.get('output_tokens', 0) or 0
    # cached_input_tokens is a subset of input_tokens in OpenAI's schema.
    non_cached = max(0, input_tokens - cached)
    return (
        non_cached * price['input']
        + cached * price['cached_input']
        + output_tokens * price['output']
    ) / 1_000_000


def collect_codex(since_dt):
    """Walk ~/.codex/sessions/**/rollout-*.jsonl.

    For each rollout (= one session) we take the LAST `event_msg` of type
    `token_count` whose `info.total_token_usage` is populated — that's the
    cumulative usage for the session. Sessions with no usage events (e.g. a
    TUI that never sent a request) are skipped.
    """
    if not os.path.isdir(CODEX_SESSIONS_DIR):
        return {}
    out = {}
    pattern = os.path.join(CODEX_SESSIONS_DIR, '**', 'rollout-*.jsonl')
    for fp in glob.glob(pattern, recursive=True):
        parts = fp.split(os.sep)
        try:
            i = parts.index('sessions')
            date = parts[i + 1] + '-' + parts[i + 2] + '-' + parts[i + 3]
            if datetime.strptime(date, '%Y-%m-%d') < since_dt:
                continue
        except (ValueError, IndexError):
            continue

        last_usage = None
        session_model = None
        try:
            with open(fp) as f:
                for line in f:
                    try:
                        ev = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    p = ev.get('payload') or {}
                    if ev.get('type') == 'turn_context':
                        m = p.get('model')
                        if m:
                            session_model = m
                    elif ev.get('type') == 'event_msg' and p.get('type') == 'token_count':
                        info = p.get('info') or {}
                        usage = info.get('total_token_usage')
                        if usage:
                            last_usage = usage
        except OSError:
            continue

        if not last_usage:
            continue
        session_model = session_model or 'gpt-5'
        cost = _codex_session_cost(last_usage, session_model)
        total_tokens = int(last_usage.get('total_tokens', 0) or 0)
        _add_day(out, date, cost, total_tokens, [session_model])
    return _round_costs(out)


# ── Gemini (chats json) ────────────────────────────────────

GEMINI_TMP_DIR = os.path.expanduser('~/.gemini/tmp')
_GEMINI_DATE_RE = re.compile(r'session-(\d{4}-\d{2}-\d{2})T')


def collect_gemini(since_dt):
    """Walk ~/.gemini/tmp/*/chats/session-*.json.

    Sums per-message `tokens.{input,output,cached,thoughts,total}` across all
    messages in a session. Dates come from the session filename. Cost is
    synthesized from GEMINI_PRICING. The placeholder model id 'auto' is
    canonicalized to 'gemini-3-pro-preview'.
    """
    if not os.path.isdir(GEMINI_TMP_DIR):
        return {}
    out = {}
    pattern = os.path.join(GEMINI_TMP_DIR, '*', 'chats', 'session-*.json')
    for fp in glob.glob(pattern):
        m = _GEMINI_DATE_RE.search(os.path.basename(fp))
        if not m:
            continue
        date = m.group(1)
        try:
            if datetime.strptime(date, '%Y-%m-%d') < since_dt:
                continue
        except ValueError:
            continue
        try:
            with open(fp) as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            continue

        sums = {'input': 0, 'output': 0, 'cached': 0, 'thoughts': 0, 'total': 0}
        models = []
        for msg in data.get('messages', []):
            tk = msg.get('tokens') or {}
            if isinstance(tk, dict):
                for k in sums:
                    sums[k] += tk.get(k, 0) or 0
            mdl = msg.get('model')
            if mdl == 'auto':
                mdl = 'gemini-3-pro-preview'
            if mdl and mdl not in models:
                models.append(mdl)

        if sums['total'] <= 0:
            continue

        dominant = models[0] if models else 'gemini-3-pro-preview'
        price = GEMINI_PRICING.get(dominant, GEMINI_DEFAULT_PRICE)
        non_cached = max(0, sums['input'] - sums['cached'])
        # Gemini 'thoughts' tokens bill at the output rate.
        cost = (
            non_cached * price['input']
            + sums['cached'] * price['cached_input']
            + (sums['output'] + sums['thoughts']) * price['output']
        ) / 1_000_000
        _add_day(out, date, cost, sums['total'], models or [dominant])
    return _round_costs(out)


# ── Entry points ───────────────────────────────────────────

def collect_all(since_dt):
    since_str = since_dt.strftime('%Y%m%d')
    return {
        'claude': collect_claude(since_str),
        'codex': collect_codex(since_dt),
        'gemini': collect_gemini(since_dt),
    }


def main():
    ap = argparse.ArgumentParser(description='Collect vibe-coding token usage for one machine.')
    ap.add_argument('--since', required=True, help='YYYYMMDD lower bound')
    args = ap.parse_args()
    since_dt = datetime.strptime(args.since, '%Y%m%d')
    result = collect_all(since_dt)
    json.dump(result, sys.stdout)
    sys.stdout.write('\n')


if __name__ == '__main__':
    main()
