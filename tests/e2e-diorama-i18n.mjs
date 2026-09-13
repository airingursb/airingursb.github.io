import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL || 'http://localhost:4321';
const out='output/diorama-i18n';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const width of [375,768,1280]) {
  const context=await browser.newContext({viewport:{width,height:900},locale:'en-US',reducedMotion:'reduce'});
  await context.routeWebSocket('**',ws=>ws.close());
  const page=await context.newPage();
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.lang==='en');
  const shelf=page.locator('#diorama-shelf');
  const readyImages=()=>page.waitForFunction(()=>[...document.querySelectorAll('#diorama-shelf img')].filter(img=>{const r=img.getBoundingClientRect();return r.right>0&&r.left<innerWidth;}).every(img=>img.complete&&img.naturalWidth>0));
  await shelf.scrollIntoViewIfNeeded();
  // Given an English visitor, all authored shelf text and accessible image descriptions are English.
  assert.equal(await shelf.locator('h2').textContent(),'Little Keepsakes');
  const snapshot=()=>shelf.evaluate(el=>({text:el.innerText,alts:[...el.querySelectorAll('img')].map(i=>i.alt),names:[...el.querySelectorAll('[aria-labelledby]')].map(i=>document.getElementById(i.getAttribute('aria-labelledby'))?.textContent),links:[...el.querySelectorAll('a')].map(a=>a.getAttribute('href'))}));
  const en=await snapshot();
  assert.equal(/[\u3400-\u9fff]/u.test(en.text+en.alts.join('')+en.names.join('')),false);
  assert.ok(en.alts.every(Boolean));
  await readyImages();
  await page.screenshot({path:`${out}/${width}-en.png`});
  await shelf.locator('.comics-strip-item').last().scrollIntoViewIfNeeded();
  await readyImages();
  await page.screenshot({path:`${out}/${width}-en-end.png`});
  // When switching to Chinese and back, text and accessible names follow the existing toggle.
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.locator('#langToggle [data-lang="zh"]').click();
  assert.equal(await shelf.locator('h2').textContent(),'日常箱庭');
  const zh=await snapshot();
  assert.ok(zh.alts.every(alt=>/[\u3400-\u9fff]/u.test(alt)));
  assert.deepEqual(en.links,zh.links);
  await shelf.scrollIntoViewIfNeeded();
  await readyImages();
  await page.screenshot({path:`${out}/${width}-zh.png`});
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.locator('#langToggle [data-lang="en"]').click();
  assert.deepEqual(await snapshot(),en);
  // Then refreshing preserves English and the same translated content.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.lang==='en');
  assert.deepEqual(await snapshot(),en);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log(`PASS ${width}: EN first load, CN/EN switch, persisted refresh, alt/name and link consistency`);
  await context.close();
 }
} finally {await browser.close();}
