#!/usr/bin/env python3
"""Import blog posts from Typlog RSS feed into Astro content collection."""

import urllib.request
import xml.etree.ElementTree as ET
import re
import os
from datetime import datetime

FEED_URL = 'https://blog.ursb.me/feed.xml'
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'posts')

TAG_MAP = {
    'weekly': 'weekly',
    'annually': 'annually',
    'eassys': 'essays',
    'tech': 'tech',
}


def fetch_url(url):
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (compatible; ImportBot/1.0)'
    })
    return urllib.request.urlopen(req, timeout=60).read().decode('utf-8')


def extract_slug(link):
    """Extract slug from URL like https://blog.ursb.me/posts/weekly-33/"""
    m = re.search(r'/posts/([^/]+)/?$', link)
    return m.group(1) if m else None


def html_to_markdown(html):
    """Basic HTML to Markdown conversion. For complex posts, manual review needed."""
    text = html
    # Headers
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1', text, flags=re.DOTALL)
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'## \1', text, flags=re.DOTALL)
    text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'### \1', text, flags=re.DOTALL)
    # Bold, italic
    text = re.sub(r'<strong>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL)
    text = re.sub(r'<em>(.*?)</em>', r'*\1*', text, flags=re.DOTALL)
    # Links
    text = re.sub(r'<a[^>]+href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text, flags=re.DOTALL)
    # Images
    text = re.sub(r'<img[^>]+src="([^"]*)"[^>]*/?\s*>', r'![](\1)', text, flags=re.DOTALL)
    # Code blocks
    text = re.sub(r'<pre><code[^>]*class="language-(\w+)"[^>]*>(.*?)</code></pre>',
                  lambda m: f'```{m.group(1)}\n{m.group(2)}\n```', text, flags=re.DOTALL)
    text = re.sub(r'<pre><code>(.*?)</code></pre>', lambda m: f'```\n{m.group(1)}\n```', text, flags=re.DOTALL)
    # Inline code
    text = re.sub(r'<code>(.*?)</code>', r'`\1`', text, flags=re.DOTALL)
    # Blockquotes
    text = re.sub(r'<blockquote>(.*?)</blockquote>',
                  lambda m: '\n'.join('> ' + l for l in m.group(1).strip().split('\n')), text, flags=re.DOTALL)
    # Lists
    text = re.sub(r'<li>(.*?)</li>', r'- \1', text, flags=re.DOTALL)
    # Paragraphs / line breaks
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<p>(.*?)</p>', r'\1\n\n', text, flags=re.DOTALL)
    # Strip remaining tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'")
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    xml_str = fetch_url(FEED_URL)
    root = ET.fromstring(xml_str)

    ns = {'atom': 'http://www.w3.org/2005/Atom',
          'content': 'http://purl.org/rss/1.0/modules/content/',
          'dc': 'http://purl.org/dc/elements/1.1/'}

    # Try RSS items first, then Atom entries
    items = root.findall('.//item')
    is_atom = False
    if not items:
        items = root.findall('.//atom:entry', ns) or root.findall('.//{http://www.w3.org/2005/Atom}entry')
        is_atom = True

    count = 0
    for item in items:
        def find_first(parent, *paths):
            """Find first matching element, using 'is not None' to avoid ElementTree bool trap."""
            for p in paths:
                el = parent.find(p, ns) if ':' in p or '{' in p else parent.find(p)
                if el is not None:
                    return el
            return None

        if is_atom:
            title_el = find_first(item, 'atom:title', '{http://www.w3.org/2005/Atom}title')
            link_el = find_first(item, 'atom:link', '{http://www.w3.org/2005/Atom}link')
            date_el = find_first(item, 'atom:published', '{http://www.w3.org/2005/Atom}published',
                                 'atom:updated', '{http://www.w3.org/2005/Atom}updated')
            content_el = find_first(item, 'atom:content', '{http://www.w3.org/2005/Atom}content', 'content:encoded')
            category_els = item.findall('atom:category', ns) or item.findall('{http://www.w3.org/2005/Atom}category')
        else:
            title_el = item.find('title')
            link_el = item.find('link')
            date_el = find_first(item, 'pubDate', 'atom:published')
            content_el = item.find('content:encoded', ns)
            category_els = item.findall('category')

        if title_el is None or link_el is None:
            continue

        title = title_el.text.strip() if title_el is not None and title_el.text else ''
        # Atom uses href attribute, RSS uses text content
        if is_atom:
            link = link_el.get('href', '') if link_el is not None else ''
        else:
            link = link_el.text.strip() if link_el is not None and link_el.text else ''
        slug = extract_slug(link)
        if not slug:
            continue

        date_raw = date_el.text.strip() if date_el is not None and date_el.text else ''
        try:
            for fmt in ['%a, %d %b %Y %H:%M:%S %z', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%dT%H:%M:%SZ']:
                try:
                    dt = datetime.strptime(date_raw.replace('+08:00', '+0800'), fmt)
                    break
                except ValueError:
                    continue
            else:
                dt = datetime.now()
        except:
            dt = datetime.now()

        # Atom categories use 'term' attribute, RSS uses text content
        if is_atom:
            tags = [c.get('term', '').strip() for c in category_els if c.get('term')]
        else:
            tags = [c.text.strip() for c in category_els if c.text]
        tags = [TAG_MAP.get(t, t) for t in tags]

        # Auto-tag based on slug patterns if no categories in feed
        if not tags:
            if slug.startswith('weekly-'):
                tags = ['weekly']
            elif slug.startswith('summary-'):
                tags = ['annually']
            else:
                tags = ['tech']

        content_html = content_el.text if content_el is not None and content_el.text else ''
        content_md = html_to_markdown(content_html) if content_html else ''

        # Build frontmatter
        tags_str = ', '.join(f'"{t}"' for t in tags)
        frontmatter = f'''---
title: "{title.replace('"', '\\\\"')}"
date: {dt.strftime('%Y-%m-%d')}
tags: [{tags_str}]
description: ""
---'''

        filepath = os.path.join(OUTPUT_DIR, f'{slug}.md')
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(frontmatter + '\n\n' + content_md + '\n')

        count += 1
        print(f'  ✓ {slug} ({dt.strftime("%Y-%m-%d")})')

    print(f'\nImported {count} posts to {OUTPUT_DIR}')


if __name__ == '__main__':
    main()
