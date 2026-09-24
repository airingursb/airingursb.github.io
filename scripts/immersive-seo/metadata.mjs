import { immersiveLocaleRuntime } from './runtime.mjs';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function immersiveHead(article, locale, dateModified) {
  const { title, description } = article.locales[locale];
  const zh = `https://ursb.me/immersive/${article.slug}/`;
  const en = `https://ursb.me/en/immersive/${article.slug}/`;
  const url = locale === 'en' ? en : zh;
  const image = `https://ursb.me${article.locales[locale].imagePath ?? `/og/notes/${article.slug}.png`}`;
  const published = new Date(article.datePublished).toISOString();
  const modified = dateModified && dateModified.getTime() > Date.parse(published) ? dateModified.toISOString() : published;
  const schema = {
    '@context': 'https://schema.org', '@type': 'Article', '@id': `${url}#article`,
    headline: title, description, image: [image], url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: 'Airing', url: 'https://ursb.me/' },
    publisher: { '@type': 'Person', name: 'Airing', url: 'https://ursb.me/' },
    datePublished: published, dateModified: modified, inLanguage: locale === 'en' ? 'en' : 'zh-CN',
  };
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    '<meta name="author" content="Airing">',
    `<link rel="canonical" href="${url}">`,
    ...[['zh-CN', zh], ['en', en], ['x-default', zh]].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}">`),
    ...Object.entries({ title, description, image, url, type: 'article', site_name: 'ursb.me · Airing', locale: locale === 'en' ? 'en_US' : 'zh_CN', 'locale:alternate': locale === 'en' ? 'zh_CN' : 'en_US' }).map(([key, value]) => `<meta property="og:${key}" content="${escapeHtml(value)}">`),
    ...Object.entries({ card: 'summary_large_image', title, description, image, creator: '@airingursb' }).map(([key, value]) => `<meta name="twitter:${key}" content="${escapeHtml(value)}">`),
    `<meta property="article:published_time" content="${published}">`,
    `<meta property="article:modified_time" content="${modified}">`,
    '<meta property="article:author" content="https://ursb.me/">',
    `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`,
    `<script data-immersive-routing>${immersiveLocaleRuntime(article.slug)}</script>`,
  ];
  return `\n${tags.join('\n')}\n`;
}
