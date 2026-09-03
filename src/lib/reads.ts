import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface ReadItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sourceUrl: string;
  cover: string;
  source: string;
  author: string;
  publishedAt: string;
  tags: string[];
}

export interface ReadMonthGroup {
  key: string;
  label: string;
  items: ReadItem[];
}

export function loadReads(): ReadItem[] {
  const file = resolve('./src/data/reads.json');
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function monthKey(publishedAt: string): string {
  if (!publishedAt) return 'undated';
  const d = new Date(publishedAt);
  if (Number.isNaN(d.valueOf())) return 'undated';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  if (key === 'undated') return '未标注日期';
  const [year, month] = key.split('-');
  return `${year}年${Number(month)}月`;
}

export function groupReadsByMonth(items: ReadItem[]): ReadMonthGroup[] {
  const groups = new Map<string, ReadItem[]>();
  for (const item of items) {
    const key = monthKey(item.publishedAt);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, groupItems]) => ({
      key,
      label: monthLabel(key),
      items: groupItems.slice().sort((a, b) =>
        String(b.publishedAt).localeCompare(String(a.publishedAt)),
      ),
    }));
}

export const RSS_TRACK_BASE = 'https://chat.ursb.me/api/rss-track';

export function enclosureType(url: string): string {
  const path = String(url || '').split('?')[0].toLowerCase();
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.avif')) return 'image/avif';
  return 'image/png';
}

export function sourceCounts(items: ReadItem[]): Array<[string, number]> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const source = item.source || '其他';
    counts[source] = (counts[source] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}
