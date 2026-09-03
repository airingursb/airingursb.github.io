// scripts/lib/reads-snapshot.mjs
// Normalize the public R2 snapshot (https://r2.airingdeng.com/reads.json).
// Publish gate lives in 采集 — this repo only copies public fields.

export const READS_SNAPSHOT_URL = 'https://r2.airingdeng.com/reads.json';

const PUBLIC_FIELDS = [
  'id',
  'slug',
  'title',
  'summary',
  'sourceUrl',
  'cover',
  'source',
  'author',
  'publishedAt',
  'tags',
];

export function slugifyTitle(title, id = '') {
  const base = String(title || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const compactId = String(id || '').replace(/-/g, '');
  return base || compactId || 'read';
}

function asString(value) {
  return value == null ? '' : String(value);
}

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const id = asString(raw.id).trim();
  const title = asString(raw.title).trim();
  const slug = asString(raw.slug).trim() || slugifyTitle(title, id);
  if (!id && !slug) return null;
  return {
    id,
    slug,
    title,
    summary: asString(raw.summary),
    sourceUrl: asString(raw.sourceUrl),
    cover: asString(raw.cover),
    source: asString(raw.source),
    author: asString(raw.author),
    publishedAt: asString(raw.publishedAt),
    tags: Array.isArray(raw.tags) ? raw.tags.map(asString).filter(Boolean) : [],
  };
}

/** Invalid / empty payloads become []. Extra keys (body, 原文, …) are dropped. */
export function normalizeReadsSnapshot(raw) {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : null;
  if (!list || list.length === 0) return [];
  return list.map(normalizeItem).filter(Boolean);
}

export function enclosureType(url) {
  const path = String(url || '').split('?')[0].toLowerCase();
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.avif')) return 'image/avif';
  return 'image/png';
}

export const RSS_TRACK_BASE = 'https://chat.ursb.me/api/rss-track';

export { PUBLIC_FIELDS };
