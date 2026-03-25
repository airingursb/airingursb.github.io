import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: "Airing 的涂鸦板",
    description: "Airing's Blog - 记录生活与技术",
    site: context.site!,
    items: posts.map(post => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.description ?? '',
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-cn</language>',
  });
}
