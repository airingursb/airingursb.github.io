import sharp from 'sharp';
import { readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { removeFooterMatte } from '../garden/footer-matte.mjs';

const root = 'output/tree-lamps-motion/v1';
const width = 340, height = 240;
const raw = { width, height, channels: 4 };
const region = { left: 104, top: 113, width: 124, height: 104 };
const paths = (await readdir(`${root}/stable`)).filter(name => /^frame-\d+\.png$/.test(name)).sort().slice(0,150);
if (paths.length !== 150) throw new Error(`Expected 150 source frames, got ${paths.length}`);
await mkdir(`${root}/processed`, {recursive:true});
const patches = [], contacts = [], audit = [];
const can = await sharp('public/bear-footer/garden-can.webp').png().toBuffer();
for (const [index, name] of paths.entries()) {
  const rgb = await sharp(`${root}/stable/${name}`).removeAlpha().raw().toBuffer();
  const mask = await sharp(`${root}/masks/${name}`).greyscale().raw().toBuffer();
  const actor = removeFooterMatte(rgb,width,height);
  let opaque=0;
  for(let pixel=0;pixel<width*height;pixel++) {
    actor[pixel*4+3]=Math.min(mask[pixel],actor[pixel*4+3]);
    const x=pixel%width,y=Math.floor(pixel/width);
    const [r,g,b]=rgb.subarray(pixel*3,pixel*3+3);
    if(mask[pixel] && r>215 && g>205 && b>155 && r>=g && r-g<22 && g-b>8) {
      let fur=0;
      for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++) {
        const offset=((y+dy)*width+x+dx)*3;
        const [nr,ng,nb]=rgb.subarray(offset,offset+3);
        if(nr>140 && nr<201 && ng>91 && ng<151 && nb>58 && nb<119 && nr-ng>31 && ng-nb>20) fur++;
      }
      if(fur>=6) { rgb.copy(actor,pixel*4,pixel*3,pixel*3+3); actor[pixel*4+3]=255; }
    }
    if(actor[pixel*4+3]) opaque++;
  }
  const action = await sharp(actor,{raw}).png().toBuffer();
  const patch = await sharp(action).extract(region).png().toBuffer();
  patches.push(patch);
  audit.push({frame:index,actorPixels:opaque});
  if(index%10===0 || index===149) {
    const complete=await sharp('public/bear-footer/garden-background.webp').composite([{input:can},{input:action}]).png().toBuffer();
    for(const [theme,color] of [['light','#ffffff'],['dark','#0d1117']]) {
      await sharp(complete).flatten({background:color}).resize(680,480,{kernel:'nearest'}).png().toFile(`${root}/processed/${theme}-${String(index).padStart(3,'0')}.png`);
    }
    contacts.push({input:complete,left:contacts.length%4*width,top:Math.floor(contacts.length/4)*height});
  }
}
for(const [theme,color] of [['light','#ffffff'],['dark','#0d1117']]) {
  await sharp({create:{width:width*4,height:height*4,channels:3,background:color}}).composite(contacts).png().toFile(`${root}/processed/contact-${theme}.png`);
}
await sharp({create:{width:region.width*10,height:region.height*15,channels:4,background:'#00000000'}})
 .composite(patches.map((input,index)=>({input,left:index%10*region.width,top:Math.floor(index/10)*region.height})))
 .webp({lossless:true,effort:6}).toFile('public/bear-footer/lamp-actions.webp');
const metadata={fps:10,frameCount:150,columns:10,width,height,left:region.left,top:region.top,cellWidth:region.width,cellHeight:region.height,pull:{start:64,end:82,from:{x:222,y:143},to:{x:224,y:153}}};
await writeFile('public/bear-footer/lamp-manifest.json',`${JSON.stringify(metadata,null,2)}\n`);
await writeFile(`${root}/processed/bake-report.json`,JSON.stringify({metadata,bytes:(await stat('public/bear-footer/lamp-actions.webp')).size,audit,source:'task_01M37FQS0KYGBWMRCDM806K356',model:'minimax-h3-max-turbo',method:'Original 340x240 footer frozen. SIFT canopy registration. Isolated bear/book performance. Lossless transparent atlas, no audio.'},null,2));
console.log(JSON.stringify({metadata,bytes:(await stat('public/bear-footer/lamp-actions.webp')).size}));
