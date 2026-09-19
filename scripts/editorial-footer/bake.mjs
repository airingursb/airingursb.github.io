import sharp from 'sharp';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { extractMatte } from './matte.mjs';

const { values } = parseArgs({ options: {
  jobs: { type: 'string' }, samples: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
} });
if (values.help) {
  console.log('Usage: node scripts/editorial-footer/bake.mjs --jobs cart-arrival,cart-bookmark,cart-bird,cart-tumble,counter-subscribe [--samples]\nAlso supported: cart-reverse-v2,panda-close-v2. Source jobs may have a version suffix; public clip names omit it. Samples writes evidence only.');
  process.exit(0);
}
const jobs = (values.jobs ?? 'cart-arrival,cart-bookmark,cart-bird,cart-tumble,counter-subscribe,cart-reverse-v2,panda-close-v2').split(',');
if (!jobs.every(job => /^(cart-(arrival|bookmark|bird|tumble|reverse)|counter-subscribe|panda-close)(-v\d+)?$/.test(job))) {
  throw new Error('Unknown editorial clip; use --help for supported job names');
}
if (jobs.includes('cart-reverse') || jobs.includes('panda-close')) throw new Error('Original reverse/panda sources failed framing QA; use the reviewed -v2 replacements');
const root = 'output/editorial-footer';
const evidence = `${root}/evidence`;
const fps = 12, columns = 10;
await mkdir(evidence, { recursive: true });

async function atlas(frames, width, height, path) {
  await sharp({ create: { width: width * columns, height: height * Math.ceil(frames.length / columns), channels: 4, background: '#00000000' } })
    .composite(frames.map((input, index) => ({ input, left: index % columns * width, top: Math.floor(index / columns) * height })))
    .webp({ lossless: true, effort: 5 }).toFile(path);
}

async function contact(frames, width, height, name, indices) {
  for (const [theme, background] of [['dark', '#111318'], ['light', '#f8f7f2']]) {
    await sharp({ create: { width: width * 4, height: height * Math.ceil(indices.length / 4), channels: 3, background } })
      .composite(indices.map((frame, index) => ({ input: frames[frame], left: index % 4 * width, top: Math.floor(index / 4) * height })))
      .png().toFile(`${evidence}/matte-${name}-${theme}.png`);
  }
}

async function tailLoop(frames, width, height) {
  const end = await sharp(frames.at(-1)).raw().toBuffer();
  let best = { start: Math.max(0, frames.length - 24), difference: Infinity };
  for (let start = Math.max(0, frames.length - 36); start <= frames.length - 12; start++) {
    const sample = await sharp(frames[start]).raw().toBuffer();
    let difference = 0, area = 0;
    for (let i = 0; i < end.length; i += 4) {
      if (!end[i + 3] && !sample[i + 3]) continue;
      for (let c = 0; c < 3; c++) difference += Math.abs(end[i + c] * end[i + 3] / 255 - sample[i + c] * sample[i + 3] / 255);
      difference += Math.abs(end[i + 3] - sample[i + 3]);
      area++;
    }
    const score = difference / Math.max(1, area * 4);
    if (score < best.difference) best = { start, difference: score };
  }
  return { ...best, frames: frames.slice(best.start), width, height };
}

