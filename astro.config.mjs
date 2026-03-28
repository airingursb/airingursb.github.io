import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { remarkEmbed } from './src/plugins/remark-embed.mjs';

export default defineConfig({
  site: 'https://ursb.me',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkEmbed],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
