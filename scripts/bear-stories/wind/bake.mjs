import sharp from 'sharp';
import { mkdir, readdir, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { removeMatte } from './matte.mjs';
import { loadWindowLayers, repairWindow } from './window-layer.mjs';

const clips = { gust: 'gust-right', paperweight: 'paperweight-fixed', window: 'window' };
const names = process.argv.slice(2);
if (!names.length || names.some(name => !Object.hasOwn(clips, name))) throw new Error('Usage: node scripts/bear-stories/wind/bake.mjs gust paperweight window');
const width = 320;
const height = 192;
const columns = 12;
const windowLayers = await loadWindowLayers();
await mkdir('public/bear-stories/wind', { recursive: true });
for (const name of names) {
  const root = `output/bear-stories/wind/${clips[name]}`;
  await mkdir(`${root}/raw`, { recursive: true });
  await mkdir(`${root}/frames`, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${root}/video-1.mp4`, '-vf', 'fps=12,scale=320:180:flags=neighbor,pad=320:192:0:6:color=white', '-frames:v', '180', `${root}/raw/%04d.png`]);
  const files = (await readdir(`${root}/raw`)).filter(file => file.endsWith('.png')).sort();
  if (files.length !== 180) throw new Error(`Expected 180 frames: ${name} has ${files.length}`);
  const layers = [];
  const report = [];
  for (const [frame, file] of files.entries()) {
    const pixels = await sharp(`${root}/raw/${file}`).ensureAlpha().raw().toBuffer();
    const matte = removeMatte(pixels, width, height);
    const windowLayer = repairWindow(pixels, name, frame + 1, windowLayers);
    const png = await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
    await writeFile(`${root}/frames/${file}`, png);
    layers.push({ input: png, left: frame % columns * width, top: Math.floor(frame / columns) * height });
    report.push({ frame, ...matte, windowLayer });
  }
  const indexed = await sharp({ create: { width: columns * width, height: 15 * height, channels: 4, background: '#00000000' } }).composite(layers).png({ palette: true, colours: 256, dither: 0 }).toBuffer();
  const atlas = await sharp(indexed).webp({ lossless: true }).toBuffer();
  await writeFile(`public/bear-stories/wind/${name}-atlas.webp`, atlas);
  await copyFile(`${root}/frames/0001.png`, `public/bear-stories/wind/${name}-poster.png`);
  await copyFile(`${root}/frames/0180.png`, `public/bear-stories/wind/${name}-rest.png`);
  for (const [theme, color] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
    const contact = [0, 24, 48, 72, 96, 120, 144, 179].map((frame, index) => ({ input: layers[frame].input, left: index % 4 * width, top: Math.floor(index / 4) * height }));
    await sharp({ create: { width: 4 * width, height: 2 * height, channels: 3, background: color } }).composite(contact).png().toFile(`${root}/contact-${theme}.png`);
  }
  const summary = { name, frames: files.length, bytes: atlas.length, clippedFrames: report.filter(frame => frame.touchesEdge).length };
  await writeFile(`${root}/bake-report.json`, JSON.stringify({ summary, frames: report }, null, 2));
  console.log(summary);
}
