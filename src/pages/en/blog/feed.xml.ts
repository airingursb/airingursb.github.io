import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { enPostSlug } from '../../../lib/i18n';

const md = new MarkdownIt();

export async function GET(context: APIContext) {
  const posts = (await getCollection('postsEn', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const trackingBase = 'https://ursb.me/api/rss-track';
  const FULL_TEXT_COUNT = 10;

  return rss({
    title: "Airing's Blog (English)",
    description: "Airing - INFJ | Blogger | Full-stack engineer | SG",
    site: context.site!,
    stylesheet: '/feed.xsl',
    items: posts.map((post, i) => {
      const slug = enPostSlug(post.id);
      const desc = post.data.description ?? '';
      const pixel = `<img src="${trackingBase}?post=${encodeURIComponent(slug)}" width="1" height="1" alt="" />`;

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
        link: `/en/posts/${slug}/`,
        categories: post.data.tags,
      };
    }),
    customData: '<language>en</language>',
  });
}
