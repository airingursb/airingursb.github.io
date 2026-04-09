#!/usr/bin/env python3
"""
Re-sync link previews for moments that have empty link_previews but contain URLs.

Usage:
    BLOG_SUPABASE_SERVICE_KEY=<key> python scripts/resync_link_previews.py
"""

import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from sync_moments import get_link_previews, extract_urls

SUPABASE_URL = 'https://pcoyocvqfipuydhvdsle.supabase.co'
SERVICE_KEY = os.environ.get('BLOG_SUPABASE_SERVICE_KEY', '')


def fetch_moments_with_empty_previews():
    """Fetch moments where link_previews is [] but content contains URLs."""
    url = f'{SUPABASE_URL}/rest/v1/moments?link_previews=eq.%5B%5D&select=id,content'
    req = urllib.request.Request(
        url,
        headers={
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}',
        }
    )
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read().decode())


def update_moment_link_previews(moment_id, previews):
    """Update a moment's link_previews in Supabase."""
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/moments?id=eq.{moment_id}',
        data=json.dumps({'link_previews': previews}).encode(),
        headers={
            'apikey': SERVICE_KEY,
            'Authorization': f'Bearer {SERVICE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        method='PATCH'
    )
    urllib.request.urlopen(req)


def main():
    if not SERVICE_KEY:
        print('Error: BLOG_SUPABASE_SERVICE_KEY environment variable is not set.')
        sys.exit(1)

    print('Fetching moments with empty link_previews...')
    moments = fetch_moments_with_empty_previews()
    print(f'Found {len(moments)} moments with empty link_previews.')

    updated = 0
    skipped = 0
    for i, moment in enumerate(moments, 1):
        moment_id = moment['id']
        content = moment.get('content', '') or ''

        # Skip if content has no URLs
        urls = extract_urls(content)
        if not urls:
            skipped += 1
            continue

        print(f'[{i}/{len(moments)}] Processing moment {moment_id} ({len(urls)} URL(s))...')
        previews = get_link_previews(content)

        if previews:
            update_moment_link_previews(moment_id, previews)
            print(f'  -> Updated with {len(previews)} preview(s): {[p["title"] for p in previews]}')
            updated += 1
        else:
            print(f'  -> No previews fetched, skipping update.')
            skipped += 1

    print(f'\nDone. Updated: {updated}, Skipped: {skipped}.')


if __name__ == '__main__':
    main()
