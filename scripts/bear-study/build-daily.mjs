import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [source, destination, batch = 'v2'] = process.argv.slice(2);
if (!source || !destination || !['v2', 'v3'].includes(batch)) {
  console.error('Usage: node scripts/bear-study/build-daily.mjs <source-directory> <public-output-directory> [v2|v3]');
  process.exit(1);
}
const width = 464, height = 272, cellWidth = 232, cellHeight = 136, columns = 10;
const treatments = batch === 'v3' ? {
  music: { start: 18, end: 174, step: 1, holdStart: 44, holdEnd: 84, still: 66 },
  stretch: { start: 24, end: 160, step: 2, holdStart: 0, holdEnd: 67, still: 36 },
  water: { start: 24, end: 174, step: 2, holdStart: 0, holdEnd: 74, still: 36 },
  shy: { start: 36, end: 174, step: 2, holdStart: 0, holdEnd: 68, still: 30 },
} : {
  reading: { start: 24, end: 174, step: 1, holdStart: 34, holdEnd: 70, still: 48 },
  sleep: { start: 36, end: 174, step: 1, holdStart: 33, holdEnd: 76, still: 60 },
  pet: { start: 48, end: 174, step: 2, holdStart: 0, holdEnd: 62, still: 20 },
  drink: { start: 18, end: 174, step: 2, holdStart: 0, holdEnd: 77, still: 32 },
};
const typing = JSON.parse(await readFile(new URL('../../src/assets/bear-study/typing.json', import.meta.url), 'utf8'));
const clips = batch === 'v3'
  ? JSON.parse(await readFile(new URL('../../src/assets/bear-study/daily.json', import.meta.url), 'utf8'))
  : { typing: { ...typing, holdStart: 0, holdEnd: typing.frameCount - 1, still: 0, exitFrames: [24, 113, 139] } };
const base = await sharp(path.join(source, '../h3-idle-v1/raw/0030.png')).removeAlpha().raw().toBuffer();
const laptop = [[267,144],[351,144],[338,208],[206,208],[206,194],[252,194]];
function inLaptop(x,y) {
  let inside = false;
  for (let i=0,j=laptop.length-1;i<laptop.length;j=i++) {
    const [xi,yi]=laptop[i], [xj,yj]=laptop[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function matte(rgb, name) {
  const rgba = Buffer.alloc(width*height*4);
  for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
    const moving = x>=66 && x<(name==='water' ? 432 : 335) && y>=8 && y<221;
    const cup = name!=='drink' && x<138 && y>=160;
    const pixels = moving && !cup && !inLaptop(x,y) ? rgb : base;
    const i=(y*width+x)*3, o=(y*width+x)*4;
    const [r,g,b]=pixels.subarray(i,i+3);
    const low=Math.min(r,g,b), chroma=Math.max(r,g,b)-low;
    rgba[o]=r;rgba[o+1]=g;rgba[o+2]=b;
    rgba[o+3]=chroma<26 ? Math.round(255*Math.max(0,Math.min(1,(229-low)/12))) : 255;
  }
  if(name==='shy') removeFloatingHearts(rgba);
  const clean=Buffer.from(rgba);
  for(let y=1;y<height-1;y++) for(let x=1;x<width-1;x++) {
    const o=(y*width+x)*4;
    if(!rgba[o+3])continue;
    let boundary=false, interiorLow=255;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const n=((y+dy)*width+x+dx)*4;
      if(rgba[n+3]<32)boundary=true;
      if(rgba[n+3]>224)interiorLow=Math.min(interiorLow,...rgba.subarray(n,n+3));
    }
    const low=Math.min(...rgba.subarray(o,o+3));
    if(boundary && interiorLow<110 && low>interiorLow+20) {
      const coverage=Math.max(0,Math.min(1,(245-low)/(245-interiorLow)));
      clean[o+3]=Math.round(255*coverage);
      for(let c=0;c<3;c++)clean[o+c]=Math.max(0,Math.min(255,Math.round((rgba[o+c]-245*(1-coverage))/Math.max(coverage,.01))));
    }
  }
  return clean;
}

function removeFloatingHearts(rgba) {
  const seen=new Uint8Array(width*height);
  for(let seed=0;seed<seen.length;seed++) {
    if(seen[seed] || !rgba[seed*4+3]) continue;
    const region=[seed]; seen[seed]=1;
    let minX=width,maxY=0;
    for(let i=0;i<region.length;i++) {
      const pixel=region[i], x=pixel%width, y=Math.floor(pixel/width);
      minX=Math.min(minX,x);maxY=Math.max(maxY,y);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nx=x+dx,ny=y+dy,n=ny*width+nx;
        if(nx>=0 && nx<width && ny>=0 && ny<height && !seen[n] && rgba[n*4+3]) {
          seen[n]=1;region.push(n);
        }
      }
    }
    if(minX>=300 && maxY<144) for(const pixel of region) rgba[pixel*4+3]=0;
  }
}
await mkdir(destination,{recursive:true});
const report={};
for(const [name,t] of Object.entries(treatments)) {
  const dir=path.join(source,name,'raw');
  const names=(await readdir(dir)).filter(n=>/^\d+\.png$/.test(n)).sort();
  if(names.length<t.end) throw new Error(`Incomplete frames for ${name}`);
  const frames=[];
  for(let index=t.start;index<t.end;index+=t.step) {
    let input=sharp(path.join(dir,names[index]));
    if(name==='pet') {
      const normalized=await input.resize(367,215).png().toBuffer();
      input=sharp({create:{width,height,channels:3,background:'#fff'}}).composite([{input:normalized,left:50,top:8}]);
    }
    const rgb=await input.removeAlpha().raw().toBuffer();
    frames.push(await sharp(matte(rgb,name),{raw:{width,height,channels:4}}).resize(cellWidth,cellHeight,{kernel:'nearest'}).png().toBuffer());
  }
  const rows=Math.ceil(frames.length/columns);
  await sharp({create:{width:columns*cellWidth,height:rows*cellHeight,channels:4,background:'#00000000'}})
    .composite(frames.map((input,i)=>({input,left:i%columns*cellWidth,top:Math.floor(i/columns)*cellHeight})))
    .webp({lossless:true,effort:6}).toFile(path.join(destination,`${name}-${batch}.webp`));
  clips[name]={asset:`${name}-${batch}.webp`,fps:12,frameCount:frames.length,columns,cellWidth,cellHeight,
    holdStart:t.holdStart,holdEnd:t.holdEnd,still:t.still};
  await writeFile(path.join(source,name,'still.png'),frames[t.still]);
  const picks=[0,t.holdStart,t.still,t.holdEnd,Math.min(t.holdEnd+12,frames.length-1),frames.length-1];
  await sharp({create:{width:cellWidth*3,height:cellHeight*2,channels:4,background:'#fff'}})
    .composite(picks.map((n,i)=>({input:frames[n],left:i%3*cellWidth,top:Math.floor(i/3)*cellHeight})))
    .png().toFile(path.join(source,name,'processed-contact.png'));
  report[name]={frames:frames.length,seconds:frames.length/12,hold:[t.holdStart,t.holdEnd]};
}
await writeFile(new URL('../../src/assets/bear-study/daily.json',import.meta.url),JSON.stringify(clips,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
