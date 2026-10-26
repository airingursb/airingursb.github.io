import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {parse} from 'parse5';
import sharp from 'sharp';
import {aiWeeklyIssues,weeklyArticleCount} from '../../src/data/ai-weekly.ts';
import sources from '../../src/data/ai-weekly/005.sources.json' with {type:'json'};
import {weeklyDestination} from '../../src/scripts/weekly-analytics.ts';
const issue=aiWeeklyIssues.find(i=>i.number==='005');
const file=path=>new URL('../../dist'+path,import.meta.url);
const walk=n=>[n,...(n.childNodes??[]).flatMap(walk)];
const attr=(n,k)=>n?.attrs?.find(a=>a.name===k)?.value;
const text=n=>n?.nodeName==='#text'?n.value:(n?.childNodes??[]).map(text).join('');
const doc=async path=>walk(parse(await readFile(file(path),'utf8')));
for(const lang of ['zh','en']){
 const prefix=lang==='en'?'/en':'';
 test(lang+' 005 publishes all sources, editorial anchors and the plain editor link',async()=>{
  const nodes=await doc(issue.href[lang]+'index.html'),ids=nodes.map(n=>attr(n,'id')).filter(Boolean);
  assert.equal(aiWeeklyIssues[0].number,'005');
  assert.equal(weeklyArticleCount(issue),17);
  assert.equal(issue.columns.length,23);
  assert.equal(issue.topics.reduce((a,t)=>a+t.count,0),23);
  assert.deepEqual(new Set(issue.columns.flatMap(c=>[c.source,...c.relatedSources])),new Set(sources.map(s=>s.reading_url)));
  assert.equal(ids.length,new Set(ids).size);
  assert.deepEqual(ids.filter(id=>/^source-\d+$/.test(id)),sources.map(s=>'source-'+s.n));
  for(const c of issue.columns){
   assert.ok(ids.includes(c.anchor));
   assert.equal(nodes.filter(n=>['section','article'].includes(n.tagName)&&attr(n,'data-weekly-column')===c.anchor).length,1);
  }
  for(const a of nodes.filter(n=>n.tagName==='a'&&attr(n,'href')?.startsWith('#'))){
   const target=attr(a,'href').slice(1);
   assert.ok(ids.includes(target),target);
   assert.equal(weeklyDestination('https://ursb.me'+issue.href[lang]+'#'+target).target,target);
  }
  const editor=nodes.find(n=>attr(n,'class')==='editor');
  assert.equal(text(editor),'Airing');
  assert.equal(attr(editor,'href'),'https://ursb.me/');
  assert.equal(attr(nodes.find(n=>n.tagName==='body'),'data-weekly-surface'),'weekly-issue');
 });
 test(lang+' 005 has canonical sharing, navigation and subscriptions',async()=>{
  const nodes=await doc(issue.href[lang]+'index.html');
  const meta=name=>attr(nodes.find(n=>attr(n,'name')===name||attr(n,'property')===name),'content');
  assert.equal(meta('robots'),undefined);
  assert.equal(meta('og:url'),'https://ursb.me'+issue.href[lang]);
  assert.equal(meta('og:image'),'https://ursb.me'+issue.socialImage[lang]);
  assert.equal(meta('twitter:card'),'summary_large_image');
  assert.equal(attr(nodes.find(n=>attr(n,'rel')==='canonical'),'href'),meta('og:url'));
  assert.equal(attr(nodes.find(n=>attr(n,'id')==='share-url'),'value'),meta('og:url'));
  assert.equal(attr(nodes.find(n=>attr(n,'class')==='save-cover'),'href'),issue.shareCover[lang]);
  assert.ok(nodes.some(n=>n.attrs?.some(a=>a.name==='data-subscribe-open')));
  assert.ok(nodes.some(n=>attr(n,'rel')==='prev'&&attr(n,'href')===prefix+'/reading/weekly/004/'));
  const previous=await doc(prefix+'/reading/weekly/004/index.html');
  assert.ok(previous.some(n=>attr(n,'rel')==='next'&&attr(n,'href')===issue.href[lang]));
  const preview=await doc(prefix+'/previews/ai-weekly-005/index.html');
  assert.equal(attr(preview.find(n=>attr(n,'name')==='robots'),'content'),'noindex,nofollow');
  assert.ok(!preview.some(n=>attr(n,'data-weekly-surface')||attr(n,'id')==='issue-share'));
 });
 test(lang+' 005 leads entry pages and RSS with optimized social assets',async()=>{
  for(const path of [prefix+'/reading/weekly/index.html',prefix+'/reading/index.html','/index.html']){
   const html=await readFile(file(path),'utf8');
   assert.ok(html.includes(issue.href[lang]),path);
   assert.ok(html.includes(issue.cover[lang]),path);
  }
  const archive=await readFile(file(prefix+'/reading/weekly/index.html'),'utf8');
  assert.ok(archive.indexOf('issue-005')<archive.indexOf('issue-004'));
  const rss=await readFile(file(prefix+'/reading/weekly/feed.xml'),'utf8');
  assert.ok(rss.includes('ai-weekly-005')&&rss.includes('utm_medium=rss'));
  for(const c of issue.columns)assert.ok(rss.includes(c.anchor));
  for(const [path,size,budget] of [[issue.cover[lang],[540,764],100000],[issue.shareCover[lang].replace('.png','.webp'),[864,1222],250000],[issue.shareCover[lang],[1080,1528],5000000],[issue.socialImage[lang],[1200,600],1000000]]){
   const buffer=await readFile(file(path)),meta=await sharp(buffer).metadata();
   assert.deepEqual([meta.width,meta.height],size);
   assert.ok(buffer.length<budget,path);
  }
 });
}
