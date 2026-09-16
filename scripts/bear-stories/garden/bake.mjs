import sharp from 'sharp';
import { removeMatte } from './matte.mjs';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'output/bear-stories/garden';
const destination = 'public/bear-stories/garden';
const width = 340, height = 240;
const region = { left: 96, top: 108, width: 232, height: 124 };
const plant = { left: 194, top: 128, width: 72, height: 72, anchorX: 230, anchorY: 190 };
const files = (await readdir(`${root}/h3-v2/stable`)).filter(name => /^frame-\d+\.png$/.test(name)).sort();
if (files.length !== 150) throw new Error(`Expected 150 registered frames, got ${files.length}`);
await mkdir(destination, { recursive: true });
await mkdir(`${root}/processed`, { recursive: true });


const raw = { width, height, channels: 4 };
const fullFrames = [];
for (const file of files) {
  const rgb = await sharp(`${root}/h3-v2/stable/${file}`).removeAlpha().raw().toBuffer();
  fullFrames.push(removeMatte(rgb, width, height));
}
await sharp(fullFrames[0], { raw }).webp({ lossless: true }).toFile(`${destination}/poster.webp`);
const background = Buffer.from(fullFrames[0]);
for (let y = region.top; y < region.top + region.height; y += 1) for (let x = region.left; x < region.left + region.width; x += 1) background[(y * width + x) * 4 + 3] = 0;
await sharp(background, { raw }).webp({ lossless: true }).toFile(`${destination}/background.webp`);
const patches = await Promise.all(fullFrames.map(frame => sharp(frame, { raw }).extract(region).png().toBuffer()));
const atlasWidth = region.width * 10, atlasHeight = region.height * 15;
const atlas = await sharp({ create: { width: atlasWidth, height: atlasHeight, channels: 4, background: '#00000000' } })
  .composite(patches.map((input, index) => ({ input, left: index % 10 * region.width, top: Math.floor(index / 10) * region.height })))
  .raw().toBuffer();
// One colour grid for every frame bounds RGB error at 2/255 and keeps alpha exact.
for (let pixel = 0; pixel < atlas.length; pixel += 4) for (let channel = 0; channel < 3; channel += 1) {
  atlas[pixel + channel] = Math.min(255, Math.round(atlas[pixel + channel] / 4) * 4);
}
await sharp(atlas, { raw: { width: atlasWidth, height: atlasHeight, channels: 4 } })
  .webp({ lossless: true, effort: 6 }).toFile(`${destination}/actions.webp`);
for (const [index, name] of ['sprout', 'bud', 'bloom'].entries()) {
  await sharp(`${root}/assets/growth-sheet.png`).extract({ left: index * 724, top: 0, width: 724, height: 724 })
    .resize(72, 72, { kernel: 'nearest' }).png().toFile(`${destination}/${name}.png`);
}
const metadata = { fps: 10, frameCount: 150, columns: 10, width, height, left: region.left, top: region.top, cellWidth: region.width, cellHeight: region.height, plant };
await writeFile('src/components/bear-stories/garden/frames.json', `${JSON.stringify(metadata, null, 2)}\n`);
for (const [theme, color] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
  const contact = [];
  for (const [slot, frame] of [0, 20, 40, 60, 80, 90, 110, 130, 149].entries()) {
    const rendered = await sharp(background, { raw }).composite([{ input: patches[frame], left: region.left, top: region.top }]).png().toBuffer();
    await sharp(rendered).flatten({ background: color }).resize(680, 480, { kernel: 'nearest' }).png().toFile(`${root}/processed/${theme}-${frame}.png`);
    contact.push({ input: rendered, left: slot % 3 * width, top: Math.floor(slot / 3) * height });
  }
  await sharp({ create: { width: width * 3, height: height * 3, channels: 3, background: color } }).composite(contact).png().toFile(`${root}/processed/contact-${theme}.png`);
}
const sizes = Object.fromEntries(await Promise.all(['poster.webp', 'background.webp', 'actions.webp', 'sprout.png', 'bud.png', 'bloom.png'].map(async name => [name, (await stat(join(destination, name))).size])));
await writeFile(`${root}/processed/bake-report.json`, `${JSON.stringify({ ...metadata, sizes, source: 'h3-v2', task: 'task_01M2M7MYK9R7CSPTRK21HH8SAH', method: 'SIFT canopy registration; frozen environment; authored moving region; palette-aware matte with neutral-edge decontamination; fixed 4-step RGB grid with exact alpha; lossless WebP action atlas; generated alpha growth sprites' }, null, 2)}\n`);
console.log(JSON.stringify(sizes));
