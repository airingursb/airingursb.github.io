import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchAllMoments,normalizeMoment,momentEntryHtml,linkify} from '../public/moments-ui/core.js';

test('archive fetch reads every page before returning and deduplicates records',async()=>{
 const calls=[];
 const records=Array.from({length:89},(_,index)=>({id:String(index)}));
 const result=await fetchAllMoments(async url=>{const page=Number(new URL(url).searchParams.get('page'));calls.push(page);return {ok:true,json:async()=>({total:89,moments:records.slice((page-1)*40,page*40)})};});
 assert.equal(result.length,89);assert.deepEqual(calls,[1,2,3]);
});
test('partial or failed archive refresh never returns an incomplete snapshot',async()=>{
 await assert.rejects(fetchAllMoments(async()=>({ok:true,json:async()=>({total:2,moments:[{id:'a'}]})})),/未读取完整/);
 await assert.rejects(fetchAllMoments(async()=>({ok:false,status:503})),/503/);
 await assert.rejects(fetchAllMoments(async()=>({ok:true,json:async()=>({total:'2',moments:[]})})),/格式不完整/);
});
test('normalization preserves all images, uses cache only for unchanged sources, and Shanghai dates',()=>{
 const cached={photos:[{src:'/moments-ui/content/a.webp',original:'https://example.test/a.jpg',width:400,height:300}],previews:[{url:'https://example.test/page',originalImage:'https://example.test/cover.jpg',image:'/moments-ui/content/cover.webp',imageWidth:300,imageHeight:400}]};
 const raw={id:'a',published_at:'2025-12-31T17:00:00Z',content:'Original',images:['https://example.test/a.jpg','https://example.test/b.jpg'],link_previews:[{url:'https://example.test/page',image:'https://example.test/cover.jpg'}]};
 const moment=normalizeMoment(raw,cached);assert.equal(moment.date,'2026-01-01');assert.equal(moment.photos.length,2);assert.equal(moment.photos[0].src,cached.photos[0].src);assert.equal(moment.photos[1].src,raw.images[1]);assert.equal(moment.previews[0].image,cached.previews[0].image);
 assert.equal(normalizeMoment(raw,moment).previews[0].image,cached.previews[0].image);
 raw.link_previews[0].image='https://example.test/new-cover.jpg';assert.equal(normalizeMoment(raw,cached).previews[0].image,raw.link_previews[0].image);
 assert.equal(normalizeMoment({...raw,published_at:'invalid'},cached),null);
});
test('untrusted content and URLs cannot inject HTML or scripts',()=>{
 const moment=normalizeMoment({id:'a',published_at:'2026-01-01',content:'<img src=x onerror=alert(1)>\n\nhttps://example.test/a?q=x&y=z，',images:['javascript:alert(1)'],link_previews:[{url:'javascript:alert(1)',image:'https://example.test/a'}]});
 const html=momentEntryHtml(moment);assert.equal(moment.photos.length,0);assert.equal(moment.previews.length,0);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('noopener noreferrer'));assert.ok(html.includes('data-action="like"'));
 assert.ok(linkify('https://example.test/Foo_(bar)。').includes('href="https://example.test/Foo_(bar)"'));
});
