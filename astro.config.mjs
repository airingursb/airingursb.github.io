import { defineConfig } from 'astro/config';
import { remarkEmbed } from './src/plugins/remark-embed.mjs';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://ursb.me',
  output: 'static',
  integrations: [mdx(), react()],
  markdown: {
    remarkPlugins: [remarkEmbed],
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
