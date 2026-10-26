import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile,access} from 'node:fs/promises';
import {parse} from 'parse5';
import sharp from 'sharp';
import draft from '../../src/data/ai-weekly/005.json' with {type:'json'};
import sources from '../../src/data/ai-weekly/005.sources.json' with {type:'json'};
import products from '../../src/data/ai-weekly/005.products.json' with {type:'json'};
const root=new URL('../../',import.meta.url);
const nodes=r=>[r,...(r.childNodes??[]).flatMap(nodes)];
const attr=(n,k)=>n?.attrs?.find(a=>a.name===k)?.value;
test('005 covers the entire Sunday–Saturday save window exactly once',()=>{
 assert.equal(sources.length,17);
 assert.deepEqual(draft.groups.flatMap(g=>g.sources).sort((a,b)=>a-b),sources.map(s=>s.n));
 for(const s of sources){
  const time=Date.parse(s.saved_at);
  assert.ok(time>=Date.parse('2026-10-17T16:00:00Z')&&time<Date.parse('2026-10-24T16:00:00Z'));
 }
 assert.deepEqual(sources.filter(s=>s.previousIssue).map(s=>s.n),[1,2]);
 assert.equal(draft.publishDate,'2026-10-26');
 assert.equal(products.products.length,8);assert.equal(products.bots.length,10);
});
for(const lang of ['zh','en']){
 const prefix=lang==='en'?'en/':'';
 test(lang+' preview has reachable sources, bilingual anchors and bounded assets',async()=>{
  const html=await readFile(new URL('dist/'+prefix+'previews/ai-weekly-005/index.html',root),'utf8');
  const doc=nodes(parse(html)),ids=doc.map(n=>attr(n,'id')).filter(Boolean);
  assert.equal(new Set(ids).size,ids.length,'duplicate ids');
  assert.equal(doc.filter(n=>n.tagName==='h1').length,1);
  assert.deepEqual(ids.filter(id=>/^source-\d+$/.test(id)),sources.map(s=>'source-'+s.n));
  for(const a of doc.filter(n=>n.tagName==='a'&&attr(n,'href')?.startsWith('#')))assert.ok(ids.includes(attr(a,'href').slice(1)),attr(a,'href'));
  assert.equal(attr(doc.find(n=>attr(n,'name')==='robots'),'content'),'noindex,nofollow');
  assert.equal(attr(doc.find(n=>n.attrs?.some(a=>a.name==='data-language-switch')),'href'),(lang==='en'?'':'/en')+'/previews/ai-weekly-005/');
  for(const img of doc.filter(n=>n.tagName==='img')){
   assert.ok(attr(img,'alt'));
   assert.ok(attr(img,'width')&&attr(img,'height'));
   assert.ok(attr(img,'src').endsWith('.webp'));
   await access(new URL('dist'+attr(img,'src'),root));
   if(!attr(img,'src').includes('cover-05'))assert.equal(attr(img,'loading'),'lazy');
  }
  for(const a of doc.filter(n=>n.tagName==='a'&&/\/005\/.*\.(png|webp)$/.test(attr(n,'href')??'')))await access(new URL('dist'+attr(a,'href'),root));
  assert.ok(!html.includes('analytics.ursb.me'));
  const rss=await readFile(new URL('dist/'+prefix+'reading/weekly/feed.xml',root),'utf8');
  assert.ok(!rss.includes('/previews/ai-weekly-005/'));
  const png=await readFile(new URL('public/reading/weekly/005/assets/cover-'+lang+'.png',root));
  const size=await sharp(png).metadata();
  assert.deepEqual([size.width,size.height],[1080,1528]);
 });
}
test('product previews share a ratio and remain below 180 KB',async()=>{
 for(const p of products.products)for(const width of [480,960]){
  const b=await readFile(new URL('public/reading/weekly/005/'+p.id+'-'+width+'.webp',root));
  const size=await sharp(b).metadata();
  assert.deepEqual([size.width,size.height],[width,width*2/3]);
  assert.ok(b.length<180000,p.id+' '+width+': '+b.length);
 }
});
