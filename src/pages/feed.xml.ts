import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt();

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const trackingBase = 'https://ursb.me/api/rss-track';
  const FULL_TEXT_COUNT = 10;

  return rss({
    title: "Airing 的博客",
    description: "Airing's Blog - 记录生活与技术",
    site: context.site!,
    items: posts.map((post, i) => {
      const desc = post.data.description ?? '';
      const pixel = `<img src="${trackingBase}?post=${encodeURIComponent(post.id)}" width="1" height="1" alt="" />`;

      let content: string;
      if (i < FULL_TEXT_COUNT && post.body) {
        const html = sanitizeHtml(md.render(post.body), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt', 'title', 'width', 'height'],
          },
        });
        content = `${html}${pixel}`;
      } else {
        content = `${desc}${pixel}`;
      }

      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: desc,
        content,
        link: `/posts/${post.id}/`,
        categories: post.data.tags,
      };
    }),
    customData: '<language>zh-cn</language>',
  });
}