for (const job of jobs) {
  const name = job.replace(/-v\d+$/, ''), [actor, action] = name.split('-');
  const width = actor === 'cart' ? 320 : 240, height = actor === 'cart' ? 180 : 240;
  const source = `${root}/h3/${job}/video-1.mp4`, work = `${root}/bake/${job}`, destination = `public/editorial-motion/${actor}`;
  await mkdir(`${work}/raw`, { recursive: true });
  await mkdir(destination, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vf', `fps=${fps},scale=${width * 2}:${height * 2}:flags=lanczos`, '-frames:v', '180', `${work}/raw/%04d.png`]);
  const files = (await readdir(`${work}/raw`)).filter(file => /^\d{4}\.png$/.test(file)).sort();
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', source], { encoding: 'utf8' }));
  const expected = Math.min(180, Math.round(Number(probe.format.duration) * fps));
  const currentFiles = files.slice(0, expected);
  if (currentFiles.length < 12) throw new Error(`Too few source frames for ${job}`);
  const frames = [], reports = [];
  let rgbError = 0, rgbSamples = 0;
  const rgbGrid = actor === 'panda' ? 1 : 8;
  const indices = Array.from({ length: 16 }, (_, index) => Math.round(index * (currentFiles.length - 1) / 15));
  for (const [index, file] of currentFiles.entries()) {
    if (values.samples && !indices.includes(index)) continue;
    const raw = await sharp(`${work}/raw/${file}`).ensureAlpha().raw().toBuffer();
    const { pixels, report } = extractMatte(raw, width * 2, height * 2);
    const logical = await sharp(pixels, { raw: { width: width * 2, height: height * 2, channels: 4 } }).resize(width, height, { kernel: 'lanczos3' }).raw().toBuffer();
    // One fixed RGB grid across the whole performance; alpha remains byte-exact.
    for (let i = 0; i < logical.length; i += 4) if (logical[i + 3]) for (let c = 0; c < 3; c++) {
      const quantized = Math.min(255, Math.round(logical[i + c] / rgbGrid) * rgbGrid);
      rgbError += Math.abs(logical[i + c] - quantized); rgbSamples++;
      logical[i + c] = quantized;
    }
    const png = await sharp(logical, { raw: { width, height, channels: 4 } }).png().toBuffer();
    frames.push(png); reports.push({ index, ...report });
  }
  await contact(frames, width, height, job, values.samples ? frames.map((_, index) => index) : indices);
  if (values.samples) { console.log(`${job}: sample evidence ready`); continue; }
  await atlas(frames, width, height, `${destination}/${action}.webp`);
  const rest = await tailLoop(frames, width, height);
  await atlas(rest.frames, width, height, `${destination}/${action}-rest.webp`);
  await contact(frames, width, height, `${job}-seam`, [frames.length - 1, rest.start, rest.start + Math.floor(rest.frames.length / 2), frames.length - 1]);
  let manifest;
  try { manifest = JSON.parse(await readFile(`${destination}/manifest.json`, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; manifest = { version: 1, width, height, columns, fps, poster: 'poster.webp', clips: {} }; }
  manifest.clips[action] = { asset: `${action}.webp`, frames: frames.length, rest: `${action}-rest` };
  manifest.clips[`${action}-rest`] = { asset: `${action}-rest.webp`, frames: rest.frames.length, loop: true };
  if (action === 'arrival' || actor !== 'cart') manifest.clips.idle = { asset: `${action}-rest.webp`, frames: rest.frames.length, loop: true };
  await writeFile(`${destination}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  const bytes = (await stat(`${destination}/${action}.webp`)).size;
  const report = { job, source, sha256: createHash('sha256').update(await readFile(source)).digest('hex'), width, height, columns, fps, frames: frames.length, bytes,
    matte: 'adaptive row-border median; exterior chromatic shadow flood; palette-specific magenta removal; enclosed foreground preservation; local foreground edge reconstruction; 2x matte before downsample; lossless WebP',
    encoding: { codec: 'lossless WebP', rgbGrid, rgbMeanAbsoluteDifference: rgbError / Math.max(1, rgbSamples), rgbMaxDifference: rgbGrid === 1 ? 0 : rgbGrid / 2, alphaDifference: 0 },
    rest: { sourceStart: rest.start, frames: rest.frames.length, endpointMeanDifference: rest.difference, playback: 'forward only' }, frameReports: reports };
  await writeFile(`${evidence}/matte-${job}.json`, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ job, frames: frames.length, bytes, clippedFrames: reports.filter(frame => frame.edgePixels).length, rest: report.rest }));
}
