import { defineConfig } from 'astro/config';
import { remarkEmbed } from './src/plugins/remark-embed.mjs';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkWikilinks from './src/lib/remark-wikilinks.ts';

export default defineConfig({
  site: 'https://ursb.me',
  output: 'static',
  integrations: [mdx(), react()],
  markdown: {
    remarkPlugins: [remarkEmbed, remarkWikilinks],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
