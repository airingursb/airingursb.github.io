import sharp from 'sharp';
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
const root='public/reading/weekly/005';
await mkdir(root,{recursive:true});
await mkdir('output/005-research/images',{recursive:true});
const sources=JSON.parse(await readFile('src/data/ai-weekly/005.images.json','utf8'));
const report=await Promise.all(Object.entries(sources).map(async([id,s])=>{
 const r=await fetch(s.url);if(!r.ok)throw Error(id+': HTTP '+r.status);
 const b=Buffer.from(await r.arrayBuffer());const m=await sharp(b).metadata();
 await writeFile('output/005-research/images/'+id+'-original',b);
 await sharp(b).resize({width:1800,withoutEnlargement:true}).webp({quality:87,effort:6}).toFile(root+'/'+id+'-full.webp');
 const contained=['expand','past','reason','inflight'].includes(id);
 const background=['expand','past'].includes(id)?'#000000':'#f7f7f5';
 for(const w of [480,960])await sharp(b).flatten({background}).resize(w,Math.round(w*2/3),{fit:contained?'contain':'cover',background,position:'centre',withoutEnlargement:false}).webp({quality:83,effort:6}).toFile(root+'/'+id+'-'+w+'.webp');
 return [id,{...s,width:m.width,height:m.height}];
}));
const illustration=process.argv[2];
if(illustration){
 await copyFile(illustration,'output/005-research/cover-original.png');
 for(const width of [480,960])await sharp(illustration).resize({width}).webp({quality:85,effort:6}).toFile(root+'/cover-05-less-'+width+'.webp');
}
await writeFile('src/data/ai-weekly/005.images.json',JSON.stringify(Object.fromEntries(report),null,2)+'\n');
console.log('005 assets prepared from the public image manifest');
