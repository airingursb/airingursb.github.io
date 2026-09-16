import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const frames = JSON.parse(await readFile('src/components/bear-stories/garden/frames.json', 'utf8'));
const atlas = await sharp('public/bear-footer/garden-actions.webp').ensureAlpha().raw().toBuffer();
const atlasWidth = frames.columns * frames.cellWidth;
function pixel(frame, x, y) {
  const offset = ((Math.floor(frame / frames.columns) * frames.cellHeight + y - frames.top) * atlasWidth
    + frame % frames.columns * frames.cellWidth + x - frames.left) * 4;
  return atlas.subarray(offset, offset + 4);
}

test('Given reading, watering and returned poses, when decoded, then the warm muzzle remains solid', () => {
  for (const [frame, box] of [[0,[162,153,22,25]], [60,[232,161,25,25]], [149,[161,151,25,28]]]) {
    let cream = 0;
    for (let y = box[1]; y < box[1] + box[3]; y++) for (let x = box[0]; x < box[0] + box[2]; x++) {
      const [r,g,b,a] = pixel(frame,x,y);
      if (r > 215 && g > 190 && b > 140 && r - b > 15 && a === 255) cream++;
    }
    assert.ok(cream >= 40, `Frame ${frame} lost solid muzzle detail (${cream} pixels)`);
  }
});

test('Given the original seated body, when care starts and ends, then the book and lower body do not become holes', () => {
  for (const frame of [0,149]) for (const [x,y] of [[172,187],[157,198],[184,198]]) {
    assert.equal(pixel(frame,x,y)[3],255, `Frame ${frame} has a hole at ${x},${y}`);
  }
});

test('Given the original footer, when the garden stage is built, then fixed scene geometry stays unchanged', async () => {
  const original = await sharp('public/bear-footer/poster.webp').ensureAlpha().raw().toBuffer();
  const stage = await sharp('public/bear-footer/garden-background.webp').ensureAlpha().raw().toBuffer();
  for (let y = 0; y < 240; y++) for (let x = 0; x < 340; x++) {
    if ((x >= 135 && x <= 207 && y >= 130 && y <= 214) || (x >= 278 && x <= 305 && y >= 197 && y <= 226)) continue;
    const offset = (y * 340 + x) * 4;
    assert.equal(stage[offset+3],original[offset+3],`Scene alpha moved at ${x},${y}`);
    if (!original[offset+3]) continue;
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(stage[offset+channel]-original[offset+channel]) <= 1);
  }
});

test('Given a watering pose, when composited on dark, then bench gaps and the bear outline contain no opaque matte', () => {
  for (const [x,y] of [[186,179],[190,179],[193,180],[186,193],[204,193],[211,191],[217,190]]) {
    assert.ok(pixel(70,x,y)[3] < 80, `Opaque matte at ${x},${y}: ${[...pixel(70,x,y)]}`);
  }
});

test('Given generated stationary props, when isolated, then their white backdrop is transparent', async () => {
  for (const [file,points] of [
    ['garden-can.webp',[[272,198],[254,200],[255,224]]],
    ['garden-background.webp',[[304,212]]],
  ]) {
    const rgba = await sharp(`public/bear-footer/${file}`).ensureAlpha().raw().toBuffer();
    for (const [x,y] of points) assert.ok(rgba[(y*340+x)*4+3] < 80, `${file} retains matte at ${x},${y}`);
  }
});

test('Given the bright muzzle next to the watering can, when matte is removed, then cream remains solid', () => {
  assert.deepEqual([...pixel(70,243,179)], [249,245,228,255]);
});

test('Given the repaired empty bench, when keyed, then its top edge has no opaque pale stripe', async () => {
  const rgba = await sharp('public/bear-footer/garden-background.webp').ensureAlpha().raw().toBuffer();
  const offset = (166*340+150)*4;
  assert.ok(rgba[offset+3] < 128, `Bench edge opacity ${rgba[offset+3]}`);
  assert.ok(Math.max(...rgba.subarray(offset,offset+3)) < 145, 'Bench edge retains white-matte RGB');
});

test('Given the bear bending to retrieve its book, when masked, then its left cheek remains intact', () => {
  assert.equal(pixel(120,125,155)[3],255,'The returning bear is clipped by the seated-pose mask boundary');
});

test('Given warm matte in a bench slit, when cream is preserved, then the slit stays transparent', () => {
  assert.ok(pixel(40,175,179)[3] < 80,'A thin warm background stripe was mistaken for a cream detail');
});
