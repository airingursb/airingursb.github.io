import sharp from 'sharp';
import {mkdir,access,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../public/reading/weekly/005/',import.meta.url);
await mkdir(new URL('assets/',root),{recursive:true});
for(const lang of ['zh','en']){
 for(const ext of ['png','webp']){
  const old=new URL('cover-'+lang+'.'+ext,root);
  if(await access(old).then(()=>true,()=>false))await rename(old,new URL('assets/cover-'+lang+'.'+ext,root));
 }
 const input=fileURLToPath(new URL('assets/cover-'+lang+'.png',root));
 await sharp(input).resize(540,764).webp({quality:82,effort:6}).toFile(fileURLToPath(new URL('shelf-cover-'+lang+'.webp',root)));
 await sharp(input).resize(864,1222).webp({quality:85,effort:6}).toFile(fileURLToPath(new URL('assets/cover-'+lang+'.webp',root)));
}
