import sharp from 'sharp';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { removeFooterMatte } from './footer-matte.mjs';

const root = 'output/bear-stories/revision-3/garden';
const evidence = 'output/bear-stories/revision-4/processed';
const destination = 'public/bear-footer';
const width = 340, height = 240;
const raw = { width, height, channels: 4 };
const region = { left: 94, top: 126, width: 214, height: 109 };
const paths = (await readdir(`${root}/h3/stable`)).filter(name => /^frame-\d+\.png$/.test(name)).sort();
if (paths.length !== 150) throw new Error(`Expected 150 source frames, got ${paths.length}`);
await mkdir(evidence, { recursive: true });
const can = await sharp(`${destination}/garden-can.webp`).ensureAlpha().raw().toBuffer();
const patches = [];
const contacts = [];
const audit = [];
for (const [index, name] of paths.entries()) {
  const rgb = await sharp(`${root}/h3/stable/${name}`).removeAlpha().raw().toBuffer();
  const mask = await sharp(`output/bear-stories/revision-4/masks/${name}`).greyscale().raw().toBuffer();
  const matte = removeFooterMatte(rgb, width, height);
  const actor = Buffer.alloc(width * height * 4);
  let opaque = 0;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const offset = pixel * 4;
    matte.copy(actor, offset, offset, offset + 4);
    actor[offset + 3] = Math.min(mask[pixel], matte[offset + 3]);
    if (actor[pixel * 4 + 3]) opaque++;
  }
  const layers = [];
  if (index < 44 || index > 106) layers.push({input:await sharp(can,{raw}).png().toBuffer()});
  layers.push({ input: await sharp(actor, { raw }).png().toBuffer() });
  const action = await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();
  const patch = await sharp(action).extract(region).png().toBuffer();
  patches.push(patch);
  audit.push({ frame:index, actorPixels:opaque });
  if (index % 10 === 0 || index === 149) {
    const complete = await sharp(`${destination}/garden-background.webp`).composite([{input:action}]).png().toBuffer();
    for (const [theme,color] of [['light','#ffffff'],['dark','#0d1117']]) {
      await sharp(complete).flatten({background:color}).resize(680,480,{kernel:'nearest'}).png().toFile(`${evidence}/${theme}-${String(index).padStart(3,'0')}.png`);
    }
    contacts.push({input:complete,left:(contacts.length%4)*width,top:Math.floor(contacts.length/4)*height});
  }
}
await sharp({create:{width:width*4,height:height*4,channels:3,background:'#0d1117'}}).composite(contacts).png().toFile(`${evidence}/contact-dark.png`);
await sharp({create:{width:region.width*10,height:region.height*15,channels:4,background:'#00000000'}})
  .composite(patches.map((input,index)=>({input,left:index%10*region.width,top:Math.floor(index/10)*region.height})))
  .webp({lossless:true,effort:6}).toFile(`${destination}/garden-actions.webp`);
const metadata={fps:10,frameCount:150,columns:10,width,height,left:region.left,top:region.top,cellWidth:region.width,cellHeight:region.height,plant:{left:261,top:150,width:60,height:60,anchorX:291,anchorY:204}};
await writeFile('src/components/bear-stories/garden/frames.json',`${JSON.stringify(metadata,null,2)}\n`);
const files=['garden-poster.webp','garden-background.webp','garden-can.webp','garden-actions.webp'];
const sizes=Object.fromEntries(await Promise.all(files.map(async name=>[name,(await stat(`${destination}/${name}`)).size])));
await writeFile(`${evidence}/bake-report.json`,JSON.stringify({metadata,sizes,audit,source:'task_01M2MM7ZS0CTRZ5C0ZNM5JQBY9',method:'Original fixed footer stage; SIFT original-canopy registration; isolated moving actor/care matte; source cream/water preservation; lossless alpha atlas'},null,2));
console.log(JSON.stringify(sizes));
