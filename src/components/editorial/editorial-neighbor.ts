import type { CollectionEntry } from 'astro:content';
import { makeExcerpt } from '../../lib/seo';

export type EditorialNeighbor = {
  readonly slug: string;
  readonly title: string;
  readonly description?: string;
  readonly cover?: string;
  readonly date?: Date | string;
  readonly readingTime?: number;
};

export function toEditorialNeighbor(post: CollectionEntry<'posts' | 'postsEn'>): EditorialNeighbor {
  const body = post.body ?? '';
  const chineseCharacters = post.collection === 'posts' ? (body.match(/[\u4e00-\u9fff]/g) ?? []).length : 0;
  const words = body.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(Boolean).length;
  const description = post.data.description?.trim() || makeExcerpt(body);
  return {
    slug: post.id,
    title: post.data.title,
    date: post.data.date,
    ...(description ? { description } : {}),
    ...(post.data.cover ? { cover: post.data.cover } : {}),
    ...(body.trim() ? { readingTime: Math.max(1, Math.ceil((chineseCharacters + words) / 200)) } : {}),
  };
}
