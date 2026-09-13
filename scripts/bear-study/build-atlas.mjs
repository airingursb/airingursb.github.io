import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  console.error('Usage: node scripts/bear-study/build-atlas.mjs <raw-frame-directory> <output-directory>');
  process.exit(1);
}

const names = (await readdir(source)).filter(name => /^\d+\.png$/.test(name)).sort();
if (names.length < 170) throw new Error('Expected the 12 fps H3 idle pilot frames');
await mkdir(destination, { recursive: true });

const width = 464;
const height = 272;
const start = 29;
const end = 169;
const cellWidth = 232;
const cellHeight = 136;
const columns = 10;
const frameCount = end - start;
const rows = Math.ceil(frameCount / columns);
const first = await sharp(path.join(source, names[start])).removeAlpha().raw().toBuffer();

// The laptop and keyboard are foreground occluders; paws animate behind them.
const laptop = [[267, 144], [351, 144], [338, 208], [206, 208], [206, 194], [252, 194]];
function inLaptop(x, y) {
  let inside = false;
  for (let i = 0, j = laptop.length - 1; i < laptop.length; j = i++) {
    const [xi, yi] = laptop[i];
    const [xj, yj] = laptop[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function matteAndFreeze(rgb) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // The tilted ear reaches x=108; include margin around the entire head motion.
      const moving = x >= 96 && x < 329 && y >= 16 && y < 205;
      const cup = x < 138 && y >= 160;
      const pixels = moving && !cup && !inLaptop(x, y) ? rgb : first;
      const input = (y * width + x) * 3;
      const output = (y * width + x) * 4;
      const red = pixels[input];
      const green = pixels[input + 1];
      const blue = pixels[input + 2];
      const low = Math.min(red, green, blue);
      const chroma = Math.max(red, green, blue) - low;
      const alpha = chroma < 26 ? Math.round(255 * Math.max(0, Math.min(1, (229 - low) / 12))) : 255;
      rgba[output] = red;
      rgba[output + 1] = green;
      rgba[output + 2] = blue;
      rgba[output + 3] = alpha;
    }
  }
  const clean = Buffer.from(rgba);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const offset = (y * width + x) * 4;
      if (!rgba[offset + 3]) continue;
      let boundary = false;
      let interiorLow = 255;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const neighbor = ((y + dy) * width + x + dx) * 4;
        if (rgba[neighbor + 3] < 32) boundary = true;
        if (rgba[neighbor + 3] > 224) interiorLow = Math.min(interiorLow, ...rgba.subarray(neighbor, neighbor + 3));
      }
      const low = Math.min(...rgba.subarray(offset, offset + 3));
      if (boundary && interiorLow < 110 && low > interiorLow + 20) {
        const coverage = Math.max(0, Math.min(1, (245 - low) / (245 - interiorLow)));
        clean[offset + 3] = Math.round(255 * coverage);
        for (let channel = 0; channel < 3; channel++) {
          clean[offset + channel] = Math.max(0, Math.min(255,
            Math.round((rgba[offset + channel] - 245 * (1 - coverage)) / Math.max(coverage, 0.01))));
        }
      }
    }
  }
  return clean;
}

const frames = [];
for (const name of names.slice(start, end)) {
  const { data, info } = await sharp(path.join(source, name)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== width || info.height !== height) throw new Error(`Unexpected frame size: ${name}`);
  const frame = await sharp(matteAndFreeze(data), { raw: { width, height, channels: 4 } })
    .resize(cellWidth, cellHeight, { kernel: 'nearest' }).png().toBuffer();
  frames.push(frame);
}

await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 4, background: '#00000000' } })
  .composite(frames.map((input, index) => ({ input, left: index % columns * cellWidth, top: Math.floor(index / columns) * cellHeight })))
  .webp({ lossless: true, effort: 6 }).toFile(path.join(destination, 'typing.webp'));
await writeFile(path.join(destination, 'poster.png'), frames[0]);
await writeFile(new URL('../../src/assets/bear-study/typing.json', import.meta.url), JSON.stringify({
  version: 1, asset: 'typing.webp', fallback: 'poster.png', fps: 12,
  frameCount, columns, rows, cellWidth, cellHeight,
  sourceStartFrame: start, sourceEndFrame: end,
  loopSeconds: frameCount / 12,
}, null, 2) + '\n');

const firstPixels = await sharp(frames[0]).raw().toBuffer();
const lastPixels = await sharp(frames.at(-1)).raw().toBuffer();
let seamError = 0;
let visible = 0;
for (let i = 0; i < firstPixels.length; i += 4) {
  if (firstPixels[i + 3] || lastPixels[i + 3]) {
    for (let c = 0; c < 4; c++) seamError += Math.abs(firstPixels[i + c] - lastPixels[i + c]);
    visible++;
  }
}
const atlas = await sharp(path.join(destination, 'typing.webp')).metadata();
console.log(JSON.stringify({ frameCount, duration: frameCount / 12, hasAlpha: atlas.hasAlpha,
  width: atlas.width, height: atlas.height, seamMeanError: seamError / (visible * 4 * 255) }, null, 2));
