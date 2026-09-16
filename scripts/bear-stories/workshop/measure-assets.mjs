// Run: node scripts/bear-stories/workshop/measure-assets.mjs <asset-dir> <report-path>
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const [directory, reportPath] = process.argv.slice(2);
if (!directory || !reportPath) throw new Error('Provide the asset directory and report path');
const { data, info } = await sharp(path.join(directory, 'workshop-atlas.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const frames = 181, width = 384, height = 216;
const pixel = (frame, x, y, channel) => data[((Math.floor(frame / 10) * height + y) * info.width + frame % 10 * width + x) * 4 + channel];
const desk = { x: 138, y: 154, width: 128, height: 10 };
let deskChanged = 0, deskSamples = 0, deskMaxMean = 0, mattePixels = 0;
for (let frame = 0; frame < frames; frame++) {
  let total = 0;
  for (let y = desk.y; y < desk.y + desk.height; y++) for (let x = desk.x; x < desk.x + desk.width; x++) {
    let difference = 0;
    for (let c = 0; c < 3; c++) difference += Math.abs(pixel(frame, x, y, c) - pixel(0, x, y, c));
    total += difference / 3;
    if (difference > 12) deskChanged++;
    deskSamples++;
  }
  deskMaxMean = Math.max(deskMaxMean, total / (desk.width * desk.height));
  // The brown head's outer contour should not contain opaque neutral white.
  for (let y = 40; y < 82; y++) for (let x = 140; x < 210; x++) {
    const rgb = [0, 1, 2].map(c => pixel(frame, x, y, c));
    if (pixel(frame, x, y, 3) < 64 || Math.min(...rgb) < 120 || Math.max(...rgb) - Math.min(...rgb) > 25) continue;
    if ([-1, 1].some(d => pixel(frame, x + d, y, 3) < 20 || pixel(frame, x, y + d, 3) < 20)) mattePixels++;
  }
}
let actionChanged = 0;
for (let frame = 1; frame < frames; frame++) for (let y = 80; y < 150; y++) for (let x = 147; x < 243; x++) {
  if ([0, 1, 2, 3].some(c => Math.abs(pixel(frame, x, y, c) - pixel(frame - 1, x, y, c)) > 12)) actionChanged++;
}
let endpointMismatches = 0, endpointMaxCompositeDifference = 0;
for (const [name, index] of [['poster.png', 0], ['settled.png', 180]]) {
  const endpoint = await sharp(path.join(directory, name)).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) for (let c = 0; c < 4; c++) {
    const offset = (y * width + x) * 4;
    const atlasAlpha = pixel(index, x, y, 3), stillAlpha = endpoint[offset + 3];
    const difference = c === 3 ? Math.abs(atlasAlpha - stillAlpha) : Math.abs(pixel(index, x, y, c) * atlasAlpha / 255 - endpoint[offset + c] * stillAlpha / 255);
    endpointMaxCompositeDifference = Math.max(endpointMaxCompositeDifference, difference);
    // Sharp's transparent atlas compositing may round a premultiplied channel by <1.
    if (difference > 1) endpointMismatches++;
  }
}
const report = { frames, desk, endpointMismatches, endpointMaxCompositeDifference, deskChangedFraction: deskChanged / deskSamples, deskMaxMean, brownContourNeutralPixels: mattePixels, actionChangedPixels: actionChanged, pass: endpointMismatches === 0 && deskChanged === 0 && mattePixels === 0 && actionChanged > 10000 };
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
if (!report.pass) process.exitCode = 1;
