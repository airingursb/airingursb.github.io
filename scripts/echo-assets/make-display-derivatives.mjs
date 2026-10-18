// Display derivatives for Echo (details M7). The originals stay untouched:
//   assets/postage/<id>.png (228×304 lossless PNG, DESIGN.md) → assets/postage-display/<id>.webp
//     152×203 = 2× the largest envelope stamp (76px), WebP lossless with
//     `exact` so even fully transparent pixels keep their RGB.
//   assets/stationery/bear-postage.png → bear-postage-112.webp, 2× the 56px footer emblem.
//   assets/stationery/paper-fibers.webp (400×400) → paper-fibers-256.webp, lossless,
//     drawn at 400px in CSS so the fibre scale is unchanged.
// Every output is decoded again and compared with the resized buffer: alpha
// everywhere and RGB on every visible pixel must be identical; the script
// exits non-zero on any mismatch.
// Run: node scripts/echo-assets/make-display-derivatives.mjs
import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const assets = fileURLToPath(new URL('../../src/features/echo/assets/', import.meta.url));

async function derive(source, dest, width, height) {
  // Resize once into a lossless PNG buffer (un-premultiplied RGBA), then encode that.
  const resized = await sharp(source).ensureAlpha().resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).png({ compressionLevel: 0 }).toBuffer();
  await sharp(resized).webp({ lossless: true, exact: true, effort: 6 }).toFile(dest);
  const expected = await sharp(resized).ensureAlpha().raw().toBuffer();
  const decoded = await sharp(dest).ensureAlpha().raw().toBuffer();
  // Alpha must match everywhere and RGB wherever a pixel is visible. libwebp
  // may normalise the RGB of fully transparent pixels, which never shows; the
  // PNG originals keep strict equality for that hidden data.
  for (let i = 0; i < expected.length; i += 4) {
    const same = expected[i + 3] === decoded[i + 3] && (expected[i + 3] === 0 || (expected[i] === decoded[i] && expected[i + 1] === decoded[i + 1] && expected[i + 2] === decoded[i + 2]));
    if (!same) throw new Error(`${dest}: decoded pixel ${i / 4} differs from the resized buffer`);
  }
  const { size } = await stat(dest);
  return size;
}

const out = path.join(assets, 'postage-display');
await mkdir(out, { recursive: true });
let total = 0;
for (const name of (await readdir(path.join(assets, 'postage'))).filter((file) => file.endsWith('.png')).sort()) {
  const size = await derive(path.join(assets, 'postage', name), path.join(out, name.replace(/\.png$/, '.webp')), 152, 203);
  total += size;
  console.log(`postage-display/${name.replace(/\.png$/, '.webp')} ${(size / 1024).toFixed(1)}KB`);
}
console.log(`postage display total ${(total / 1024).toFixed(1)}KB`);
const bear = await derive(path.join(assets, 'stationery/bear-postage.png'), path.join(assets, 'stationery/bear-postage-112.webp'), 112, 149);
console.log(`stationery/bear-postage-112.webp ${(bear / 1024).toFixed(1)}KB`);
const fibers = await derive(path.join(assets, 'stationery/paper-fibers.webp'), path.join(assets, 'stationery/paper-fibers-256.webp'), 256, 256);
console.log(`stationery/paper-fibers-256.webp ${(fibers / 1024).toFixed(1)}KB`);
