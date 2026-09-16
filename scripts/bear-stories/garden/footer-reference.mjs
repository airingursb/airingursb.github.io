import sharp from 'sharp';
import { removeFooterMatte } from './footer-matte.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const source = 'output/bear-stories/revision-3/garden/reference';
const root = 'output/bear-stories/revision-4/reference';
const width = 340, height = 240;
const raw = { width, height, channels: 4 };
await mkdir(root, { recursive: true });
const original = await sharp('public/bear-footer/poster.webp').ensureAlpha().raw().toBuffer();
const rgb = await sharp(`${source}/cleanplate-small.png`).removeAlpha().raw().toBuffer();
const generated = removeFooterMatte(rgb, width, height);
const inside = (x, y, polygon) => {
  let found = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) found = !found;
  }
  return found;
};
const can = [[222,205],[226,199],[252,199],[262,197],[264,192],[271,193],[274,198],[269,202],[257,214],[256,226],[231,226],[229,222],[222,220],[219,214]];
const pot = [[278,204],[283,199],[291,197],[298,200],[305,204],[305,211],[301,216],[299,226],[284,226],[282,218],[279,212]];
const bear = [[141,151],[137,146],[138,140],[145,135],[154,137],[162,136],[184,135],[187,130],[194,130],[202,135],[203,142],[197,150],[204,164],[205,181],[201,186],[202,207],[194,213],[181,213],[174,209],[166,213],[153,213],[144,208],[143,190],[137,181],[137,163]];
const props = Buffer.alloc(original.length);
const cleanplate = Buffer.from(original);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const offset = (y * width + x) * 4;
  if (inside(x, y, can) || inside(x, y, pot)) generated.copy(props, offset, offset, offset + 4);
  if (x >= 135 && x <= 207 && y >= 130 && y <= 214) {
    generated.copy(cleanplate, offset, offset, offset + 4);
    if (Math.min(...generated.subarray(offset, offset + 3)) > 222) cleanplate[offset + 3] = 0;
  }
}
const canOnly = Buffer.from(props), potOnly = Buffer.from(props);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const alpha = (y * width + x) * 4 + 3;
  if (!inside(x, y, can)) canOnly[alpha] = 0;
  if (!inside(x, y, pot)) potOnly[alpha] = 0;
}
await sharp(canOnly, { raw }).webp({ lossless: true }).toFile('public/bear-footer/garden-can.webp');
await sharp(cleanplate, { raw }).composite([{input:await sharp(potOnly,{raw}).png().toBuffer()}]).webp({lossless:true}).toFile('public/bear-footer/garden-background.webp');
await sharp(props, { raw }).png().toFile(`${root}/props.png`);
await sharp(cleanplate, { raw }).webp({ lossless: true }).toFile(`${root}/cleanplate.webp`);
const start = await sharp(original, { raw }).composite([{ input: await sharp(props, { raw }).png().toBuffer() }]).png().toBuffer();
await sharp(start).webp({ lossless: true }).toFile('public/bear-footer/garden-poster.webp');
await sharp(start).flatten({ background: '#ffffff' }).resize(1360,960,{kernel:'nearest'})
  .extend({ top:30,bottom:30,left:0,right:0,background:'#ffffff' }).jpeg({quality:97})
  .toFile(`${root}/h3-start.jpg`);
await sharp(cleanplate, { raw }).flatten({background:'#ffffff'}).resize(1020,720,{kernel:'nearest'}).png().toFile(`${root}/cleanplate-white.png`);
await writeFile(`${root}/manifest.json`, JSON.stringify({ original:'public/bear-footer/poster.webp', width,height, actorRepair:bear, can,pot, h3:{width:1360,height:1020,crop:{left:0,top:30,width:1360,height:960}}, method:'Original stage pixels plus isolated generated props. Local empty-bench repair only where the original seated actor was.' }, null, 2));
