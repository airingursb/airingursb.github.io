import sharp from 'sharp';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const source = 'output/bear-home-study/implementation-v6/footer/raw';
const destination = 'public/bear-footer';
const width = 340, height = 240;
const region = { left: 128, top: 113, width: 94, height: 101 };
const names = (await readdir(source)).filter(name => /^\d+\.png$/.test(name)).sort();
if (names.length < 145) throw new Error('Expected 15-second H3 footer source');
await mkdir(destination, { recursive: true });

function matte(data) {
  const rgba = Buffer.alloc(width * height * 4);
  const outside = new Uint8Array(width * height);
  const queue = [];
  const visit = pixel => {
    if (outside[pixel]) return;
    const offset = pixel * 3;
    const low = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    const high = Math.max(data[offset], data[offset + 1], data[offset + 2]);
    if (low < 219 || high - low > 40) return;
    outside[pixel] = 1;
    queue.push(pixel);
  };
  for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const pixel = queue[cursor], x = pixel % width, y = Math.floor(pixel / width);
    if (x > 0) visit(pixel - 1);
    if (x < width - 1) visit(pixel + 1);
    if (y > 0) visit(pixel - width);
    if (y < height - 1) visit(pixel + width);
  }
  for (let pixel = 0; pixel < width * height; pixel++) {
    const input = pixel * 3, output = pixel * 4;
    const r = data[input], g = data[input + 1], b = data[input + 2];
    const low = Math.min(r, g, b), chroma = Math.max(r, g, b) - low;
    const alpha = outside[pixel] || (low >= 238 && chroma < 18) ? 0 : 255;
    rgba[output] = r; rgba[output + 1] = g; rgba[output + 2] = b;
    rgba[output + 3] = alpha;
  }
  const clean = Buffer.from(rgba);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const offset = (y * width + x) * 4;
    if (!rgba[offset + 3]) continue;
    let boundary = false, interiorLow = 255;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const neighbor = ((y + dy) * width + x + dx) * 4;
      if (rgba[neighbor + 3] < 32) boundary = true;
      if (rgba[neighbor + 3] > 224) interiorLow = Math.min(interiorLow, ...rgba.subarray(neighbor, neighbor + 3));
    }
    const low = Math.min(...rgba.subarray(offset, offset + 3));
    if (boundary && interiorLow < 160 && low > interiorLow + 20) {
      const coverage = Math.max(0, Math.min(1, (245 - low) / (245 - interiorLow)));
      clean[offset + 3] = Math.round(255 * coverage);
      for (let channel = 0; channel < 3; channel++) {
        clean[offset + channel] = Math.max(0, Math.min(255,
          Math.round((rgba[offset + channel] - 245 * (1 - coverage)) / Math.max(coverage, 0.01))));
      }
    }
  }
  return clean;
}

const fullFrames = [];
for (const name of names.slice(0, 150)) {
  const rgb = await sharp(path.join(source, name)).extract({ left: 160, top: 72, width: 900, height: 636 })
    .resize(width, height, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();
  fullFrames.push(matte(rgb));
}
const raw = { width, height, channels: 4 };
await sharp(fullFrames[0], { raw }).webp({ lossless: true, effort: 6 }).toFile(path.join(destination, 'poster.webp'));
const background = Buffer.from(fullFrames[0]);
for (let y = region.top; y < region.top + region.height; y++) {
  for (let x = region.left; x < region.left + region.width; x++) background[(y * width + x) * 4 + 3] = 0;
}
await sharp(background, { raw }).webp({ lossless: true, effort: 6 }).toFile(path.join(destination, 'background.webp'));
const columns = 10;
const patches = await Promise.all(fullFrames.map(frame => sharp(frame, { raw }).extract(region).png().toBuffer()));
await sharp({ create: { width: columns * region.width, height: Math.ceil(patches.length / columns) * region.height, channels: 4, background: '#00000000' } })
  .composite(patches.map((input, index) => ({ input, left: index % columns * region.width, top: Math.floor(index / columns) * region.height })))
  .webp({ quality: 75, alphaQuality: 100, effort: 6 }).toFile(path.join(destination, 'actions.webp'));
const metadata = { fps: 10, columns, cellWidth: region.width, cellHeight: region.height,
  left: region.left, top: region.top, width, height, frameCount: patches.length,
  idle: { start: 0, count: 80 }, greet: { start: 80, count: patches.length - 80 }, greetStill: 108 };
await writeFile('src/components/bear-footer/frames.json', `${JSON.stringify(metadata, null, 2)}\n`);
const evidence = 'output/bear-home-study/implementation-v6/footer/processed';
await mkdir(evidence, { recursive: true });
for (const index of [0, 20, 40, 60, 80, 100, 110, 120, 140, 149]) {
  const frame = await sharp(background, { raw }).composite([{ input: patches[index], left: region.left, top: region.top }]).png().toBuffer();
  for (const [theme, color] of [['light', '#ffffff'], ['dark', '#0d1117']]) {
    await sharp(frame).flatten({ background: color }).resize(680, 480, { kernel: 'nearest' })
      .png().toFile(path.join(evidence, `${theme}-${String(index).padStart(3, '0')}.png`));
  }
}
const bytes = Object.fromEntries(await Promise.all(['poster.webp', 'background.webp', 'actions.webp'].map(async name => [name, (await stat(path.join(destination, name))).size])));
await writeFile(path.join(evidence, 'metrics.json'), `${JSON.stringify({ ...metadata, bytes }, null, 2)}\n`);
console.log(JSON.stringify(bytes));
