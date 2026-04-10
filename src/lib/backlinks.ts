import { getCollection } from 'astro:content';

export interface BacklinkEntry {
  title: string;
  slug: string;
}

export async function getBacklinks(lang: 'zh' | 'en' = 'zh'): Promise<Map<string, BacklinkEntry[]>> {
  const collectionName = (lang === 'en' ? 'notesEn' : 'notes') as 'notes' | 'notesEn';
  const notes = await getCollection(collectionName);
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
