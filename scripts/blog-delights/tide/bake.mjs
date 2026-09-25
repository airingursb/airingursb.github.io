import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extractMatte } from '../../editorial-footer/matte.mjs';

const root = 'output/h3-blog-delights-20260924/tide';
const destination = 'public/blog-delights/tide';
const width = 320, height = 80, columns = 10, fps = 12;
await mkdir(destination, { recursive: true });
await mkdir(`${root}/evidence`, { recursive: true });
const files = (await readdir(`${root}/bake/raw`)).filter(file => /^\d{4}\.png$/.test(file)).sort();
if (files.length !== 181) throw new Error(`Expected 181 H3 frames, found ${files.length}`);
const frames = [], reports = [];
for (const file of files) {
  const raw = await sharp(`${root}/bake/raw/${file}`).ensureAlpha().raw().toBuffer();
  const { pixels, report } = extractMatte(raw, width * 2, height * 2);
  const logical = await sharp(pixels, { raw: { width: width * 2, height: height * 2, channels: 4 } })
    .resize(width, height, { kernel: 'lanczos3' }).raw().toBuffer();
  for (let i = 0; i < logical.length; i += 4) {
    if (logical[i + 3] === 0) continue;
    for (let channel = 0; channel < 3; channel++) logical[i + channel] = Math.min(255, Math.round(logical[i + channel] / 8) * 8);
  }
  frames.push(await sharp(logical, { raw: { width, height, channels: 4 } }).png().toBuffer());
  reports.push(report);
}

async function pack(name, sequence) {
  await sharp({ create: { width: width * columns, height: height * Math.ceil(sequence.length / columns), channels: 4, background: '#00000000' } })
    .composite(sequence.map((input, index) => ({ input, left: index % columns * width, top: Math.floor(index / columns) * height })))
    .webp({ lossless: true, effort: 5 }).toFile(`${destination}/${name}.webp`);
}

const split = 40;
await pack('wave', frames.slice(0, split));
await pack('listen', frames.slice(split, 174));
await pack('idle', frames.slice(174));
await sharp(frames[0]).webp({ lossless: true }).toFile(`${destination}/poster.webp`);
await sharp(frames[108]).webp({ lossless: true }).toFile(`${destination}/listening.webp`);
for (const [theme, background] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
  const indices = [0, 12, 24, 39, 40, 54, 72, 84, 96, 108, 120, 132, 144, 160, 174, 180];
  await sharp({ create: { width: width * 4, height: height * 4, channels: 3, background } })
    .composite(indices.map((frame, index) => ({ input: frames[frame], left: index % 4 * width, top: Math.floor(index / 4) * height })))
    .png().toFile(`${root}/evidence/matte-${theme}.png`);
}
await writeFile(`${destination}/manifest.json`, `${JSON.stringify({ version: 1, width, height, columns, fps, poster: 'poster.webp',
  clips: { wave: { asset: 'wave.webp', frames: split, rest: 'idle' }, listen: { asset: 'listen.webp', frames: 174 - split, rest: 'idle' }, idle: { asset: 'idle.webp', frames: frames.length - 174, loop: true } },
}, null, 2)}\n`);
await writeFile(`${root}/evidence/matte-report.json`, `${JSON.stringify({
  source: `${root}/h3/video-1.mp4`,
  sha256: createHash('sha256').update(await readFile(`${root}/h3/video-1.mp4`)).digest('hex'),
  dimensions: [width, height], fps, frames: frames.length,
  sourceCrop: [0, 256, 1344, 336],
  matte: 'Existing adaptive exterior flood and foreground-edge reconstruction, applied at 2x output resolution.',
  audio: 'Source contains AAC; production uses only silent RGBA frame atlases.',
  clippedFrames: reports.filter(report => report.edgePixels > 0).length,
  reports,
}, null, 2)}\n`);
console.log(`Packed ${frames.length} H3 frames; ${reports.filter(report => report.edgePixels > 0).length} clipped frames.`);
