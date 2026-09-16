import assert from 'node:assert/strict';
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const before = process.argv.includes('--before');
const phase = before ? 'before' : 'after';
const root = 'output/bear-stories/revision-2/suitcase';
const path = (clip, frame) => before ? `${root}/before/${clip}/${frame}` : `output/bear-stories/suitcase/h3-${clip}/frames/${frame}`;
const probes = [
  { clip: 'open', frame: '0001.png', x: 105, y: 84, maxForeground: 100 },
  { clip: 'close', frame: '0066.png', x: 221, y: 141, maxForeground: 150 },
];
const results = [];
for (const probe of probes) {
  const pixels = await sharp(path(probe.clip, probe.frame)).ensureAlpha().raw().toBuffer();
  const offset = (probe.y * 480 + probe.x) * 4;
  const rgba = [...pixels.subarray(offset, offset + 4)];
  const pass = rgba[3] < 235 && Math.max(...rgba.slice(0, 3)) < probe.maxForeground;
  results.push({ ...probe, rgba, pass, condition: 'Exterior white-matte fringe must recover outline color and partial coverage.' });
}
const neighbors = [-481, -480, -479, -1, 1, 479, 480, 481];
const frames = [];
for (const clip of ['open', 'close']) for (let index = 0; index < 180; index++) {
  const frame = `${String(index + 1).padStart(4, '0')}.png`;
  const [raw, original, actual] = await Promise.all([
    sharp(`output/bear-stories/suitcase/h3-${clip}/raw/${frame}`).ensureAlpha().raw().toBuffer(),
    sharp(`${root}/before/${clip}/${frame}`).ensureAlpha().raw().toBuffer(),
    sharp(path(clip, frame)).ensureAlpha().raw().toBuffer(),
  ]);
  const metric = { clip, index, beforeFringe: 0, afterFringe: 0, interiorPixels: 0, interiorChanges: 0, creamPixels: 0, creamChanges: 0, erasedDarkPixels: 0, newForeground: 0 };
  const fringe = (pixels, p) => {
    const i = p * 4;
    if (!pixels[i + 3] || !neighbors.some(n => !pixels[(p + n) * 4 + 3])) return false;
    const alpha = pixels[i + 3] / 255;
    const rgb = [0, 1, 2].map(c => pixels[i + c] * alpha + [13, 17, 23][c] * (1 - alpha));
    return Math.max(...rgb) > 65 && Math.max(...rgb) - Math.min(...rgb) < 20;
  };
  for (let y = 2; y < 268; y++) for (let x = 2; x < 478; x++) {
    const p = y * 480 + x, i = p * 4;
    if (fringe(original, p)) metric.beforeFringe++;
    if (fringe(actual, p)) metric.afterFringe++;
    if (!original[i + 3] && actual[i + 3]) metric.newForeground++;
    if (!original[i + 3]) continue;
    if (Math.max(...raw.subarray(i, i + 3)) < 185 && !actual[i + 3]) metric.erasedDarkPixels++;
    let interior = true;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (!original[((y + dy) * 480 + x + dx) * 4 + 3]) interior = false;
    if (!interior) continue;
    metric.interiorPixels++;
    const changed = [0, 1, 2, 3].some(c => actual[i + c] !== raw[i + c]);
    if (changed) metric.interiorChanges++;
    if (raw[i] > 190 && raw[i + 1] > 180 && raw[i + 2] > 120) {
      metric.creamPixels++;
      if (changed) metric.creamChanges++;
    }
  }
  frames.push(metric);
}
const totals = frames.reduce((sum, frame) => {
  for (const key of Object.keys(sum)) sum[key] += frame[key];
  return sum;
}, { beforeFringe: 0, afterFringe: 0, interiorPixels: 0, interiorChanges: 0, creamPixels: 0, creamChanges: 0, erasedDarkPixels: 0, newForeground: 0 });
results.push({ condition: 'Across both complete clips, dark-background fringe falls by at least 80%.', pass: totals.afterFringe < totals.beforeFringe * 0.2 });
results.push({ condition: 'Interior fur, cream muzzle and NZ scenery stay byte-identical to raw frames.', pass: totals.interiorChanges === 0 && totals.creamChanges === 0 });
results.push({ condition: 'No dark foreground is erased and no new background region becomes opaque.', pass: totals.erasedDarkPixels === 0 && totals.newForeground === 0 });
await writeFile(`${root}/matte-metrics-${phase}.json`, JSON.stringify({ totals, frames }, null, 2));
await writeFile(`${root}/regression-${phase}.json`, JSON.stringify({ phase, totals, results }, null, 2));
console.log(JSON.stringify({ phase, totals, results }));
assert.ok(results.every(result => result.pass), 'Exterior gray-white pixels are still fully opaque on the dark background.');
