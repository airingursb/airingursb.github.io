import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
const frames=JSON.parse(await readFile('public/bear-footer/lamp-manifest.json','utf8'));
const atlas=await sharp('public/bear-footer/lamp-actions.webp').ensureAlpha().raw().toBuffer();
const width=frames.columns*frames.cellWidth;
function pixel(frame,x,y) {
  const offset=((Math.floor(frame/frames.columns)*frames.cellHeight+y-frames.top)*width+frame%frames.columns*frames.cellWidth+x-frames.left)*4;
  return atlas.subarray(offset,offset+4);
}
test('Given original reading endpoints, when the lamp atlas is decoded, then both seated feet stay solid',()=>{
  for(const frame of [0,149]) for(const [x,y] of [[159,199],[188,199]]) assert.equal(pixel(frame,x,y)[3],255);
});
test('Given small cream ear and muzzle details, when matte is removed, then the details remain opaque',()=>{
  for(const [x,y] of [[185,138],[172,163]]) assert.equal(pixel(10,x,y)[3],255);
});
test('Given the bear reaching for the pull switch, when the peak frame is decoded, then its reaching paw stays intact',()=>{
  assert.equal(pixel(70,211,149)[3],255);
});
test('Given a quiet reading pose, when keyed, then the open gap by the tree remains transparent',()=>{
  for(const frame of [0,10,149]) assert.equal(pixel(frame,220,145)[3],0);
});
test('Given source motion, when bundled, then the entire performance has a bounded atlas and returning pose',async()=>{
  const info=await sharp('public/bear-footer/lamp-actions.webp').metadata();
  assert.equal(frames.frameCount,150);
  assert.equal(info.width,frames.cellWidth*frames.columns);
  assert.equal(info.height,frames.cellHeight*Math.ceil(frames.frameCount/frames.columns));
  assert.ok(frames.pull.end<frames.frameCount-40);
});
