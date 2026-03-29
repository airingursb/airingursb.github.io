import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const trackingBase = 'https://ursb.me/api/rss-track';

  return rss({
    title: "Airing 的涂鸦板",
    description: "Airing's Blog - 记录生活与技术",
    site: context.site!,
    items: posts.map(post => {
      const desc = post.data.description ?? '';
      const pixel = `<img src="${trackingBase}?post=${encodeURIComponent(post.id)}" width="1" height="1" alt="" />`;
      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: desc,
        content: `${desc}${pixel}`,
        link: `/posts/${post.id}/`,
        categories: post.data.tags,
      };
    }),
    customData: '<language>zh-cn</language>',
  });
}
