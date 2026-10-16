import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root));
test('avatar48 PNG assets have exact browser and Apple touch dimensions', async () => {
  for (const [file, size] of [['favicon-16x16.png',16],['favicon-32x32.png',32],['favicon-48x48.png',48],['apple-touch-icon.png',180]]) {
    const data = await read(`public/${file}`);
    assert.equal(data.subarray(1,4).toString(), 'PNG');
    assert.equal(data.readUInt32BE(16), size);
    assert.equal(data.readUInt32BE(20), size);
  }
});
test('root and legacy ICO contain matching 16, 32 and 48 pixel artwork', async () => {
  const data = await read('public/favicon.ico');
  assert.equal(data.readUInt16LE(2),1);
  assert.equal(data.readUInt16LE(4),3);
  assert.deepEqual([0,1,2].map(i => data[6+i*16]), [16,32,48]);
  assert.deepEqual(data, await read('public/assets/css/images/favicon.ico'));
});
test('all existing site icon declarations use the versioned avatar48 assets', async () => {
  async function walk(dir) {
    const entries = await readdir(new URL(dir,root), {withFileTypes:true});
    return (await Promise.all(entries.map(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`))).flat();
  }
  const files = [...await walk('src'),...await walk('public'),'index.html','scripts/pi_agent_immersive/shell.py'];
  let heads = 0;
  for (const file of files.filter(f => /\.(astro|html|py)$/.test(f))) {
    const text = (await read(file)).toString();
    const links = text.match(/<link\b[^>]*rel="(?:shortcut icon|icon|apple-touch-icon)"[^>]*>/g) || [];
    if (!links.length || links.every(l => l.includes('href="data:,"'))) continue;
    heads++;
    assert.equal(links.length,5,file);
    assert.ok(links.every(l => /href="\/(?:favicon(?:-\d+x\d+\.png|\.ico)|apple-touch-icon\.png)\?v=avatar48"/.test(l)),file);
  }
  assert.equal(heads,27);
});
