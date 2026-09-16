import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extractMatte } from './matte.mjs';

const clip = process.argv[2];
if (!['open', 'close'].includes(clip)) throw new Error('Usage: node scripts/bear-stories/suitcase/bake.mjs open|close');
const source = `output/bear-stories/suitcase/h3-${clip}`;
const destination = 'public/bear-stories/suitcase';
const width = 480, height = 270, columns = 6, chunkSize = 48;
await mkdir(`${source}/raw`, { recursive: true });
await mkdir(`${source}/frames`, { recursive: true });
await mkdir(destination, { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${source}/video-1.mp4`, '-vf', `fps=12,scale=${width}:${height}:flags=neighbor`, '-frames:v', '180', `${source}/raw/%04d.png`]);
const files = (await readdir(`${source}/raw`)).filter(file => file.endsWith('.png')).sort();
if (files.length !== 180) throw new Error(`Expected 180 frames, got ${files.length}`);

const layers = [], report = [];
for (const [index, file] of files.entries()) {
  const raw = await sharp(`${source}/raw/${file}`).ensureAlpha().raw().toBuffer();
  const { pixels, report: frameReport } = extractMatte(raw, width, height);
  const png = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
  await writeFile(`${source}/frames/${file}`, png);
  layers.push(png);
  report.push({ index, ...frameReport });
}

const chunks = [];
for (let start = 0; start < layers.length; start += chunkSize) {
  const frames = layers.slice(start, start + chunkSize);
  const { data, info } = await sharp({ create: { width: width * columns, height: height * Math.ceil(frames.length / columns), channels: 4, background: '#00000000' } })
    .composite(frames.map((input, index) => ({ input, left: index % columns * width, top: Math.floor(index / columns) * height })))
    .raw().toBuffer({ resolveWithObject: true });
  // One fixed RGB grid across every frame avoids adaptive palette flicker; alpha remains exact.
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round(data[i + c] / 8) * 8);
  const atlas = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).webp({ lossless: true, effort: 5 }).toBuffer();
  const file = `${clip}-${chunks.length}.webp`;
  await writeFile(`${destination}/${file}`, atlas);
  chunks.push({ file, frames: frames.length, bytes: atlas.length });
}
if (clip === 'open') {
  await writeFile(`${destination}/closed-poster.png`, layers[0]);
  await writeFile(`${destination}/open-poster.png`, layers.at(-1));
}
await writeFile(`${source}/bake-report.json`, JSON.stringify({ width, height, fps: 12, frames: report, chunks }, null, 2));
for (const [theme, background] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
  const samples = [0, 18, 36, 54, 72, 90, 108, 126, 144, 162, 179];
  await sharp({ create: { width: width * 3, height: height * 4, channels: 3, background } })
    .composite(samples.map((frame, index) => ({ input: layers[frame], left: index % 3 * width, top: Math.floor(index / 3) * height })))
    .png().toFile(`${source}/contact-${theme}.png`);
}
console.log(JSON.stringify({ clip, frames: files.length, bytes: chunks.reduce((sum, chunk) => sum + chunk.bytes, 0), clipped: report.filter(frame => frame.touchesEdge).length }));
