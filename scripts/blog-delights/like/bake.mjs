import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { extractMatte } from '../../editorial-footer/matte.mjs';

const root = 'output/h3-blog-delights-20260924/like';
const out = 'public/blog-delights/like';
const withBook = process.argv.includes('--book');
const prefix = withBook ? 'book-' : '';
const clip = withBook ? 'receive-book' : 'receive';
await mkdir(out, { recursive: true });
await mkdir(`${root}/${prefix}frames`, { recursive: true });
const files = (await readdir(`${root}/${prefix}raw`)).filter(name => /^\d+\.png$/.test(name)).sort().slice(0, 132);
const frames = [];
const report = [];
for (const [index, file] of files.entries()) {
  const raw = await sharp(`${root}/${prefix}raw/${file}`).ensureAlpha().raw().toBuffer();
  const { pixels, report: matte } = extractMatte(raw, 480, 480, { shadows: false });
  const seen = new Uint8Array(480 * 480);
  let bodyPixels = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || pixels[start * 4 + 3] < 16) continue;
    const component = [start]; seen[start] = 1;
    for (let i = 0; i < component.length; i++) {
      const p = component[i], x = p % 480, y = Math.floor(p / 480);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, n = ny * 480 + nx;
        if (nx < 0 || nx >= 480 || ny < 0 || ny >= 480 || seen[n] || pixels[n * 4 + 3] < 16) continue;
        seen[n] = 1; component.push(n);
      }
    }
    if (component.length > bodyPixels.length) bodyPixels = component;
  }
  const keep = new Uint8Array(seen.length);
  const b = { left: 480, right: 0, top: 480, bottom: 0 };
  for (const p of bodyPixels) {
    keep[p] = 1;
    const x = p % 480, y = Math.floor(p / 480);
    b.left = Math.min(b.left, x); b.right = Math.max(b.right, x);
    b.top = Math.min(b.top, y); b.bottom = Math.max(b.bottom, y);
  }
  for (let p = 0; p < keep.length; p++) if (!keep[p]) pixels.fill(0, p * 4, p * 4 + 4);
  const width = b.right - b.left + 1, height = b.bottom - b.top + 1;
  const body = await sharp(pixels, { raw: { width: 480, height: 480, channels: 4 } })
    .extract({ left: b.left, top: b.top, width, height })
    .resize({ height: withBook ? 174 : 214 }).png().toBuffer();
  const size = await sharp(body).metadata();
  const image = await sharp({ create: { width: 240, height: 240, channels: 4, background: '#00000000' } })
    .composite([{ input: body, left: Math.floor((240 - size.width) / 2), top: withBook ? 33 : 23 }]).png().toBuffer();
  frames.push(image);
  await writeFile(`${root}/${prefix}frames/${String(index).padStart(3, '0')}.png`, image);
  report.push({ index, ...matte });
}
const columns = 10;
await sharp({ create: { width: 240 * columns, height: 240 * Math.ceil(frames.length / columns), channels: 4, background: '#00000000' } })
  .composite(frames.map((input, i) => ({ input, left: i % columns * 240, top: Math.floor(i / columns) * 240 })))
  .webp({ quality: 84, alphaQuality: 100, effort: 6 }).toFile(`${out}/${clip}.webp`);
if (!withBook) await sharp(frames[0]).webp({ lossless: true }).toFile(`${out}/poster.webp`);
let manifest = { version: 1, width: 240, height: 240, columns, fps: 12, poster: 'poster.webp', clips: {} };
try { manifest = JSON.parse(await readFile(`${out}/manifest.json`, 'utf8')); }
catch (error) { if (!(error instanceof Error) || error.code !== 'ENOENT') throw error; }
manifest.clips[clip] = { asset: `${clip}.webp`, frames: frames.length };
await writeFile(`${out}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(`${root}/${prefix}matte-report.json`, `${JSON.stringify(report, null, 2)}\n`);
const samples = [0, 6, 12, 18, 24, 30, 42, 54, 66, 84, 108, 131];
for (const [theme, background] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
  await sharp({ create: { width: 960, height: 720, channels: 3, background } })
    .composite(samples.map((frame, i) => ({ input: frames[frame], left: i % 4 * 240, top: Math.floor(i / 4) * 240 })))
    .png().toFile(`${root}/${prefix}matte-${theme}.png`);
}
console.log(JSON.stringify({ frames: frames.length, public: out, matte: `${root}/matte-dark.png` }));
