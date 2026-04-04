import { getCollection } from 'astro:content';

export interface BacklinkEntry {
  title: string;
  slug: string;
}

export async function getBacklinks(): Promise<Map<string, BacklinkEntry[]>> {
  const notes = await getCollection('notes');
  const backlinkMap = new Map<string, BacklinkEntry[]>();

  const publicNotes = notes.filter(n => n.data.public && !n.data.draft);

  for (const note of publicNotes) {
    const { body } = note;
    if (!body) continue;

    const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
    let match;

    while ((match = regex.exec(body)) !== null) {
      const target = match[1].toLowerCase();
      if (!backlinkMap.has(target)) {
        backlinkMap.set(target, []);
      }
      backlinkMap.get(target)!.push({
        title: note.data.title,
        slug: note.id,
      });
    }
  }

  return backlinkMap;
}
