#!/usr/bin/env node
// Run after exporting cover PNGs. Download originals are never modified.
import { glob } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
for await (const file of glob('public/reading/weekly/*/assets/share-cover-*.png', { cwd: root })) {
  const source = `${root}${file}`;
  const output = source.replace(/\.png$/, '.webp');
  const result = await sharp(source)
    .resize({ width: 864, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(output);
  console.log(`${file.replace(/\.png$/, '.webp')}: ${result.width}×${result.height}, ${result.size} bytes`);
}
