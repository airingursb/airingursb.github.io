#!/usr/bin/env python3
"""Fetch Douban reading and movie data for a user and save as JSON.

Scrapes book/movie pages from douban.com and extracts totals + recent items.
Uses fallback data when pages return 403.
"""

import json
import os
import re
import time
import urllib.request
from datetime import datetime
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    print('bs4 not installed, run: pip install beautifulsoup4')
    raise

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_FILE = REPO_ROOT / 'data' / 'douban.json'

DOUBAN_USER = '82387673'
MAX_ITEMS = 6
REQUEST_DELAY = 2  # seconds between requests

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

# Fallback data for when Douban blocks scraping (403)
FALLBACK_DATA = {
    'books': {
        'read': {
            'total': 84,
            'items': [
                {'title': '\u7edd\u53eb', 'rating': 4, 'date': '2025-12-28'},
                {'title': '\u9e92\u9e9f\u4e4b\u7ffc', 'rating': 3, 'date': '2025-10-04'},
                {'title': '\u4f59\u534e\u6587\u5b66\u8bfe', 'rating': 5, 'date': '2025-07-06'},
                {'title': '\u5c11\u5e74\u5df4\u6bd4\u4f26', 'rating': 4, 'date': '2025-03-09'},
                {'title': '\u6211\u53ef\u80fd\u9519\u4e86', 'rating': 5, 'date': '2025-02-12'},
                {'title': '\u4e66\u5199\u81ea\u6108\u529b', 'rating': 4, 'date': '2025-02-01'},
            ],
        },
        'reading': {
            'total': 4,
            'items': [
                {'title': '\u54e5\u5fb7\u5c14\u3001\u827e\u820d\u5c14\u3001\u5df4\u8d6b', 'rating': 5, 'date': ''},
                {'title': '\u300a\u8d44\u672c\u8bba\u300b\u7684\u8bfb\u6cd5', 'rating': 5, 'date': ''},
                {'title': '\u7ecf\u6d4e\u5b66', 'rating': 5, 'date': ''},
                {'title': '\u6545\u4e8b', 'rating': 0, 'date': ''},
            ],
        },
        'wish': {'total': 15},
    },
    'movies': {
        'watched': {
            'total': 467,
            'items': [
                {'title': '\u98de\u9a70\u4eba\u751f3', 'rating': 3, 'date': '2026-02-19'},
                {'title': '\u540d\u4fa6\u63a2\u67ef\u5357\uff1a\u72ec\u773c\u7684\u6b8b\u50cf', 'rating': 2, 'date': '2026-02-08'},
                {'title': '\u4e0d\u7720\u65e5', 'rating': 3, 'date': '2026-01-25'},
                {'title': '\u90fd\u662f\u5979\u7684\u9519', 'rating': 5, 'date': '2026-01-04'},
                {'title': '\u5de8\u6d2a', 'rating': 1, 'date': '2025-12-20'},
                {'title': '\u7591\u72c2\u52a8\u7269\u57ce2', 'rating': 5, 'date': '2025-11-29'},
            ],
        },
        'watching': {
            'total': 14,
            'items': [
                {'title': '\u6211\u72ec\u81ea\u5347\u7ea7', 'rating': 4, 'date': '2024-02-24'},
            ],
        },
        'wish': {'total': 134},
    },
}


# -- Helpers ----------------------------------------------------------------

