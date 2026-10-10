import { getImage } from 'astro:assets';
import { loadReadingCover } from './reading-cover';

export type ReadingCoverImage = {
  src: string;
  srcSet?: { attribute?: string };
  attributes: Record<string, unknown>;
};

type ReadingCoverImageOptions = {
  width: number;
  height: number;
  widths?: number[];
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  quality?: number;
};

export async function resolveReadingCoverImage(
  src: string,
  label: string,
  options: ReadingCoverImageOptions,
): Promise<ReadingCoverImage | null> {
  return loadReadingCover(label, src, () => getImage({ src, ...options }));
}
