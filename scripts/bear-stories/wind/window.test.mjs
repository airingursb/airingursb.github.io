import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { removeMatte } from './matte.mjs';
import { loadWindowLayers, repairWindow, windowRegion } from './window-layer.mjs';

const read = file => sharp(file).ensureAlpha().raw().toBuffer();
const pixel = (pixels, x, y) => [...pixels.subarray((y * 320 + x) * 4, (y * 320 + x) * 4 + 4)];

test('open window stays attached to the right jamb inside the opening', async () => {
  // Given the actual acceptance poster, including the encoded alpha channel.
  const poster = await read('public/bear-stories/wind/gust-poster.png');
  // When the area beyond the jamb is inspected.
  for (let y = 42; y <= 103; y++) {
    for (let x = 261; x < 284; x++) assert.equal(pixel(poster, x, y)[3], 0, `Detached pane at ${x},${y}`);
  }
  // Then the fixed jamb is opaque and the shortened free edge is inside it.
  assert.equal(pixel(poster, 258, 71)[3], 255);
  const aboveEdge = pixel(poster, 242, 50);
  const freeEdge = pixel(poster, 242, 71);
  assert.ok(aboveEdge[2] > aboveEdge[0], 'Sky remains above the receding free edge');
  assert.ok(freeEdge[0] > freeEdge[2], 'Wooden free edge projects inside the opening');
});

test('only the closing branch fills the window opening with reflected glass at rest', async () => {
  for (const clip of ['gust', 'paperweight', 'window']) {
    const rest = await read(`public/bear-stories/wind/${clip}-rest.png`);
    let reflected = 0;
    for (let y = 55; y <= 91; y++) for (let x = 222; x <= 238; x++) {
      const [r, g, b, a] = pixel(rest, x, y);
      assert.equal(a, 255);
      if (r > 200 && g > 220 && b > 220) reflected++;
    }
    assert.ok(clip === 'window' ? reflected > 100 : reflected < 30, `${clip}: ${reflected} reflected-glass pixels`);
  }
});

test('right curtain no longer hides the hinge or grows through the glass', async () => {
  // Given: the accepted poster shows the original moving left curtain.
  const poster = await read('public/bear-stories/wind/gust-poster.png');
  // When: the former right-curtain area is inspected.
  const green = [];
  for (let y = 44; y <= 102; y++) {
    for (let x = 222; x <= 259; x++) {
      const [r, g, b, a] = pixel(poster, x, y);
      if (a && g > r + 5 && g > b + 7) green.push([x, y]);
    }
  }
  // Then: the visible opening and jamb have no remaining cloth fragments.
  assert.equal(green.length, 0, `Cloth remains at ${JSON.stringify(green.slice(0, 5))}`);
});

for (const [clip, directory] of [['gust', 'gust-right'], ['paperweight', 'paperweight-fixed'], ['window', 'window']]) {
  test(`all 180 shipped ${clip} frames keep source alpha, pot and moving left cloth`, async () => {
    // Given: the complete accepted source and the encoded public atlas.
    const layers = await loadWindowLayers();
    const atlas = await sharp(`public/bear-stories/wind/${clip}-atlas.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(atlas.info.width, 3840);
    assert.equal(atlas.info.height, 2880);
    let alphaMismatch = 0, outsideDifference = 0, potMissing = 0, clothDifference = 0;
    for (let frame = 1; frame <= 180; frame++) {
      const source = await read(`output/bear-stories/wind/${directory}/raw/${String(frame).padStart(4, '0')}.png`);
      removeMatte(source, 320, 192);
      const final = Buffer.from(source);
      // When: the production window repair is applied and compared with shipped alpha.
      repairWindow(final, clip, frame, layers);
      for (let y = 0; y < 192; y++) for (let x = 0; x < 320; x++) {
        const at = (y * 320 + x) * 4;
        const encoded = ((Math.floor((frame - 1) / 12) * 192 + y) * 3840 + (frame - 1) % 12 * 320 + x) * 4;
        if (final[at + 3] !== atlas.data[encoded + 3]) alphaMismatch++;
        const inside = x >= windowRegion.left && x < windowRegion.left + windowRegion.width && y >= windowRegion.top && y < windowRegion.top + windowRegion.height;
        if (!inside) for (let c = 0; c < 4; c++) if (final[at + c] !== source[at + c]) outsideDifference++;
        if (x >= 231 && x <= 238 && y >= 127 && y <= 132 && atlas.data[encoded + 3] !== 255) potMissing++;
        if (x >= 194 && x <= 210 && y >= 44 && y <= 65) {
          const [r, g, b, a] = source.subarray(at, at + 4);
          if (a && g > r + 5 && g > b + 7 && r > 55 && g < 180) {
            for (let c = 0; c < 4; c++) if (final[at + c] !== source[at + c]) clothDifference++;
          }
        }
      }
    }
    // Then: all frames preserve the matte, source action and opaque pot core.
    assert.deepEqual({alphaMismatch,outsideDifference,potMissing,clothDifference}, {alphaMismatch:0,outsideDifference:0,potMissing:0,clothDifference:0});
  });
}

test('reaching paw and foreground paper retain their original pixels across the repair', async () => {
  // Given: observed source landmarks in the hand reach and paper crossing.
  const landmarks = [
    ['window', 'window', 37, 242, 82], ['window', 'window', 37, 243, 84],
    ['window', 'window', 41, 243, 78], ['window', 'window', 41, 247, 79],
    ['window', 'window', 45, 227, 80], ['window', 'window', 49, 214, 82],
    ['gust', 'gust-right', 41, 203, 95], ['gust', 'gust-right', 43, 208, 87],
    ['gust', 'gust-right', 45, 205, 92], ['gust', 'gust-right', 47, 197, 84],
  ];
  const layers = await loadWindowLayers();
  for (const [clip, directory, frame, x, y] of landmarks) {
    const source = await read(`output/bear-stories/wind/${directory}/raw/${String(frame).padStart(4, '0')}.png`);
    removeMatte(source, 320, 192);
    const final = Buffer.from(source);
    // When: the background window is repaired behind the action.
    repairWindow(final, clip, frame, layers);
    // Then: the source foreground color and alpha remain exact.
    assert.deepEqual(pixel(final, x, y), pixel(source, x, y), `${clip} ${frame} (${x},${y})`);
  }
});
