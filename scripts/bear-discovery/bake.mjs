import sharp from 'sharp';
import { mkdir, readdir, writeFile, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const names = process.argv.slice(2);
if (!names.length || names.some(name => !['lost'].includes(name))) throw new Error('Usage: node scripts/bear-discovery/bake.mjs lost');
const neighbors = (p, w, h) => {
  const x = p % w, y = Math.floor(p / w), result = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if ((dx || dy) && x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) result.push((y + dy) * w + x + dx);
  }
  return result;
};
for (const name of names) {
  const root = `output/bear-discovery/${name}`;
  await mkdir(`${root}/raw`, { recursive: true });
  await mkdir(`${root}/frames`, { recursive: true });
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${root}/video-1.mp4`, '-vf', 'fps=12,scale=384:288:flags=neighbor', '-frames:v', '180', `${root}/raw/%04d.png`]);
  const files = (await readdir(`${root}/raw`)).filter(f => f.endsWith('.png')).sort();
  if (files.length !== 180) throw new Error(`Expected 180 frames, got ${files.length}`);
  const layers = [], report = [];
  for (const [frame, file] of files.entries()) {
    const { data, info: { width: w, height: h } } = await sharp(`${root}/raw/${file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const visited = new Uint8Array(w * h), queue = [];
    for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
    for (let at = 0; at < queue.length; at++) {
      const p = queue[at]; if (visited[p]) continue; visited[p] = 1;
      const i = p * 4, max = Math.max(data[i], data[i + 1], data[i + 2]), min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (max < 125 || max - min > 65) continue;
      data[i + 3] = 0;
      queue.push(...neighbors(p, w, h));
    }
    const pixels = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract({ left: 64, top: 0, width: 256, height: 288 }).resize(128, 144, { kernel: 'nearest' }).raw().toBuffer();
    const seen = new Uint8Array(128 * 144); let largest = [];
    for (let p = 0; p < 128 * 144; p++) {
      if (seen[p] || !pixels[p * 4 + 3]) continue;
      const group = [p]; seen[p] = 1;
      for (let at = 0; at < group.length; at++) for (const n of neighbors(group[at], 128, 144)) {
        if (!seen[n] && pixels[n * 4 + 3]) { seen[n] = 1; group.push(n); }
      }
      if (group.length > largest.length) largest = group;
    }
    const keep = new Set(largest); let cleaned = 0, removed = 0;
    for (let p = 0; p < 128 * 144; p++) {
      const i = p * 4;
      if (!keep.has(p)) { if (pixels[i + 3]) removed++; pixels[i + 3] = 0; continue; }
      const ns = neighbors(p, 128, 144), max = Math.max(...pixels.subarray(i, i + 3)), min = Math.min(...pixels.subarray(i, i + 3));
      if (ns.some(n => !keep.has(n)) && max > 135 && max - min < 85) {
        const dark = ns.filter(n => keep.has(n) && Math.max(...pixels.subarray(n * 4, n * 4 + 3)) < 110);
        if (dark.length) {
          const n = dark.reduce((a, b) => pixels[a * 4] < pixels[b * 4] ? a : b);
          for (let c = 0; c < 3; c++) pixels[i + c] = pixels[n * 4 + c];
          cleaned++;
        }
      }
    }
    const png = await sharp(pixels, { raw: { width: 128, height: 144, channels: 4 } }).png().toBuffer();
    await writeFile(`${root}/frames/${file}`, png);
    layers.push({ input: png, left: frame % 12 * 128, top: Math.floor(frame / 12) * 144 });
    report.push({ frame, area: largest.length, cleaned, removed, touchesEdge: largest.some(p => p % 128 === 0 || p % 128 === 127 || p < 128 || p >= 128 * 143) });
  }
  const atlas = await sharp({ create: { width: 1536, height: 2160, channels: 4, background: '#00000000' } }).composite(layers).webp({ lossless: true }).toBuffer();
  await writeFile(`public/bear-discovery/${name}-atlas.webp`, atlas);
  await copyFile(`${root}/frames/0001.png`, `public/bear-discovery/${name}-poster.png`);
  await writeFile(`${root}/bake-report.json`, JSON.stringify(report, null, 2));
  for (const [theme, color] of [['dark', '#0d1117'], ['light', '#ffffff']]) {
    await sharp({ create: { width: 1536, height: 2160, channels: 3, background: color } }).composite([{ input: atlas, left: 0, top: 0 }]).png().toFile(`${root}/all-${theme}.png`);
    const contact = [0, 35, 65, 90, 120, 150, 179].map((frame, n) => ({ input: layers[frame].input, left: n * 128, top: 0 }));
    await sharp({ create: { width: 896, height: 144, channels: 3, background: color } }).composite(contact).png().toFile(`${root}/contact-${theme}.png`);
  }
  console.log({ name, frames: files.length, bytes: atlas.length, clippedFrames: report.filter(r => r.touchesEdge).length });
}
