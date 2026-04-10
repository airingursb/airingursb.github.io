import { defineConfig } from 'astro/config';
import { remarkEmbed } from './src/plugins/remark-embed.mjs';
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
  integrations: [mdx(), react()],
  markdown: {
    remarkPlugins: [remarkEmbed, [remarkWikilinks, { enNoteSlugs }]],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
