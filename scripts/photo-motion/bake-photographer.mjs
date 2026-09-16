import sharp from 'sharp';
import { readdir, copyFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const raw='output/photo-motion-preview/photographer-raw';
const out='output/photo-motion-matte-fix';
const files=(await readdir(raw)).filter(x=>x.endsWith('.png')).sort();
const neighbors=(p,w,h)=>{
 const x=p%w,y=Math.floor(p/w),result=[];
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)result.push((y+dy)*w+x+dx);
 return result;
};
const report=[];
for(const file of files){
 const {data,info:{width:w,height:h}}=await sharp(`${raw}/${file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const seen=new Uint8Array(w*h),queue=[];
 for(let x=0;x<w;x++)queue.push(x,(h-1)*w+x);
 for(let y=0;y<h;y++)queue.push(y*w,y*w+w-1);
 for(let at=0;at<queue.length;at++){
  const p=queue[at];if(seen[p])continue;seen[p]=1;
  const i=p*4,min=Math.min(data[i],data[i+1],data[i+2]),max=Math.max(data[i],data[i+1],data[i+2]);
  if(max<125||max-min>65)continue;
  data[i+3]=0;
  queue.push(...neighbors(p,w,h));
 }
 const {data:pixels,info}=await sharp(data,{raw:{width:w,height:h,channels:4}}).extract({left:108,top:48,width:172,height:192}).resize(86,96,{kernel:'nearest'}).raw().toBuffer({resolveWithObject:true});
 const {width,height}=info,visited=new Uint8Array(width*height);let largest=[];
 for(let p=0;p<width*height;p++){
  if(visited[p]||!pixels[p*4+3])continue;
  const component=[p];visited[p]=1;
  for(let at=0;at<component.length;at++)for(const n of neighbors(component[at],width,height))if(!visited[n]&&pixels[n*4+3]){visited[n]=1;component.push(n);}
  if(component.length>largest.length)largest=component;
 }
 const keep=new Set(largest);let removed=0,cleaned=0;
 for(let p=0;p<width*height;p++){
  const i=p*4;
  if(!keep.has(p)){if(pixels[i+3])removed++;pixels[i+3]=0;continue;}
  const ns=neighbors(p,width,height);
  const boundary=ns.some(n=>!keep.has(n));
  const max=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
  const min=Math.min(pixels[i],pixels[i+1],pixels[i+2]);
  // Only remaining pale matte-contaminated boundary pixels; never touch interior cream features.
  if(boundary&&max>135&&max-min<85){
   const dark=ns.filter(n=>keep.has(n)&&Math.max(pixels[n*4],pixels[n*4+1],pixels[n*4+2])<110);
   if(dark.length){const n=dark.reduce((a,b)=>pixels[a*4]<pixels[b*4]?a:b);for(let c=0;c<3;c++)pixels[i+c]=pixels[n*4+c];cleaned++;}
  }
 }
 await sharp(pixels,{raw:{width,height,channels:4}}).png().toFile(`${out}/frames/${file}`);
 report.push({file,area:largest.length,removed,cleaned});
}
await copyFile(`${out}/frames/${files[0]}`,`${out}/photographer-poster.png`);
execFileSync('img2webp',['-loop','1','-lossless','-d','83',...files.map(f=>`${out}/frames/${f}`),'-o',`${out}/photographer.webp`]);
await writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
console.log({frames:files.length,removed:report.reduce((n,r)=>n+r.removed,0),cleaned:report.reduce((n,r)=>n+r.cleaned,0)});
