// scripts/lib/reads-snapshot.mjs
// Pure snapshot helpers for /reads/ — Notion 信息采集箱 → src/data/reads.json
// Never include inbox body or the 「## 原文」 section.

export const DROP_TAG = '待读';

/**
 * @param {string} title
 * @param {string} id
 */
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

/**
 * Reuse previous slugs by Notion page id so feed permalinks stay stable.
 * @param {Array<{ id: string, title: string, slug?: string }>} items
 * @param {Map<string, { slug: string }>} previousById
 */
export function assignSlugs(items, previousById = new Map()) {
  const used = new Set();
  return items.map((item) => {
    const prev = previousById.get(item.id);
    if (prev?.slug && !used.has(prev.slug)) {
      used.add(prev.slug);
      return { ...item, slug: prev.slug };
    }
    let slug = slugifyTitle(item.title, item.id);
    if (used.has(slug)) {
      const suffix = String(item.id || '').replace(/-/g, '').slice(-8);
      slug = `${slugifyTitle(item.title, item.id)}-${suffix || 'dup'}`;
    }
    used.add(slug);
    return { ...item, slug };
  });
}

export function isCheckboxYes(value) {
  return value === true || value === '__YES__';
}

/** Publish gate: 公开 is true AND 外发摘要 is non-empty. */
export function isPublishable({ published, summary }) {
  return isCheckboxYes(published) && String(summary || '').trim().length > 0;
}

export function dropInboxTags(tags) {
  return (Array.isArray(tags) ? tags : []).filter((t) => t && t !== DROP_TAG);
}

function richText(prop) {
  if (!prop) return '';
  const arr = prop.title || prop.rich_text || [];
  return arr.map((t) => t.plain_text || '').join('').trim();
}

export function coverUrl(page) {
  const cover = page?.cover;
  if (!cover) return '';
  if (cover.type === 'external') return cover.external?.url || '';
  if (cover.type === 'file') return cover.file?.url || '';
  return '';
}

/**
 * Map a Notion page object to a public snapshot item.
 * Does not read page body / children / 「## 原文」.
 */
export function pageToRead(page) {
  const p = page?.properties || {};
  return {
    id: page.id,
    title: richText(p['名称']),
    summary: richText(p['外发摘要']),
    sourceUrl: p['原始链接']?.url || '',
    cover: coverUrl(page),
    source: p['来源']?.select?.name || '',
    author: richText(p['作者/来源']),
    publishedAt: p['收藏时间']?.date?.start || '',
    tags: dropInboxTags((p['标签']?.multi_select || []).map((t) => t.name)),
  };
}

export function pagePassesPublishGate(page) {
  const p = page?.properties || {};
  return isPublishable({
    published: p['公开']?.checkbox,
    summary: richText(p['外发摘要']),
  });
}

/**
 * @param {object[]} pages Notion page objects
 * @param {Array<{ id: string, slug: string }>} previous
 */
export function snapshotFromPages(pages, previous = []) {
  const previousById = new Map((previous || []).map((item) => [item.id, item]));
  const items = (pages || [])
    .filter(pagePassesPublishGate)
    .map(pageToRead)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  return assignSlugs(items, previousById);
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
