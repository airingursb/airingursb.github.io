// Run after exporting the live A4 cover DOM to cover-zh.png / cover-en.png.
// Share covers live under assets/ (the newsletter sender requires it).
// Keep the full PNG for downloads; use bounded WebP derivatives in page UI.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const dir = name => fileURLToPath(new URL(`../public/reading/weekly/004/${name}`, import.meta.url));
const asset = name => dir(name.startsWith('shelf-') ? name : `assets/${name}`);
for (const lang of ['zh', 'en']) {
  const input = asset(`cover-${lang}.png`);
  await sharp(input).resize(540, 764).webp({ quality: 82 }).toFile(asset(`shelf-cover-${lang}.webp`));
  await sharp(input).resize(864, 1222).webp({ quality: 85 }).toFile(asset(`cover-${lang}.webp`));
}
