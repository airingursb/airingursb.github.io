import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGitLastModified } from '../../src/lib/seo.ts';
import { loadImmersiveArticles } from './content.mjs';
import { transformImmersivePage } from './transform.mjs';

function render(article, locale) {
  return transformImmersivePage(article, locale, { dateModified: getGitLastModified(article.sourcePath) });
}

export async function writeImmersivePages(root, outDir) {
  const articles = await loadImmersiveArticles(root);
  for (const article of articles) {
    for (const locale of ['zh', 'en']) {
      const directory = path.join(outDir, locale === 'en' ? 'en' : '', 'immersive', article.slug);
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, 'index.html'), render(article, locale), 'utf8');
    }
  }
  return articles.length * 2;
}

export function immersiveSeo() {
  let root = process.cwd();
  return {
    name: 'immersive-seo',
    hooks: {
      'astro:config:done': ({ config }) => { root = fileURLToPath(config.root); },
      'astro:build:done': async ({ dir, logger }) => {
        const count = await writeImmersivePages(root, fileURLToPath(dir));
        logger.info(`Generated ${count} localized immersive article pages`);
      },
      'astro:server:setup': ({ server }) => {
        // Registered before Astro's static middleware, so both locale routes use the same transformer.
        server.middlewares.use(async (request, response, next) => {
          const url = new URL(request.url ?? '/', 'http://localhost');
          const route = url.pathname.match(/^\/(en\/)?immersive\/([a-z0-9-]+)\/(?:index\.html)?$/);
          if (!route) return next();
          try {
            const article = (await loadImmersiveArticles(root)).find(item => item.slug === route[2]);
            if (!article) return next();
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(render(article, route[1] ? 'en' : 'zh'));
          } catch (error) {
            next(error);
          }
        });
      },
    },
  };
}
