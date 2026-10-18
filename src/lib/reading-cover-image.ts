import { getImage } from 'astro:assets';
import { loadReadingCover } from './reading-cover';

export type ReadingCoverImage = {
  src: string;
  srcSet?: { attribute?: string };
  attributes: Record<string, unknown>;
};

type ReadingCoverImageOptions = {
  /** Omit width/height together with `inferSize: true` to keep the source ratio. */
  width?: number;
  height?: number;
  inferSize?: boolean;
  widths?: number[];
  format?: 'webp' | 'jpeg' | 'png' | 'avif';
  quality?: number;
};

export async function resolveReadingCoverImage(
  src: string,
  label: string,
  options: ReadingCoverImageOptions,
): Promise<ReadingCoverImage | null> {
  return loadReadingCover(label, src, async () => {
    if (!options.inferSize || !options.widths?.length) return getImage({ src, ...options });
    // Never advertise srcset candidates wider than the source (no upscaling).
    const probe = await getImage({ src, inferSize: true });
    const sourceWidth = Number(probe.attributes.width) || 0;
    const widths = sourceWidth
      ? [...new Set([...options.widths.filter((w) => w < sourceWidth), sourceWidth])]
      : options.widths;
    return getImage({ src, ...options, widths });
  });
}
