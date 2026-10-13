import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const sources=JSON.parse(await readFile(new URL('src/data/ai-weekly/003.sources.json',root),'utf8'));
const attr=(tag,name)=>tag.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
for(const locale of ['','en/']){
 test(locale+'issue003 generated reader has complete semantic coverage and valid local targets',async()=>{
  const html=await readFile(new URL('dist/'+locale+'previews/ai-weekly-003/index.html',root),'utf8');
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/<body[^>]*data-pagefind-ignore/);
  assert.doesNotMatch(html,/data-weekly-surface=|analytics\.ursb\.me|data-subscribe-open/);
  const articles=[...html.matchAll(/<article\b[^>]*data-editorial-kind[^>]*>/g)].map(m=>m[0]);
  const assigned=articles.flatMap(tag=>attr(tag,'data-source-ids').split(',').map(Number)).sort((a,b)=>a-b);
  assert.deepEqual(assigned,sources.map(s=>s.n).sort((a,b)=>a-b));
  assert.equal(articles.filter(tag=>attr(tag,'data-editorial-kind')==='product').length,10);
  assert.equal(articles.filter(tag=>attr(tag,'data-editorial-kind')==='feature').length,5);
  assert.equal(articles.filter(tag=>attr(tag,'data-editorial-kind')==='brief').length,11);
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for(const [,id]of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(id),'missing anchor '+id);
  const images=[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
  assert.equal(images.length,18);
  for(const figure of ['matrix-theorem','pi-crash-plate','dream-overview','dream-lasso','panda-architecture']){
   assert.equal(images.filter(tag=>attr(tag,'src').includes(figure+'-1200.webp')).length,1,figure);
   assert.match(html,new RegExp('href="/reading/weekly/003/assets/'+figure+'-full.webp"'));
  }
  for(const id of ['math-overview','math-riemann','math-matrix','math-kakeya','math-formalization','math-understanding']) assert.ok(ids.includes(id),id);
  const background=html.match(/<details id="math-background"([^>]*)>([\s\S]*?)<\/details>/);
  assert.ok(background,'optional mathematical background exists');
  assert.doesNotMatch(background[1],/\bopen\b/);
  for(const id of ['math-riemann','math-matrix','math-kakeya']) assert.ok(background[2].includes('id="'+id+'"'));
  for(const name of ['release-timeline','ai-contribution','debate-positions','research-checks','research-work','history-comparison','collaboration-loop','memory-handoff','continuity-records','evidence-branches']) assert.match(html,new RegExp('class="analysis-figure '+name+'"'));
  assert.match(html,/href="https:\/\/www.ifanr.com\/1683401"/);
  assert.doesNotMatch(html,/APPSO full text unavailable|APPSO 全文未取得/);
  assert.doesNotMatch(html,/\[object Object\]/);
  for(const tag of images){
   assert.ok(attr(tag,'alt'));assert.ok(Number(attr(tag,'width'))>0);assert.ok(Number(attr(tag,'height'))>0);
   await access(new URL('dist'+attr(tag,'src'),root));
   if(!attr(tag,'src').includes('cover-03')) assert.equal(attr(tag,'loading'),'lazy');
  }
  const recordedLinks=[...html.matchAll(/href="(https:\/\/ursb\.me\/(?:en\/)?reading\/r-[^"]+)"/g)].map(m=>m[1]);
  for(const s of sources) assert.ok(recordedLinks.includes('https://ursb.me/'+locale+'reading/'+s.slug+'/'),s.title);
 });
}
