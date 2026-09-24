import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const englishFallbacks = {
  'react-internals': {
    title: 'The Life of a setState — Inside the React Rendering Pipeline',
    description: 'From a setState call to a pixel changing on screen: Fiber, reconciliation, 31 priority lanes, the commit phases, and Server Components. A field map of the React 19 rendering pipeline.',
  },
};

async function readMetadata(file) {
  const text = await readFile(file, 'utf8');
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = frontmatter ? parse(frontmatter[1]) : undefined;
  if (!data || typeof data.title !== 'string' || typeof data.summary !== 'string'
      || typeof data.date !== 'string' || !Number.isFinite(Date.parse(data.date))) {
    throw new TypeError(`Invalid immersive note metadata: ${file}`);
  }
  return { title: data.title, description: data.summary, date: data.date, public: data.public !== false && data.draft !== true };
}

export async function loadImmersiveArticles(root = process.cwd()) {
  const entries = await readdir(path.join(root, 'public/immersive'), { withFileTypes: true });
  const articles = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async ({ name: slug }) => {
    const sourcePath = `public/immersive/${slug}/index.html`;
    const zh = await readMetadata(path.join(root, `src/content/notes/${slug}.mdx`));
    if (!zh.public) return null;
    let en;
    let englishImage = true;
    try {
      en = await readMetadata(path.join(root, `src/content/notes/en/${slug}.mdx`));
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT' || !englishFallbacks[slug]) throw error;
      en = englishFallbacks[slug];
      englishImage = false;
    }
    return {
      slug, sourcePath, datePublished: zh.date,
      source: await readFile(path.join(root, sourcePath), 'utf8'),
      locales: {
        zh: { ...zh, imagePath: `/og/notes/${slug}.png` },
        en: {
          ...en,
          imagePath: `/og/${englishImage && en.public ? 'en/' : ''}notes/${slug}.png`,
          notePath: englishImage && en.public ? `/en/notes/${slug}/` : undefined,
        },
      },
    };
  }));
  return articles.filter(article => article !== null).sort((a, b) => a.slug.localeCompare(b.slug));
}
