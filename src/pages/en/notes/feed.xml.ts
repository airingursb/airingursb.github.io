import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { tSite } from '../../../lib/i18n';

export async function GET(context: APIContext) {
  const s = tSite('en').notes;
  const notes = (await getCollection('notesEn', ({ data }) => data.public && !data.draft))
    .sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());

  return rss({
    title: s.feedTitle,
    description: s.feedDesc,
    site: context.site!,
    stylesheet: '/feed.xsl',
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: new Date(note.data.date),
      description: note.data.summary || '',
      link: `/en/notes/${note.id}/`,
      categories: note.data.tags,
    })),
    customData: `<language>${s.feedLang}</language>`,
  });
}
