import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'parse5';
import sharp from 'sharp';
import { aiWeeklyIssues, weeklyArticleCount } from '../../src/data/ai-weekly.ts';

const issue = aiWeeklyIssues.find(issue => issue.number === '002');
const nodes = root => [root, ...(root.childNodes ?? []).flatMap(nodes)];
const attr = (node, key) => node.attrs?.find(item => item.name === key)?.value;
const built = path => new URL(`../../dist${path}`, import.meta.url);
const documentAt = async path => nodes(parse(await readFile(built(path), 'utf8')));

for (const lang of ['zh', 'en']) {
 test(`${lang} release exposes all 45 saves through 29 reachable, unique mail/RSS anchors`, async () => {
  const document = await documentAt(`${issue.href[lang]}index.html`);
  const units = document.filter(node => attr(node,'data-editorial-kind'));
  assert.equal(units.length,29);
  assert.equal(units.filter(node => attr(node,'data-editorial-kind')==='feature').length,6);
  assert.equal(units.filter(node => attr(node,'data-editorial-kind')==='product').length,10);
  assert.deepEqual(units.flatMap(node => attr(node,'data-source-ids').split(',').map(Number)).toSorted((a,b)=>a-b),Array.from({length:45},(_,i)=>i+1));
  assert.equal(weeklyArticleCount(issue),45);
  assert.equal(issue.topics.reduce((sum,topic)=>sum+topic.count,0),29);
  for(const column of issue.columns) {
   const target = document.filter(node => attr(node,'id')===column.anchor);
   assert.equal(target.length,1,column.anchor);
   assert.ok(units.some(node => attr(node,'data-weekly-column')===column.anchor),column.anchor);
  }
  for(const topic of issue.topics) assert.equal(document.filter(node => attr(node,'id')===topic.anchor).length,1);
  assert.equal(document.filter(node => node.tagName==='meta' && attr(node,'name')==='robots').length,0);
  const switchLink = document.find(node => node.attrs?.some(attr => attr.name==='data-language-switch'));
  assert.equal(attr(switchLink,'href'),issue.href[lang==='zh'?'en':'zh']);
  const imageNodes = document.filter(node => node.tagName==='img');
  assert.ok(imageNodes.length>25);
  for(const image of imageNodes.filter(node=>!attr(node,'fetchpriority'))) assert.equal(attr(image,'loading'),'lazy');
 });
 test(`${lang} preview stays unindexed and does not offer subscriptions or load the analytics SDK`, async () => {
  const document = await documentAt(`${lang==='en'?'/en':''}/previews/ai-weekly-002/index.html`);
  assert.equal(attr(document.find(node=>node.tagName==='meta'&&attr(node,'name')==='robots'),'content'),'noindex,nofollow');
  assert.ok(!document.some(node => node.attrs?.some(attr=>attr.name==='data-subscribe-open')));
  assert.ok(!document.some(node=>node.tagName==='script' && attr(node,'src')?.includes('analytics.ursb.me')));
 });
 test(`${lang} share preview and shelf cover remain separate from the complete PNG download`, async () => {
  for(const [file,expected,budget] of [[issue.cover[lang],[540,764],100_000],[issue.shareCover[lang].replace('.png','.webp'),[864,1222],250_000],[issue.shareCover[lang],[1080,1528],5_000_000]]){
   const bytes=await readFile(built(file));const meta=await sharp(bytes).metadata();
   assert.deepEqual([meta.width,meta.height],expected,file);assert.ok(bytes.length<budget,`${file}: ${bytes.length}`);
  }
  const document=await documentAt(`${issue.href[lang]}index.html`);
  assert.equal(attr(document.find(node=>attr(node,'id')==='share-url'),'value'),`https://ursb.me${issue.href[lang]}`);
  const download=document.find(node=>attr(node,'class')==='save-cover');
  assert.equal(attr(download,'href'),issue.shareCover[lang]);assert.ok(attr(download,'download'));
 });
 test(`${lang} archive and reading shelf lead with 002 and preserve issue 001`, async () => {
  const prefix=lang==='en'?'/en':'';
  const archive=await readFile(built(`${prefix}/reading/weekly/index.html`),'utf8');
  assert.ok(archive.indexOf('issue-002')<archive.indexOf('issue-001'));
  const reading=await readFile(built(`${prefix}/reading/index.html`),'utf8');
  assert.ok(reading.includes(issue.href[lang]));assert.ok(reading.includes(issue.cover[lang]));
  const first=await documentAt(`${aiWeeklyIssues.find(issue=>issue.number==='001').href[lang]}index.html`);
  assert.equal(attr(first.find(node=>node.tagName==='meta'&&attr(node,'property')==='og:url'),'content'),`https://ursb.me${prefix}/reading/weekly/001/`);
 });
}
