import type { ImageMetadata } from 'astro';
import { readerForLetter } from './reader-characters';

const artwork = import.meta.glob<ImageMetadata>('../assets/postage/*.png', {
  eager: true,
  import: 'default',
});

const portraits = import.meta.glob<ImageMetadata>('../assets/readers/*.webp', {
  eager: true,
  import: 'default',
});

export function portraitFor(letterId: string): ImageMetadata {
  const { character } = readerForLetter(letterId);
  const portrait = portraits[`../assets/readers/${character}.webp`];
  if (!portrait) throw new Error(`Missing Echo reader portrait: ${character}`);
  return portrait;
}

export function postageFor(letterId: string): ImageMetadata {
  readerForLetter(letterId);
  const stamp = artwork[`../assets/postage/${letterId}.png`];
  if (!stamp) throw new Error(`Missing Echo postage for correspondence: ${letterId}`);
  return stamp;
}
