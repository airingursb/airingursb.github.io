import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const notes = (await getCollection('notes', ({ data }) => data.public && !data.draft))
    .sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());

  return rss({
    title: "Airing's Notes",
    description: "思考的痕迹：记录关于前端、数学、设计、哲学和一切让我好奇的事物。",
    site: context.site!,
    stylesheet: '/feed.xsl',
    items: notes.map((note) => ({
      title: note.data.title,
      pubDate: new Date(note.data.date),
      description: note.data.summary || '',
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
    })),
    customData: '<language>zh-cn</language>',
  });
}
