import fs from 'node:fs/promises';

export async function readManifest(filePath) {
  try {
    const txt = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(txt);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

export async function writeManifest(filePath, records) {
  await fs.writeFile(filePath, JSON.stringify(records, null, 2) + '\n');
}

export function sortByTakenAt(records) {
  return [...records].sort((a, b) => {
    if (!a.takenAt && !b.takenAt) return 0;
    if (!a.takenAt) return 1;
    if (!b.takenAt) return -1;
    return b.takenAt.localeCompare(a.takenAt);
  });
}

export function mergeRecords(existing, incoming, liveSlugs) {
  const incomingBySlug = new Map(incoming.map((r) => [r.slug, r]));
  const merged = [];
  for (const r of existing) {
    if (!liveSlugs.has(r.slug)) continue;
    const next = incomingBySlug.get(r.slug) || r;
    const firstSyncedAt = r.firstSyncedAt || r.syncedAt || next.syncedAt;
    merged.push(firstSyncedAt ? { ...next, firstSyncedAt } : next);
    incomingBySlug.delete(r.slug);
  }
  for (const r of incomingBySlug.values()) {
    const firstSyncedAt = r.firstSyncedAt || r.syncedAt;
    merged.push(firstSyncedAt ? { ...r, firstSyncedAt } : r);
  }
  return merged;
}
