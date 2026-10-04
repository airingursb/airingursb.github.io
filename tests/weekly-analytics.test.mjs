import assert from 'node:assert/strict';
import test from 'node:test';

test('classifies issue links with campaign query and column anchors', async () => {
  const { weeklyDestination } = await import('../src/scripts/weekly-analytics.ts');
  assert.deepEqual(weeklyDestination('https://ursb.me/en/reading/weekly/001/?utm_source=mail#column-16'), {
    issue: '001', lang: 'en', target: 'column-16', kind: 'issue',
  });
  assert.equal(weeklyDestination('https://example.org/reading/weekly/001/'), null);
  assert.equal(weeklyDestination('https://ursb.me/reading/r-story/'), null);
  assert.equal(weeklyDestination('https://ursb.me/reading/weekly/feed.xml').kind, 'rss');
  assert.equal(weeklyDestination('https://ursb.me/reading/weekly/').kind, 'archive');
});

test('new edition topics and feature targets remain attributable alongside stable mail anchors', async () => {
  const { weeklyDestination } = await import('../src/scripts/weekly-analytics.ts');
  for (const lang of ['zh', 'en']) {
    for (const target of ['runtime', 'quality', 'tools', 'contents', 'durable', 'product-maestro', 'column-29']) {
      assert.deepEqual(weeklyDestination(`https://ursb.me/${lang === 'en' ? 'en/' : ''}reading/weekly/002/?utm_medium=rss#${target}`), {
        issue: '002', lang, target, kind: 'issue',
      });
    }
  }
  assert.equal(weeklyDestination('https://ursb.me/reading/weekly/002/#arbitrary-user-input').target, '');
});

test('published reader attributes source, image, share and column-view events to the editorial unit', async () => {
  const { initWeeklyAnalytics } = await import('../src/scripts/weekly-analytics.ts');
  const originals = Object.fromEntries(['location','document','window','Element','HTMLAnchorElement','HTMLDetailsElement','IntersectionObserver'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const events = [], handlers = {};
  const unit = {dataset:{weeklyColumn:'column-07'},id:'durable'};
  const heading = {closest:()=>unit};
  let observeEntries;
  class Control {
    constructor(href='',classes=[],id=''){this.href=href;this.classes=classes;this.id=id;}
    closest(selector){return selector==='a, button'?this:selector==='[data-weekly-surface]'?{dataset:{weeklySurface:'weekly-issue'}}:unit;}
    matches(selector){return selector.split(',').map(s=>s.trim()).some(s=>s.startsWith('.')?this.classes.includes(s.slice(1)):s.startsWith('#')?this.id===s.slice(1):false);}
  }
  class Link extends Control {}
  try {
    Object.assign(globalThis,{
      location:{href:'https://ursb.me/en/reading/weekly/002/',origin:'https://ursb.me'},
      Element:Control,HTMLAnchorElement:Link,HTMLDetailsElement:class {},
      document:{documentElement:{lang:'en'},visibilityState:'visible',addEventListener:(name,fn)=>{handlers[name]=fn;},querySelectorAll:()=>[{querySelector:()=>heading}]},
      window:{umami:{track:(name,data)=>events.push({name,data})},addEventListener:()=>{}},
      IntersectionObserver:class {constructor(callback){observeEntries=callback;}observe(){}}
    });
    initWeeklyAnalytics();
    for(const control of [
      new Link('https://ursb.me/en/reading/r-example/'),
      new Link('https://earendil.com/posts/pi-1-0/'),
      new Link('https://ursb.me/reading/weekly/002/assets/pi-1-0-official-demo.webp'),
      new Control('', ['share-trigger']),
      new Link('https://ursb.me/reading/weekly/002/assets/share-cover-02-en.png',['save-cover']),
      new Link('https://ursb.me/en/reading/weekly/002/#runtime'),
    ]) handlers.click({target:control});
    observeEntries([{isIntersecting:true,target:heading}]);
    observeEntries([{isIntersecting:true,target:heading}]);
    assert.deepEqual(events.map(event=>event.name),['weekly-source-open','weekly-source-open','weekly-image-open','weekly-share-open','weekly-share','weekly-toc-click','weekly-column-view']);
    for(const {data} of events) {assert.equal(data.issue,'002');assert.equal(data.lang,'en');assert.equal(data.column,'column-07');}
    assert.equal(events[0].data.kind,'reading');assert.equal(events[1].data.domain,'earendil.com');
    assert.equal(events[4].data.action,'cover-download');assert.equal(events[5].data.target,'runtime');
  } finally {
    for(const [key,descriptor] of Object.entries(originals)) {if(descriptor) Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