def fetch_page(url, retries=3):
    """Fetch a URL with retries. Returns HTML string or None on failure."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            resp = urllib.request.urlopen(req, timeout=30)
            return resp.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            print(f'  HTTP {e.code} for {url} (attempt {attempt + 1}/{retries})')
            if e.code == 403 and attempt < retries - 1:
                time.sleep(REQUEST_DELAY * (attempt + 1))
                continue
            return None
        except Exception as e:
            print(f'  Error fetching {url}: {e} (attempt {attempt + 1}/{retries})')
            if attempt < retries - 1:
                time.sleep(REQUEST_DELAY)
                continue
            return None
    return None


def parse_total(soup):
    """Extract total count from a Douban list page."""
    # Look for text like "（共84本）" or "（共467部）"
    h1 = soup.find('h1')
    if h1:
        m = re.search(r'(\d+)', h1.get_text())
        if m:
            return int(m.group(1))
    # Alternative: look in the page title or filter links
    title = soup.find('title')
    if title:
        m = re.search(r'(\d+)', title.get_text())
        if m:
            return int(m.group(1))
    return 0


def parse_rating_class(class_list):
    """Convert Douban rating class like 'rating4-t' to integer 4."""
    if not class_list:
        return 0
    for cls in class_list:
        m = re.match(r'rating(\d+)-t', cls)
        if m:
            return int(m.group(1))
    return 0


def parse_book_items(soup, max_items=MAX_ITEMS):
    """Extract book items from a Douban book list page."""
    items = []
    item_els = soup.select('li.subject-item')
    for el in item_els[:max_items]:
        title_el = el.select_one('h2 a')
        title = title_el.get_text(strip=True) if title_el else ''

        # Rating
        rating_el = el.select_one('span[class*="rating"]')
        rating = 0
        if rating_el:
            rating = parse_rating_class(rating_el.get('class', []))

        # Date
        date_el = el.select_one('span.date')
        date_str = ''
        if date_el:
            text = date_el.get_text(strip=True)
            m = re.search(r'(\d{4}-\d{2}-\d{2})', text)
            if m:
                date_str = m.group(1)

        if title:
            # Clean subtitle after colon in books (e.g. "经济学: 第18版" → keep as-is)
            items.append({'title': title, 'rating': rating, 'date': date_str})

    return items


def clean_movie_title(title):
    """Keep only the primary Chinese title, strip alternates after ' / '."""
    # Douban movie titles often have "中文名 / English Name / ..."
    parts = re.split(r'\s*/\s*', title)
    return parts[0].strip() if parts else title


def parse_movie_items(soup, max_items=MAX_ITEMS):
    """Extract movie items from a Douban movie list page."""
    items = []
    item_els = soup.select('div.item')
    for el in item_els[:max_items]:
        title_el = el.select_one('li.title a')
        if not title_el:
            title_el = el.select_one('em')
        title = title_el.get_text(strip=True) if title_el else ''

        # Rating
        rating_el = el.select_one('span[class*="rating"]')
        rating = 0
        if rating_el:
            rating = parse_rating_class(rating_el.get('class', []))

        # Date
        date_el = el.select_one('span.date')
        date_str = ''
        if date_el:
            text = date_el.get_text(strip=True)
            m = re.search(r'(\d{4}-\d{2}-\d{2})', text)
            if m:
                date_str = m.group(1)

        if title:
            title = clean_movie_title(title)
            items.append({'title': title, 'rating': rating, 'date': date_str})

    return items


# -- Scraping ---------------------------------------------------------------

def scrape_section(url, parser_fn, label):
    """Scrape a single Douban page. Returns (total, items) or None on failure."""
    print(f'  Fetching {label}: {url}')
    html = fetch_page(url)
    if not html:
        print(f'  {label}: failed to fetch, will use fallback')
        return None

    soup = BeautifulSoup(html, 'html.parser')
    total = parse_total(soup)
    items = parser_fn(soup)
    print(f'  {label}: total={total}, items={len(items)}')
    return total, items


def fetch_douban_data():
    """Scrape all Douban pages and return structured data."""
    base_book = f'https://book.douban.com/people/{DOUBAN_USER}'
    base_movie = f'https://movie.douban.com/people/{DOUBAN_USER}'

    result = {
        'books': {
            'read': None,
            'reading': None,
            'wish': None,
        },
        'movies': {
            'watched': None,
            'watching': None,
            'wish': None,
        },
    }

    # Books
    pages = [
        ('books', 'read', f'{base_book}/collect', parse_book_items, 'Books/read'),
        ('books', 'reading', f'{base_book}/do', parse_book_items, 'Books/reading'),
        ('books', 'wish', f'{base_book}/wish', None, 'Books/wish'),
        ('movies', 'watched', f'{base_movie}/collect', parse_movie_items, 'Movies/watched'),
        ('movies', 'watching', f'{base_movie}/do', parse_movie_items, 'Movies/watching'),
        ('movies', 'wish', f'{base_movie}/wish', None, 'Movies/wish'),
    ]

    for category, key, url, parser_fn, label in pages:
        if parser_fn:
            scraped = scrape_section(url, parser_fn, label)
            if scraped:
                total, items = scraped
                result[category][key] = {'total': total, 'items': items}
        else:
            # Wish pages: only need total
            print(f'  Fetching {label}: {url}')
            html = fetch_page(url)
            if html:
                soup = BeautifulSoup(html, 'html.parser')
                total = parse_total(soup)
                result[category][key] = {'total': total}
                print(f'  {label}: total={total}')
            else:
                print(f'  {label}: failed to fetch, will use fallback')

        time.sleep(REQUEST_DELAY)

    # Fill in fallback data for any failed sections
    for category in ('books', 'movies'):
        for key in result[category]:
            if result[category][key] is None:
                fallback = FALLBACK_DATA.get(category, {}).get(key)
                if fallback:
                    result[category][key] = fallback
                    print(f'  Using fallback for {category}/{key}')

    result['updated_at'] = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    return result


# -- Main -------------------------------------------------------------------

def main():
    print('Fetching Douban data...')
    data = fetch_douban_data()

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'Written to {OUT_FILE}')


if __name__ == '__main__':
    main()
