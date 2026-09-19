import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const root = 'output/editorial-footer';
const specs = [
  { name: 'cart', width: 1280, height: 720, scale: .72, pixel: true },
  { name: 'counter', width: 1024, height: 1024, scale: .72, pixel: true },
  { name: 'panda', width: 1024, height: 1024, scale: .72, pixel: false },
];
for (const spec of specs) {
  const { data, info } = await sharp(`${root}/art/${spec.name}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const offset = (y * info.width + x) * 4;
    if (data[offset + 3] < (spec.pixel ? 128 : 64)) { data[offset + 3] = 0; continue; }
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  const artwork = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(Math.round(spec.width * spec.scale), Math.round(spec.height * spec.scale), { fit: 'inside', kernel: spec.pixel ? 'nearest' : 'lanczos3' })
    .png().toBuffer();
  const meta = await sharp(artwork).metadata();
  const composited = await sharp({ create: { width: spec.width, height: spec.height, channels: 4, background: '#00000000' } })
    .composite([{ input: artwork, left: Math.round((spec.width - meta.width) / 2), top: Math.round((spec.height - meta.height) / 2) }]).png().toBuffer();
  await sharp(composited).flatten({ background: '#ff00ff' }).jpeg({ quality: 96, chromaSubsampling: '4:4:4' }).toFile(`${root}/art/${spec.name}-h3.jpg`);
  const publicDir = `public/editorial-motion/${spec.name}`;
  await mkdir(publicDir, { recursive: true });
  const logicalWidth = spec.name === 'cart' ? 320 : 240;
  await sharp(composited).resize(logicalWidth).webp({ lossless: true }).toFile(`${publicDir}/poster.webp`);
  await writeFile(`${root}/art/${spec.name}-layout.json`, JSON.stringify({ ...spec, inputBounds: { left, top, right, bottom }, logicalWidth }, null, 2));
  console.log(`${spec.name}: reference and transparent poster ready`);
}
