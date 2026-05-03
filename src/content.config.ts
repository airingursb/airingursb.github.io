import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  cover: z.string().optional(),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
});

const posts = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!en/**'], base: './src/content/posts' }),
  schema: postSchema,
});

const postsEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts/en' }),
  schema: postSchema,
});

const noteSchema = z.object({
  title: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  public: z.boolean().default(true),
  draft: z.boolean().default(false),
  interactive: z.boolean().default(false),
  summary: z.string(),
  // Immersive: standalone full-page article hosted under /immersive/<slug>/
  // When set, the notes list links directly to this URL (target=_blank) and shows
  // a special badge. The detail page /notes/<slug>/ still renders mdx body as
  // a preview/teaser for RSS and SEO.
  immersive: z.object({
    url: z.string(),                    // e.g. "/immersive/helio/"
    label: z.string().optional(),       // shown next to badge, default "沉浸式 / Immersive"
  }).optional(),
});

const notes = defineCollection({
  loader: glob({ pattern: ['**/*.mdx', '!en/**'], base: './src/content/notes' }),
  schema: noteSchema,
});

const notesEn = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes/en' }),
  schema: noteSchema,
});

const workoutsSchema = z.object({
  title: z.object({ zh: z.string(), en: z.string() }),
  description: z.object({ zh: z.string(), en: z.string() }).optional(),
  location: z.object({ zh: z.string(), en: z.string() }).optional(),
  weather: z.object({ zh: z.string(), en: z.string() }).optional(),
  companions: z.array(z.string()).optional(),
  cover: z.string().optional(),
  // public: false → workout exists only in the local (gitignored)
  // dataset and never gets committed/built into the public site.
  // Flip to true when ready to publish that specific hike.
  public: z.boolean().default(false),
  draft: z.boolean().default(false),
});

const workouts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/workouts' }),
  schema: workoutsSchema,
});

export const collections = { posts, postsEn, notes, notesEn, workouts };
