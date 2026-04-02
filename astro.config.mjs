import { defineConfig } from 'astro/config';
import { remarkEmbed } from './src/plugins/remark-embed.mjs';

export default defineConfig({
  site: 'https://ursb.me',
  output: 'static',
  integrations: [],
  markdown: {
    remarkPlugins: [remarkEmbed],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
