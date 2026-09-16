import assert from 'node:assert/strict';
import test from 'node:test';
import { removeMatte } from './matte.mjs';

test('two-pixel compressed white fringe does not remain pale over a dark page', () => {
  const size = 12;
  const rgb = Buffer.alloc(size * size * 3, 245);
  for (let y = 2; y < 10; y++) for (let x = 2; x < 10; x++) {
    const edge = Math.min(x - 2, y - 2, 9 - x, 9 - y);
    const color = edge === 0 ? [205, 205, 205] : edge === 1 ? [160, 160, 160] : [70, 55, 40];
    rgb.set(color, (y * size + x) * 3);
  }
  const rgba = removeMatte(rgb, size, size);
  const edge = (5 * size + 2) * 4;
  assert.ok(rgba[edge + 3] < 128, `outer fringe alpha ${rgba[edge + 3]} makes the white matte visible`);
  assert.ok(Math.max(...rgba.subarray(edge, edge + 3)) < 130, 'unmixed edge must retain the subject colour, not white RGB');
});

test('cream muzzle and enclosed cream flowers remain opaque', () => {
  const size = 7;
  const rgb = Buffer.alloc(size * size * 3, 245);
  for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) rgb.set([65, 50, 36], (y * size + x) * 3);
  rgb.set([249, 237, 200], (3 * size + 3) * 3);
  const rgba = removeMatte(rgb, size, size);
  assert.deepEqual([...rgba.subarray((3 * size + 3) * 4, (3 * size + 3) * 4 + 4)], [249, 237, 200, 255]);
});

test('pale compression specks above the bear and inside bench gaps stay transparent', () => {
  const width = 340, height = 240;
  const rgb = Buffer.alloc(width * height * 3, 245);
  rgb.set([244, 250, 255], (119 * width + 148) * 3);
  rgb.set([252, 244, 225], (170 * width + 100) * 3);
  rgb.set([235, 249, 252], (184 * width + 226) * 3);
  const rgba = removeMatte(rgb, width, height);
  assert.equal(rgba[(119 * width + 148) * 4 + 3], 0, 'compressed cyan background above the head is not a water droplet');
  assert.equal(rgba[(170 * width + 100) * 4 + 3], 0, 'warm compressed background in the bench slit is not a cream flower');
  assert.equal(rgba[(184 * width + 226) * 4 + 3], 255, 'the real cyan water region retains pale water');
});

test('pale highlights supported by cyan water do not become holes', () => {
  const width = 340, height = 240;
  const rgb = Buffer.alloc(width * height * 3, 245);
  rgb.set([245, 252, 252], (185 * width + 233) * 3);
  rgb.set([125, 203, 222], (185 * width + 232) * 3);
  rgb.set([125, 203, 222], (186 * width + 233) * 3);
  rgb.set([60, 58, 45], (184 * width + 234) * 3);
  const rgba = removeMatte(rgb, width, height);
  assert.deepEqual([...rgba.subarray((185 * width + 233) * 4, (185 * width + 233) * 4 + 4)], [245, 252, 252, 255]);
});
