import fs from 'node:fs/promises';
import path from 'node:path';

export function deriveSlug(filename) {
  const base = filename.replace(/\.[^.]+$/, '').toLowerCase();
  return base
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

export function parseSidecar(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const raw = kv[2].trim();
    if (raw.startsWith('[') && raw.endsWith(']')) {
      out[key] = raw
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      out[key] = raw.replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

export async function scanSource(sourceDir) {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const photos = [];
  const seenSlugs = new Set();

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!/\.(jpe?g)$/i.test(ent.name)) continue;

    const filePath = path.join(sourceDir, ent.name);
    const sidecarPath = filePath.replace(/\.[^.]+$/, '.md');
    let sidecar = {};
    try {
      sidecar = parseSidecar(await fs.readFile(sidecarPath, 'utf-8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err; // missing sidecar is fine; other errors aren't
    }

    const slug = sidecar.slug || deriveSlug(ent.name);
    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate slug "${slug}" — set explicit slug: in sidecar for ${ent.name}`);
    }
    seenSlugs.add(slug);

    photos.push({
      filePath,
      slug,
      title: sidecar.title || '',
      description: sidecar.description || '',
      tags: sidecar.tags || [],
    });
  }

  return photos;
}
