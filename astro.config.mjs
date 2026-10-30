import { defineConfig } from 'astro/config';
import { remarkEmbed } from './src/plugins/remark-embed.mjs';
import { rehypeAnchorIds } from './src/plugins/rehype-anchor-ids.mjs';
import { rehypePostImages } from './src/plugins/rehype-post-images.mjs';
import { remarkHasMath } from './src/plugins/remark-has-math.mjs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { immersiveSeo } from './scripts/immersive-seo/integration.mjs';
import { weeklyFontSubset } from './scripts/weekly-fonts/integration.mjs';
import { echoRackCovers } from './scripts/echo-covers/rack.mjs';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkWikilinks from './src/lib/remark-wikilinks.ts';
import fs from 'node:fs';
import path from 'node:path';

// Build the set of EN note slugs at config-load time, so the remark plugin
// knows which [[wikilink]] targets have English translations.
//
// Note: this runs once at Astro config-load. In `astro dev`, adding a new
// EN note requires restarting the dev server for its [[wikilinks]] to
// resolve to /en/notes/*. Production builds always re-run this.
function loadEnNoteSlugs() {
  const dir = path.resolve('./src/content/notes/en');
  try {
    if (!fs.existsSync(dir)) return new Set();
    return new Set(
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.mdx'))
        .map(f => f.replace(/\.mdx$/, ''))
    );
  } catch (err) {
    console.warn('[wikilinks] failed to read EN notes directory:', err);
    return new Set();
  }
}
const enNoteSlugs = loadEnNoteSlugs();

export default defineConfig({
  site: 'https://ursb.me',
  output: 'static',
  trailingSlash: 'always',
  vite: {
    server: {
      proxy: {
        // Dev only (`astro dev`; never part of the static build). chat.ursb.me
        // allows only ursb.me origins, so localhost / LAN dev pages get a CORS
        // 403. Comment and guestbook reads go through /__chat instead (see
        // CommentsRuntime.astro, GuestbookCard.astro). The proxy is read-only:
        // anything but GET/HEAD is refused here, so a dev page can never post,
        // like or delete on production. Origin/Referer/Cookie are dropped so
        // the API sees a plain server-side read.
        '/__chat': {
          target: 'https://chat.ursb.me',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/__chat/, ''),
          bypass(req, res) {
            if (req.method === 'GET' || req.method === 'HEAD') return undefined;
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 'DEV_PROXY_READ_ONLY', message: 'The dev proxy only forwards GET.' }));
            return req.url;
          },
          configure(proxy) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.removeHeader('origin');
              proxyReq.removeHeader('referer');
              proxyReq.removeHeader('cookie');
            });
          },
        },
      },
    },
  },
  image: {
    domains: ['r2.airingdeng.com'],
  },
  integrations: [mdx(), react(), immersiveSeo(), weeklyFontSubset(), echoRackCovers(), {
    name: 'client-interaction-directive',
    hooks: {
      'astro:config:setup': ({ addClientDirective }) => {
        addClientDirective({ name: 'interaction', entrypoint: './src/directives/interaction.js' });
      },
    },
  }, {
    name: 'bear-home-preview',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
        // Share the page entry so Astro includes its styles in both static routes.
        injectRoute({ pattern: '/previews/bear-home/', entrypoint: './src/pages/index.astro' });
        injectRoute({ pattern: '/previews/photo-darkroom/', entrypoint: './src/pages/photos.astro' });
        injectRoute({ pattern: '/previews/living-cover/', entrypoint: './src/pages/blog.astro' });
        injectRoute({ pattern: '/previews/lost-bear/en/', entrypoint: './src/pages/previews/lost-bear.astro' });
        for (const story of ['stories', 'wind', 'suitcase', 'workshop', 'garden']) {
          injectRoute({ pattern: `/en/previews/bear-${story}/`, entrypoint: `./src/pages/previews/bear-${story}.astro` });
        }
        for (const [story, route] of [
          ['stories', '/playbook/bear-stories/'],
          ['wind', '/playbook/desk-wind/'],
          ['workshop', '/playbook/workshop/'],
          ['garden', '/playbook/shared-garden/'],
          ['suitcase', '/photos/suitcase/'],
        ]) {
          for (const prefix of ['', '/en']) {
            injectRoute({ pattern: `${prefix}${route}`, entrypoint: `./src/pages/previews/bear-${story}.astro` });
          }
        }
      },
    },
  }],
  markdown: {
    remarkPlugins: [remarkEmbed, [remarkWikilinks, { enNoteSlugs }], remarkMath, remarkHasMath],
    // KaTeX renders at build time (HTML + MathML, no client JS); the stylesheet
    // is linked only on pages whose frontmatter gets `hasMath` (remark-has-math).
    rehypePlugins: [[rehypeKatex, { strict: false, throwOnError: false }], rehypeAnchorIds, rehypePostImages],
    shikiConfig: {
      theme: 'github-dark',
      // Old posts fence code as ```JavaScript / ```Javascript; Shiki ids are
      // lower-case, so without these the blocks fall back to plain text.
      // (```flow is flowchart.js DSL, not Flow-typed JS — left as plain text.)
      langAlias: { JavaScript: 'javascript', Javascript: 'javascript', JS: 'javascript' },
    },
  },
});
