// Run: node scripts/bear-stories/workshop/pack-assets.mjs [asset-directory]
import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const source = 'output/bear-stories/revision-2/workshop/after/frames';
const destination = process.argv[2] ?? 'public/bear-stories/workshop';
const cellWidth = 384, cellHeight = 216, columns = 10;
await mkdir(destination, { recursive: true });
const names = (await readdir(source)).filter(name => /^\d+\.png$/.test(name)).sort();
if (names.length !== 181) throw new Error(`Expected 181 authored frames, received ${names.length}`);
const frames = await Promise.all(names.map(name => sharp(path.join(source, name)).png().toBuffer()));
await sharp({ create: { width: columns * cellWidth, height: Math.ceil(frames.length / columns) * cellHeight, channels: 4, background: '#00000000' } })
  .composite(frames.map((input, index) => ({ input, left: index % columns * cellWidth, top: Math.floor(index / columns) * cellHeight })))
  .webp({ lossless: true, effort: 6 }).toFile(path.join(destination, 'workshop-atlas.webp'));
await writeFile(path.join(destination, 'poster.png'), frames[0]);
await writeFile(path.join(destination, 'settled.png'), frames.at(-1));
const manifest = { asset: 'workshop-atlas.webp', fps: 12, frameCount: frames.length, columns, cellWidth, cellHeight };
await writeFile(path.join(destination, 'motion.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest));
