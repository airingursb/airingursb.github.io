import sharp from 'sharp';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { extractMatte } from './matte.mjs';

const { values } = parseArgs({ options: {
  shelf: { type: 'string' }, held: { type: 'string', default: '5' },
  returning: { type: 'string', default: '8.5' }, rest: { type: 'string', default: '13' },
  samples: { type: 'boolean', default: false }, help: { type: 'boolean', default: false },
} });
if (values.help) {
  console.log('Usage: node scripts/editorial-footer/bake-retrieval.mjs --shelf upper|lower --held 5 --returning 8.5 --rest 13 [--samples]');
  process.exit(0);
}
if (!['upper', 'lower'].includes(values.shelf)) throw new Error('Choose --shelf upper or lower');
const fps = 12, width = 320, height = 180, columns = 10;
const marks = [0, Number(values.held), Number(values.returning), Number(values.rest), 15].map(s => Math.round(s * fps));
if (marks.some((mark, i) => !Number.isFinite(mark) || (i > 0 && mark <= marks[i - 1]))) throw new Error('Clip boundaries must increase from 0 to 15 seconds');
const root = 'output/blog-small-delights';
const source = `${root}/h3/retrieve-${values.shelf}/video-1.mp4`;
const work = `${root}/bake/${values.shelf}`;
await mkdir(`${work}/raw`, { recursive: true });
await mkdir(`${root}/evidence`, { recursive: true });
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vf', `fps=${fps},scale=${width * 2}:${height * 2}:flags=lanczos`, '-frames:v', '180', `${work}/raw/%04d.png`]);
const frames = [], reports = [];
const samples = Array.from({ length: 20 }, (_, i) => Math.round(i * 179 / 19));
for (let index = 0; index < 180; index++) {
  if (values.samples && !samples.includes(index)) continue;
  const raw = await sharp(`${work}/raw/${String(index + 1).padStart(4, '0')}.png`).ensureAlpha().raw().toBuffer();
  const { pixels, report } = extractMatte(raw, width * 2, height * 2);
  const logical = await sharp(pixels, { raw: { width: width * 2, height: height * 2, channels: 4 } })
    .resize(width, height, { kernel: 'lanczos3' }).raw().toBuffer();
  for (let i = 0; i < logical.length; i += 4) if (logical[i + 3]) {
    for (let c = 0; c < 3; c++) logical[i + c] = Math.min(255, Math.round(logical[i + c] / 8) * 8);
  }
  const png = await sharp(logical, { raw: { width, height, channels: 4 } }).png().toBuffer();
  frames.push(png);
  reports.push({ index, ...report });
}
for (const [theme, background] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
  await sharp({ create: { width: width * 4, height: height * 5, channels: 3, background } })
    .composite(samples.map((frame, i) => ({ input: frames[values.samples ? i : frame], left: i % 4 * width, top: Math.floor(i / 4) * height })))
    .png().toFile(`${root}/evidence/cart-${values.shelf}-${theme}.png`);
}
if (values.samples) { console.log(`Sample contact sheets ready: ${values.shelf}`); process.exit(0); }
if (reports.some(r => r.edgePixels > 0)) throw new Error('Clipped actor: inspect edge reports before writing public assets');
const destination = 'public/editorial-motion/cart';
const manifest = JSON.parse(await readFile(`${destination}/manifest.json`, 'utf8'));
const chunks = [
  { name: `retrieve-${values.shelf}`, start: marks[0], end: marks[1], rest: `held-${values.shelf}` },
  { name: `held-${values.shelf}`, start: marks[2] - 18, end: marks[2], loop: true },
  { name: `return-${values.shelf}`, start: marks[2], end: marks[3], rest: `empty-${values.shelf}` },
  { name: `empty-${values.shelf}`, start: 168, end: marks[4], loop: true },
];
for (const chunk of chunks) {
  const selection = frames.slice(chunk.start, chunk.end);
  await sharp({ create: { width: width * columns, height: height * Math.ceil(selection.length / columns), channels: 4, background: '#00000000' } })
    .composite(selection.map((input, i) => ({ input, left: i % columns * width, top: Math.floor(i / columns) * height })))
    .webp({ lossless: true, effort: 5 }).toFile(`${destination}/${chunk.name}.webp`);
  manifest.clips[chunk.name] = { asset: `${chunk.name}.webp`, frames: selection.length,
    ...(chunk.loop ? { loop: true } : { rest: chunk.rest }) };
}
await writeFile(`${destination}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
const provenance = {
  model: 'minimax-h3-max-turbo', source, sourceSha256: createHash('sha256').update(await readFile(source)).digest('hex'),
  width, height, fps, columns, marks, chunks,
  assets: await Promise.all(chunks.map(async c => ({ name: c.name, bytes: (await stat(`${destination}/${c.name}.webp`)).size }))),
  matte: 'Existing palette-aware magenta extraction at 2x; fixed RGB8 quantization (max channel delta 4), byte-exact alpha; lossless WebP', reports,
};
await writeFile(`${root}/evidence/cart-${values.shelf}.json`, `${JSON.stringify(provenance, null, 2)}\n`);
console.log(JSON.stringify({ shelf: values.shelf, marks, assets: provenance.assets }));
