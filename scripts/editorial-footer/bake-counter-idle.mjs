import sharp from 'sharp';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { extractMatte } from './matte.mjs';

const { values } = parseArgs({ options: { help: { type: 'boolean', default: false } } });
if (values.help) {
  console.log('Usage: node scripts/editorial-footer/bake-counter-idle.mjs\nRebuilds the reviewed counter idle video into a 96-frame transparent atlas and writes all-frame matte evidence. Run from the repository root.');
  process.exit(0);
}

// Rebuild only the dedicated eight-second counter idle; success media is immutable.
const root = 'output/editorial-footer-v2/h3/counter-idle';
const destination = 'public/editorial-motion/counter';
const source = `${root}/video-1.mp4`;
const width = 240, height = 240, columns = 10, fps = 12, frameCount = 96;
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const preserved = {};
for (const name of ['poster.webp', 'subscribe.webp', 'subscribe-rest.webp']) {
  preserved[name] = hash(await readFile(`${destination}/${name}`));
}
await mkdir(`${root}/bake`, { recursive: true });
const rawDirectory = await mkdtemp(`${root}/bake/raw-`);
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,r_frame_rate', '-of', 'json', source], { encoding: 'utf8' }));
assert.equal(Math.round(Number(probe.format.duration) * fps), frameCount, 'Source must contain eight seconds');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', source, '-vf', `fps=${fps},scale=${width * 2}:${height * 2}:flags=lanczos`, '-frames:v', String(frameCount), `${rawDirectory}/%04d.png`]);
const files = (await readdir(rawDirectory)).filter(file => /^\d{4}\.png$/.test(file)).sort();
assert.equal(files.length, frameCount, 'Source must decode to 96 frames at 12fps');
const frames = [], logicalFrames = [], frameReports = [];
let rgbDifference = 0, rgbSamples = 0;
for (const [index, file] of files.entries()) {
  const raw = await sharp(`${rawDirectory}/${file}`).ensureAlpha().raw().toBuffer();
  const { pixels, report } = extractMatte(raw, width * 2, height * 2);
  assert.equal(report.edgePixels, 0, `Clipping in frame ${index}`);
  const logical = await sharp(pixels, { raw: { width: width * 2, height: height * 2, channels: 4 } }).resize(width, height, { kernel: 'lanczos3' }).raw().toBuffer();
  for (let i = 0; i < logical.length; i += 4) if (logical[i + 3]) for (let c = 0; c < 3; c++) {
    const quantized = Math.min(255, Math.round(logical[i + c] / 8) * 8);
    rgbDifference += Math.abs(logical[i + c] - quantized);
    rgbSamples++;
    logical[i + c] = quantized;
  }
  logicalFrames.push(logical);
  frames.push(await sharp(logical, { raw: { width, height, channels: 4 } }).png().toBuffer());
  frameReports.push({ index, ...report });
}

const contactGroups = Array.from({ length: 4 }, (_, group) => ({ name: `all-${group + 1}`, indices: Array.from({ length: 24 }, (_, offset) => group * 24 + offset), columns: 6 }));
contactGroups.push({ name: 'seam', indices: [90, 91, 92, 93, 94, 95, 0, 1, 2, 3, 4, 5], columns: 6 });
for (const group of contactGroups) for (const [theme, background] of [['dark', '#111318'], ['light', '#f8f7f2']]) {
  await sharp({ create: { width: width * group.columns, height: height * Math.ceil(group.indices.length / group.columns), channels: 3, background } })
    .composite(group.indices.map((frame, index) => ({ input: frames[frame], left: index % group.columns * width, top: Math.floor(index / group.columns) * height })))
    .png().toFile(`${root}/bake/${group.name}-${theme}.png`);
}

await sharp({ create: { width: width * columns, height: height * Math.ceil(frameCount / columns), channels: 4, background: '#00000000' } })
  .composite(frames.map((input, index) => ({ input, left: index % columns * width, top: Math.floor(index / columns) * height })))
  .webp({ lossless: true, effort: 5 }).toFile(`${destination}/idle.webp`);
const decoded = await sharp(`${destination}/idle.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
assert.equal(decoded.info.width, width * columns);
assert.equal(decoded.info.height, height * Math.ceil(frameCount / columns));
let alphaDifference = 0;
for (const [index, logical] of logicalFrames.entries()) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const original = (y * width + x) * 4 + 3;
    const atlas = (((Math.floor(index / columns) * height + y) * decoded.info.width) + index % columns * width + x) * 4 + 3;
    alphaDifference += Math.abs(logical[original] - decoded.data[atlas]);
  }
}
assert.equal(alphaDifference, 0, 'Lossless atlas must preserve all alpha samples');
const differences = [];
for (let index = 0; index < frameCount; index++) {
  const a = logicalFrames[index], b = logicalFrames[(index + 1) % frameCount];
  let difference = 0, area = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3] && !b[i + 3]) continue;
    for (let c = 0; c < 3; c++) difference += Math.abs(a[i + c] * a[i + 3] / 255 - b[i + c] * b[i + 3] / 255);
    difference += Math.abs(a[i + 3] - b[i + 3]);
    area++;
  }
  differences.push(difference / Math.max(1, area * 4));
}
for (const [name, original] of Object.entries(preserved)) assert.equal(hash(await readFile(`${destination}/${name}`)), original, `${name} must remain unchanged`);
const manifest = JSON.parse(await readFile(`${destination}/manifest.json`, 'utf8'));
assert.deepEqual([manifest.width, manifest.height, manifest.columns, manifest.fps], [width, height, columns, fps]);
manifest.clips.idle = { asset: 'idle.webp', frames: frameCount, loop: true };
await writeFile(`${destination}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
const report = {
  source, sourceSha256: hash(await readFile(source)), probe,
  width, height, columns, fps, frames: frameCount, loop: true,
  atlas: { path: `${destination}/idle.webp`, bytes: (await stat(`${destination}/idle.webp`)).size, sha256: hash(await readFile(`${destination}/idle.webp`)) },
  preserved,
  encoding: { codec: 'lossless WebP', rgbGrid: 8, rgbMeanAbsoluteDifference: rgbDifference / rgbSamples, rgbMaxDifference: 4, alphaDifference },
  uniqueFrameHashes: new Set(logicalFrames.map(hash)).size,
  seamEndpointMeanDifference: differences.at(-1), frameAdjacentMeanDifferences: differences,
  matte: 'Existing adaptive row-border matte at 480px before 240px downsample; enclosed paper preservation; local edge spill reconstruction',
  rawDirectory, frameReports,
};
await writeFile(`${root}/bake/report.json`, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ frames: frameCount, ...report.atlas, uniqueFrames: report.uniqueFrameHashes, seam: report.seamEndpointMeanDifference, alphaDifference }));
