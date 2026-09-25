import sharp from 'sharp';
import { mkdir, readdir, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extractMatte } from '../../editorial-footer/matte.mjs';

const root = 'output/h3-blog-delights-20260924/search';
const destination = 'public/blog-delights/search';
const width = 160, height = 192, columns = 8, fps = 12;
await mkdir(`${root}/frames`, { recursive: true });
await mkdir(destination, { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${root}/video/video-1.mp4`, '-vf', 'fps=12,scale=336:192:flags=lanczos', '-frames:v', '180', `${root}/frames/%04d.png`]);
const files = (await readdir(`${root}/frames`)).filter(file => /^\d{4}\.png$/.test(file)).sort();
const frames = [], reports = [];
for (const [index, file] of files.entries()) {
  const raw = await sharp(`${root}/frames/${file}`).ensureAlpha().raw().toBuffer();
  const { pixels, report } = extractMatte(raw, 336, 192);
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3]) {
    for (let channel = 0; channel < 3; channel++) pixels[i + channel] = Math.min(255, Math.round(pixels[i + channel] / 8) * 8);
  }
  frames.push(await sharp(pixels, { raw: { width: 336, height: 192, channels: 4 } })
    .extract({ left: 88, top: 0, width, height }).png().toBuffer());
  reports.push({ frame: index, ...report });
}
await sharp(frames[99]).webp({ lossless: true }).toFile(`${destination}/poster.webp`);
const clips = {};
for (const [name, start, end] of [['search', 18, 55], ['found', 55, 106], ['empty', 106, 179]]) {
  const selected = frames.slice(start, end);
  await sharp({ create: { width: width * columns, height: height * Math.ceil(selected.length / columns), channels: 4, background: '#00000000' } })
    .composite(selected.map((input, index) => ({ input, left: index % columns * width, top: Math.floor(index / columns) * height })))
    .webp({ lossless: true, effort: 5 }).toFile(`${destination}/${name}.webp`);
  clips[name] = { asset: `${name}.webp`, frames: selected.length };
}
await writeFile(`${destination}/manifest.json`, JSON.stringify({ version: 1, width, height, columns, fps, poster: 'poster.webp', clips }, null, 2) + '\n');
const samples = [18, 30, 42, 54, 66, 78, 90, 105, 112, 128, 146, 160, 178, 99];
for (const [theme, background] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
  await sharp({ create: { width: width * 7, height: height * 2, channels: 3, background } })
    .composite(samples.map((frame, index) => ({ input: frames[frame], left: index % 7 * width, top: Math.floor(index / 7) * height })))
    .png().toFile(`${root}/matte-${theme}.png`);
}
const bytes = Object.fromEntries(await Promise.all(['poster', 'search', 'found', 'empty'].map(async name => [name, (await stat(`${destination}/${name}.webp`)).size])));
await writeFile(`${root}/matte-report.json`, JSON.stringify({ source: `${root}/video/video-1.mp4`, fps, width, height, crop: { left: 88, top: 0 }, bytes, reports }, null, 2));
console.log(JSON.stringify({ frames: frames.length, bytes, clipped: reports.filter(report => report.edgePixels).length }));
