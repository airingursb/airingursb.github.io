import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { removeMatte } from './matte.mjs';

const sourceRoot = new URL('../../../output/bear-stories/wind/', import.meta.url);
const load = async (clip, frame) => sharp(fileURLToPath(new URL(`${clip}/raw/${String(frame).padStart(4, '0')}.png`, sourceRoot))).ensureAlpha().raw().toBuffer();
const offset = (x, y) => (y * 320 + x) * 4;

for (const clip of ['gust-right', 'paperweight-fixed', 'window']) {
  test(`preserves the cream pot interior throughout every ${clip} frame`, async () => {
    // Given: the accepted source clip contains the pot at this observed interior region.
    const failures = [];
    for (let frame = 1; frame <= 180; frame++) {
      const pixels = await load(clip, frame);
      // When: the same matte operation used by the asset bake is applied.
      removeMatte(pixels, 320, 192);
      let missing = 0;
      for (let y = 127; y <= 132; y++) {
        for (let x = 231; x <= 238; x++) missing += pixels[offset(x, y) + 3] === 0 ? 1 : 0;
      }
      if (missing) failures.push({ frame, missing });
    }
    // Then: the visible source pot has no transparent interior holes.
    assert.equal(failures.length, 0, `${clip}: ${failures.length} frames erase pot pixels; ${JSON.stringify(failures.slice(0, 8))}`);
  });
}

test('keeps identical cream pot pixels opaque across the former window flicker', async () => {
  // Given: the same source RGB survives all four consecutive frames.
  const frames = await Promise.all([160, 161, 162, 163].map(frame => load('window', frame)));
  for (const pixels of frames) assert.deepEqual(Array.from(pixels.subarray(offset(234, 128), offset(234, 128) + 3)), [249, 237, 209]);
  // When: each complete source frame is matted.
  for (const pixels of frames) removeMatte(pixels, 320, 192);
  // Then: alpha cannot alternate while the cream fill remains unchanged.
  assert.deepEqual(frames.map(pixels => pixels[offset(234, 128) + 3]), [255, 255, 255, 255]);
});

test('removes pale neutral fringe from observed dark-outline edges', async () => {
  // Given: these source pixels are white-matte mixtures beside the ear and curtain outlines.
  const pixels = await load('gust-right', 73);
  const points = [[143, 62], [152, 61], [178, 53], [166, 57]];
  // When: the outline is separated from its white source background.
  removeMatte(pixels, 320, 192);
  // Then: each boundary sample is transparent or an opaque dark outline, not a light halo.
  for (const [x, y] of points) {
    const at = offset(x, y);
    assert.ok(pixels[at + 3] === 0 || Math.max(...pixels.subarray(at, at + 3)) < 80, `Light fringe remains at (${x},${y}): ${pixels.subarray(at, at + 4).join(',')}`);
  }
});

test('retains cream sheet interiors and their original colors', async () => {
  // Given: two detached flying pages have warm pale interiors.
  const pixels = await load('gust-right', 73);
  const points = [[42, 72], [82, 42]];
  const original = points.map(([x, y]) => Buffer.from(pixels.subarray(offset(x, y), offset(x, y) + 4)));
  // When: the surrounding white matte is removed.
  removeMatte(pixels, 320, 192);
  // Then: both page interiors stay opaque and keep their source color.
  for (const [index, [x, y]] of points.entries()) assert.deepEqual(pixels.subarray(offset(x, y), offset(x, y) + 4), original[index]);
});

test('cleans a fringe pixel whose neighboring outline also contains white matte', async () => {
  // Given: the source has a two-pixel gray fringe on the top edge of the head.
  const pixels = await load('gust-right', 4);
  // When: the complete boundary is decontaminated.
  removeMatte(pixels, 320, 192);
  // Then: the outer sample matches the dark contour instead of flashing gray.
  const at = offset(148, 66);
  assert.ok(pixels[at + 3] === 0 || Math.max(...pixels.subarray(at, at + 3)) < 80, `Second fringe remains: ${pixels.subarray(at, at + 4).join(',')}`);
});

test('preserves the faint breath cloud where it overlaps the face', async () => {
  // Given: the source cloud crosses the cheek in four consecutive frames.
  const frames = await Promise.all([134, 135, 136, 137].map(frame => load('window', frame)));
  const originals = frames.map(pixels => Buffer.from(pixels));
  // When: its neutral midtones are separated from the brighter source background.
  for (const pixels of frames) removeMatte(pixels, 320, 192);
  // Then: the cloud-covered face remains filled with the original source pixels.
  for (const [frame, pixels] of frames.entries()) {
    for (let y = 101; y <= 105; y++) {
      for (let x = 125; x <= 136; x++) {
        const at = offset(x, y);
        assert.deepEqual(pixels.subarray(at, at + 4), originals[frame].subarray(at, at + 4), `Cloud hole in frame ${134 + frame} at (${x},${y})`);
      }
    }
  }
});
