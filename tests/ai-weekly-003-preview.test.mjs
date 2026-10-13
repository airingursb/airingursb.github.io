import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import sharp from 'sharp';

const root=new URL('../',import.meta.url);
const json=async path=>JSON.parse(await readFile(new URL(path,root),'utf8'));
const draft=await json('src/data/ai-weekly/003.json');
const sources=await json('src/data/ai-weekly/003.sources.json');
const images=await json('src/data/ai-weekly/003.images.json');
const figures=await json('src/data/ai-weekly/003.figures.json');
const units=[...draft.features,...draft.tools,...draft.briefs];

test('issue 003 gives every saved reading exactly one editorial home',()=>{
 assert.equal(sources.length,28);
 assert.equal(new Set(sources.map(s=>s.n)).size,sources.length);
 assert.equal(new Set(sources.map(s=>s.slug)).size,sources.length);
 const assigned=units.flatMap(u=>u.sources).sort((a,b)=>a-b);
 assert.deepEqual(assigned,sources.map(s=>s.n).sort((a,b)=>a-b));
 assert.equal(new Set(units.map(u=>u.id)).size,units.length);
 for(const g of draft.groups){
  const groupUnits=[...draft.features.filter(f=>f.group===g.id),...draft.briefs.filter(b=>b.group===g.id),...(g.id==='tools'?draft.tools:[])];
  assert.equal(groupUnits.flatMap(u=>u.sources).length,g.count,g.id);
 }
});

test('issue 003 preserves both languages and the Sunday-to-Saturday calendar',()=>{
 const valid=v=>{assert.equal(typeof v.zh,'string');assert.equal(typeof v.en,'string');assert.ok(v.zh.trim());assert.ok(v.en.trim());};
 valid(draft.title); valid(draft.intro); valid(draft.guide);
 for(const f of draft.features){
  valid(f.title); valid(f.deck); valid(f.takeaway);
  for(const s of f.sections){valid(s.title);valid(s.navLabel);valid(s.text);if(s.note){valid(s.note.title);valid(s.note.text);}for(const r of s.references)valid(r.label);}
  for(const r of f.references)valid(r.label);
 }
 for(const s of draft.mathBackgrounds){valid(s.title);valid(s.text);for(const r of s.references)valid(r.label);}
 for(const p of draft.tools){valid(p.category);valid(p.text);valid(p.use);valid(p.note);}
 for(const b of draft.briefs){valid(b.title);valid(b.text);for(const r of b.references)valid(r.label);}
 const start=Date.parse(draft.periodStart+'T00:00:00+08:00');
 const end=Date.parse(draft.periodEnd+'T23:59:59.999+08:00');
 for(const s of sources) assert.ok(Date.parse(s.saved_at)>=start&&Date.parse(s.saved_at)<=end,s.title);
 assert.equal(new Date(draft.periodStart).getUTCDay(),0);
 assert.equal(new Date(draft.periodEnd).getUTCDay(),6);
 assert.equal(new Date(draft.publishDate).getUTCDay(),1);
 assert.equal(Date.parse(draft.publishDate)-Date.parse(draft.periodEnd),2*86400000);
});

test('product assets have official provenance, matching crops and uncropped enlargements',async()=>{
 assert.equal(images.length,draft.tools.length);
 for(const p of draft.tools) assert.equal(images.filter(i=>i.id===p.id).length,1);
 for(const art of images){
  assert.match(art.sourcePage,/^https:\/\//);assert.match(art.originalUrl,/^https:\/\//);
  for(const [file,w,h,budget] of [[art.file,960,640,180000],[art.smallFile,480,320,60000]]){
   const path=new URL('public/reading/weekly/003/assets/'+file,root);
   const meta=await sharp(path.pathname).metadata();
   assert.equal(meta.format,'webp');assert.equal(meta.width,w);assert.equal(meta.height,h);
   assert.ok((await stat(path)).size<budget,file);
  }
  const full=await sharp(new URL('public/reading/weekly/003/assets/'+art.fullFile,root).pathname).metadata();
  assert.ok(Math.abs(full.width/full.height-art.originalWidth/art.originalHeight)<0.005,art.id);
 }
});

test('published issue has a catalog entry and retains isolated preview routes',async()=>{
 const catalog=await readFile(new URL('src/data/ai-weekly.ts',root),'utf8');
 assert.match(catalog,/["']?number["']?:\s*["']003["']/);
 assert.equal(draft.status,'published');
 assert.equal(draft.publishedAt,'2026-10-13');
 for(const locale of ['','en/']){
  const route=await readFile(new URL('src/pages/'+locale+'previews/ai-weekly-003.astro',root),'utf8');
  assert.match(route,/Issue003Preview/);
 }
});

test('original evidence retains its native proportions and honest responsive widths',async()=>{
 assert.equal(figures.length,5);
 assert.equal(new Set(figures.map(f=>f.id)).size,figures.length);
 for(const f of figures){
  assert.match(f.url,/^https:\/\//);
  for(const value of [f.title,f.alt,f.caption]) for(const language of ['zh','en']) assert.ok(value[language].trim(),f.id);
  for(const size of ['full',480,1200]){
   const path=new URL('public/reading/weekly/003/assets/'+f.id+'-'+size+'.webp',root);
   const meta=await sharp(path.pathname).metadata();
   assert.equal(meta.format,'webp');
   assert.equal(meta.width,size==='full'?f.width:Math.min(size,f.width),f.id);
   assert.ok(Math.abs(meta.width/meta.height-f.width/f.height)<.01,f.id);
   assert.ok((await stat(path)).size<180000,f.id);
  }
 }
});
