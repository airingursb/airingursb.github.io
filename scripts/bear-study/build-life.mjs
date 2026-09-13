import sharp from 'sharp';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [source, destination] = process.argv.slice(2);
if (!source || !destination) throw new Error('Usage: node scripts/bear-study/build-life.mjs <source> <destination>');
const width = 464, height = 272, columns = 10;
const base = await sharp(path.join(source, '../h3-idle-v1/raw/0030.png')).removeAlpha().raw().toBuffer();
const treatments = {
  coffee: { start: 18, end: 178, holdStart: 57, holdEnd: 101, still: 76, pad: 0 },
  rain: { start: 12, end: 178, holdStart: 42, holdEnd: 98, still: 66, pad: 48 },
  camera: { start: 18, end: 178, holdStart: 42, holdEnd: 94, still: 60, pad: 0 },
};
const laptop = [[267,144],[351,144],[338,208],[206,208],[206,194],[252,194]];
function inLaptop(x,y) {
  let inside = false;
  for (let i=0,j=laptop.length-1;i<laptop.length;j=i++) {
    const [xi,yi]=laptop[i], [xj,yj]=laptop[j];
    if ((yi>y)!==(yj>y) && x<(xj-xi)*(y-yi)/(yj-yi)+xi) inside=!inside;
  }
  return inside;
}
function deskRow(rgb) {
  for(let y=180;y<height;y++) {
    let wood=0;
    for(let x=55;x<410;x++) {
      const i=(y*width+x)*3, [r,g,b]=rgb.subarray(i,i+3);
      if(r>135 && g>95 && b<175 && r>g+14 && g>b+12) wood++;
    }
    if(wood>285)return y;
  }
  throw new Error('Cannot align generated desk');
}
const baseRow=deskRow(base);
function matte(rgb, name, pad) {
  const outHeight=height+pad, rgba=Buffer.alloc(width*outHeight*4);
  const shift=deskRow(rgb)-baseRow;
  for(let y=-pad;y<height;y++) for(let x=0;x<width;x++) {
    const moving=x>=66 && x<(name==='rain'?444:335) && y>=-pad && y<221;
    const cup=name!=='coffee' && x<138 && y>=160;
    const animated=moving && !cup && !inLaptop(x,y);
    const sy=animated?y+shift:y;
    if(sy<0 || sy>=height)continue;
    const pixels=animated?rgb:base, i=(sy*width+x)*3, o=((y+pad)*width+x)*4;
    const [r,g,b]=pixels.subarray(i,i+3), low=Math.min(r,g,b), chroma=Math.max(r,g,b)-low;
    rgba[o]=r;rgba[o+1]=g;rgba[o+2]=b;
    rgba[o+3]=chroma<26?Math.round(255*Math.max(0,Math.min(1,(229-low)/12))):255;
  }
  const clean=Buffer.from(rgba);
  for(let y=1;y<outHeight-1;y++) for(let x=1;x<width-1;x++) {
    const o=(y*width+x)*4;if(!rgba[o+3])continue;
    let boundary=false,interiorLow=255;
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
const clips=JSON.parse(await readFile('src/assets/bear-study/daily.json','utf8'));
await mkdir(destination,{recursive:true});
for(const [name,t] of Object.entries(treatments)) {
  const dir=path.join(source,name,'raw');
  const names=(await readdir(dir)).filter(n=>/^\d+\.png$/.test(n)).sort();
  const frames=[], cellWidth=232, cellHeight=(height+t.pad)/2;
  for(let n=t.start;n<t.end;n++) {
    const rgb=await sharp(path.join(dir,names[n])).removeAlpha().raw().toBuffer();
    frames.push(await sharp(matte(rgb,name,t.pad),{raw:{width,height:height+t.pad,channels:4}}).resize(cellWidth,cellHeight,{kernel:'nearest'}).png().toBuffer());
  }
  const rows=Math.ceil(frames.length/columns);
  await sharp({create:{width:columns*cellWidth,height:rows*cellHeight,channels:4,background:'#00000000'}})
    .composite(frames.map((input,i)=>({input,left:i%columns*cellWidth,top:Math.floor(i/columns)*cellHeight})))
    .webp({lossless:true,effort:6}).toFile(path.join(destination,`${name}-v4.webp`));
  clips[name]={asset:`${name}-v4.webp`,fps:12,frameCount:frames.length,columns,cellWidth,cellHeight,holdStart:t.holdStart,holdEnd:t.holdEnd,still:t.still};
  const picks=[0,t.holdStart,t.still,t.holdEnd,Math.min(t.holdEnd+24,frames.length-1),frames.length-1];
  await sharp({create:{width:cellWidth*3,height:cellHeight*2,channels:4,background:'#fff'}}).composite(picks.map((n,i)=>({input:frames[n],left:i%3*cellWidth,top:Math.floor(i/3)*cellHeight}))).png().toFile(path.join(source,name,'processed-contact.png'));
  await writeFile(path.join(source,name,'still.png'),frames[t.still]);
}
await writeFile('src/assets/bear-study/daily.json',JSON.stringify(clips,null,2)+'\n');
console.log('Built coffee, rain, camera atlases with fixed desk alignment.');
