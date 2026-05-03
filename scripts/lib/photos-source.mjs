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
  const metaDir = path.join(sourceDir, 'meta');

  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (!/\.(jpe?g|png|heic|heif|dng|raf|cr2|cr3|nef|arw|orf|rw2|pef|3fr|fff|iiq)$/i.test(ent.name)) continue;

    const filePath = path.join(sourceDir, ent.name);
    const sidecarBase = ent.name.replace(/\.[^.]+$/, '') + '.md';
    const sidecarPath = path.join(metaDir, sidecarBase);
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
      albums: parseAlbums(sidecar),
      placeOverride: parsePlaceOverride(sidecar),
    });
  }

  return photos;
}

// Sidecar can specify album membership as a single string or array:
//   album: 2024 New Zealand
//   albums: [2024 New Zealand, Travel]
// Returns a deduped, trimmed array (empty if neither is set).
function parseAlbums(sidecar) {
  const raw = sidecar.albums ?? sidecar.album;
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const name = String(item).trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

// Sidecar place can be written as either:
//   place: Shanghai, China        # combined
//   city: Shanghai                # explicit
//   country: China
// Returns null if neither is set; sidecar always wins over auto-geocode.
function parsePlaceOverride(sidecar) {
  if (sidecar.place) {
    const [city, ...rest] = sidecar.place.split(',').map((s) => s.trim());
    return city ? { city, country: rest.join(', ') || null } : null;
  }
  if (sidecar.city || sidecar.country) {
    return { city: sidecar.city || null, country: sidecar.country || null };
  }
  return null;
}
