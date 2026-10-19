import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'parse5';
import sharp from 'sharp';
import { aiWeeklyIssues, weeklyArticleCount } from '../../src/data/ai-weekly.ts';
import { weeklyDestination } from '../../src/scripts/weekly-analytics.ts';

const issue=aiWeeklyIssues.find(issue=>issue.number==='003');
const built=path=>new URL('../../dist'+path,import.meta.url);
const nodes=root=>[root,...(root.childNodes??[]).flatMap(nodes)];
const attr=(node,key)=>node.attrs?.find(item=>item.name===key)?.value;
const documentAt=async path=>nodes(parse(await readFile(built(path),'utf8')));

for(const lang of ['zh','en']){
 const prefix=lang==='en'?'/en':'';
 test(lang+' issue 003 publishes all 28 saves with reachable catalog and analytics targets',async()=>{
  const document=await documentAt(issue.href[lang]+'index.html');
  const units=document.filter(n=>attr(n,'data-editorial-kind'));
  assert.equal(units.length,26);
  assert.equal(weeklyArticleCount(issue),28);
  assert.deepEqual(units.flatMap(n=>attr(n,'data-source-ids').split(',').map(Number)).toSorted((a,b)=>a-b),Array.from({length:28},(_,i)=>i+1));
  assert.equal(issue.topics.reduce((sum,t)=>sum+t.count,0),26);
  for(const column of issue.columns){
   assert.equal(document.filter(n=>attr(n,'id')===column.anchor).length,1,column.anchor);
   assert.equal(units.filter(n=>attr(n,'data-weekly-column')===column.anchor).length,1,column.anchor);
  }
  for(const topic of issue.topics)assert.equal(document.filter(n=>attr(n,'id')===topic.anchor).length,1);
  for(const node of document.filter(n=>n.tagName==='a'&&attr(n,'href')?.startsWith('#'))){
   const target=attr(node,'href').slice(1);
   assert.equal(weeklyDestination('https://ursb.me'+issue.href[lang]+'#'+target).target,target,target);
  }
  assert.ok(!document.some(n=>n.tagName==='meta'&&attr(n,'name')==='robots'));
  assert.equal(attr(document.find(n=>n.tagName==='body'),'data-weekly-surface'),'weekly-issue');
  assert.equal(attr(document.find(n=>n.attrs?.some(a=>a.name==='data-language-switch')),'href'),issue.href[lang==='zh'?'en':'zh']);
  assert.equal(issue.publishedAt,'2026-10-13');
  assert.equal(issue.scheduledFor,'2026-10-12');
  assert.ok(document.some(n=>n.nodeName==='#text'&&n.value.includes('2026.10.13')));
 });
 test(lang+' issue 003 remains in the archive, feed and sharing with bounded images',async()=>{
  for(const path of [prefix+'/reading/weekly/index.html']){
   const html=await readFile(built(path),'utf8');
   assert.ok(html.includes(issue.href[lang]),path);
   assert.ok(html.includes(issue.cover[lang]),path);
  }
  const archive=await readFile(built(prefix+'/reading/weekly/index.html'),'utf8');
  assert.ok(archive.indexOf('issue-003')<archive.indexOf('issue-002'));
  const feed=await readFile(built(prefix+'/reading/weekly/feed.xml'),'utf8');
  assert.ok(feed.includes('ai-weekly-003'));
  assert.ok(feed.includes('column-26'));
  const document=await documentAt(issue.href[lang]+'index.html');
  assert.equal(attr(document.find(n=>attr(n,'id')==='share-url'),'value'),'https://ursb.me'+issue.href[lang]);
  assert.equal(attr(document.find(n=>attr(n,'class')==='save-cover'),'href'),issue.shareCover[lang]);
  assert.ok(document.some(n=>n.attrs?.some(a=>a.name==='data-subscribe-open')));
  for(const [file,size,budget]of [[issue.cover[lang],[540,764],100000],[issue.shareCover[lang].replace('.png','.webp'),[864,1222],250000],[issue.shareCover[lang],[1080,1528],5000000]]){
   const buffer=await readFile(built(file));
   const meta=await sharp(buffer).metadata();
   assert.deepEqual([meta.width,meta.height],size,file);
   assert.ok(buffer.length<budget,file);
  }
 });
}
