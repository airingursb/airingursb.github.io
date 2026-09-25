import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root='output/h3-blog-delights-20260924/theater';
const source=`${root}/h3/point-sweep-v2/video-1.mp4`;
const work=`${root}/bake/full`;
const target='public/blog-delights/theater';
await mkdir(work,{recursive:true}); await mkdir(target,{recursive:true});
execFileSync('ffmpeg',['-v','error','-y','-i',source,'-vf','fps=12,scale=768:432,crop=352:400:208:20','-frames:v','180',`${work}/%03d.png`]);
const width=352,height=400,count=width*height;
function neighbors(p){const x=p%width;return [x>0?p-1:-1,x<width-1?p+1:-1,p>=width?p-width:-1,p<count-width?p+width:-1];}
function silhouette(raw){
  const line=new Uint8Array(count);
  for(let p=0;p<count;p++){const i=p*4;line[p]=raw[i]<118&&raw[i+1]<90&&raw[i+2]<90?1:0;}
  // Close one source-pixel gaps in the authored dark outline; never key cream fur.
  const dilated=new Uint8Array(count),closed=new Uint8Array(count);
  for(let p=0;p<count;p++)dilated[p]=line[p]||neighbors(p).some(n=>n>=0&&line[n])?1:0;
  for(let p=0;p<count;p++)closed[p]=dilated[p]&&neighbors(p).every(n=>n<0||dilated[n])?1:0;
  const outside=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0;
  const add=p=>{if(p>=0&&!closed[p]&&!outside[p]){outside[p]=1;queue[tail++]=p;}};
  for(let x=0;x<width;x++){add(x);add(count-width+x);}for(let y=0;y<height;y++){add(y*width);add(y*width+width-1);}
  while(head<tail){const p=queue[head++];for(const n of neighbors(p))add(n);}
  // The actor is the only large closed silhouette inside this fixed crop.
  const visited=new Uint8Array(count),keep=new Uint8Array(count);let largest=0;
  for(let start=0;start<count;start++){
    if(outside[start]||visited[start])continue;
    head=0;tail=1;queue[0]=start;visited[start]=1;
    while(head<tail){const p=queue[head++];for(const n of neighbors(p))if(n>=0&&!outside[n]&&!visited[n]){visited[n]=1;queue[tail++]=n;}}
    if(tail>64){for(let i=0;i<tail;i++)keep[queue[i]]=1;largest+=tail;}
  }
  const output=Buffer.from(raw);for(let p=0;p<count;p++){const i=p*4;const key=raw[i]>raw[i+1]+30&&raw[i+2]>raw[i+1]+30;const backingGap=raw[i+1]>raw[i]+18||raw[i+2]>raw[i]+5;if(!keep[p]||key||backingGap)output.fill(0,i,i+4);}
  return {output,area:largest};
}
const files=(await readdir(work)).filter(name=>/^\d{3}\.png$/.test(name)).sort();const frames=[],areas=[];
for(const file of files){const raw=await sharp(`${work}/${file}`).ensureAlpha().raw().toBuffer();const {output,area}=silhouette(raw);areas.push(area);frames.push(await sharp(output,{raw:{width,height,channels:4}}).resize(176,200,{kernel:'lanczos3'}).webp({lossless:true}).toBuffer());}
const selected=Array.from({length:16},(_,i)=>Math.round(i*(frames.length-1)/15));
for(const [theme,background]of [['dark','#0d1117'],['light','#ffffff']])await sharp({create:{width:704,height:800,channels:3,background}}).composite(selected.map((frame,i)=>({input:frames[frame],left:i%4*176,top:Math.floor(i/4)*200}))).png().toFile(`${root}/bake/matte-${theme}.png`);
async function atlas(name,start,end){const sequence=frames.slice(start,end);const columns=10;await sharp({create:{width:176*columns,height:200*Math.ceil(sequence.length/columns),channels:4,background:'#00000000'}}).composite(sequence.map((input,i)=>({input,left:i%columns*176,top:Math.floor(i/columns)*200}))).webp({lossless:true,effort:5}).toFile(`${target}/${name}.webp`);return {asset:`${name}.webp`,frames:sequence.length};}
await sharp(frames[24]).toFile(`${target}/poster.webp`);
const point=await atlas('point',24,77),sweep=await atlas('sweep',77,174);
await writeFile(`${target}/manifest.json`,JSON.stringify({version:1,width:176,height:200,columns:10,fps:12,poster:'poster.webp',clips:{point,sweep}},null,2)+'\n');
await writeFile(`${root}/bake/quality.json`,JSON.stringify({source,frames:frames.length,areas,minimumArea:Math.min(...areas),maximumArea:Math.max(...areas),note:'Dark closed-outline extraction excludes invented park backing. Public delivery is silent transparent WebP frames; source audio is not used.'},null,2)+'\n');
console.log('Baked GC theater',frames.length,'frames. Area',Math.min(...areas),Math.max(...areas));
