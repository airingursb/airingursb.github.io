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
});

const notes = defineCollection({
  loader: glob({ pattern: ['**/*.mdx', '!en/**'], base: './src/content/notes' }),
  schema: noteSchema,
});

const notesEn = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes/en' }),
  schema: noteSchema,
});

export const collections = { posts, postsEn, notes, notesEn };
