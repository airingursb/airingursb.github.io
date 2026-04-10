import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4341';

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = {};

  // Test 1: /search/ with zh-only keyword
  await page.goto(`${BASE}/search/`, { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('input[type="search"], #search input, .pagefind-ui__search-input', { timeout: 8000 });
  } catch (e) {
    results.zhSearchForRender = 'NO_INPUT_SELECTOR';
  }
  const zhInput = await page.$('input[type="search"], #search input, .pagefind-ui__search-input');
  if (zhInput) {
    await zhInput.fill('渲染');
    await page.waitForTimeout(1500);
    const zhResultCount = await page.evaluate(() => {
      return document.querySelectorAll('.pagefind-ui__result').length;
    });
    const zhResultLangs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.pagefind-ui__result a')).map(a => a.getAttribute('href')).slice(0, 8);
    });
    results.zhSearchForRender = { count: zhResultCount, sampleHrefs: zhResultLangs };
  }

  // Test 2: /en/search/ with en-only keyword
  await page.goto(`${BASE}/en/search/`, { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('input[type="search"], #search input, .pagefind-ui__search-input', { timeout: 8000 });
  } catch (e) {
    results.enSearchForChromium = 'NO_INPUT_SELECTOR';
  }
  const enInput = await page.$('input[type="search"], #search input, .pagefind-ui__search-input');
  if (enInput) {
    await enInput.fill('Chromium');
    await page.waitForTimeout(1500);
    const enResultCount = await page.evaluate(() => {
      return document.querySelectorAll('.pagefind-ui__result').length;
    });
    const enResultLangs = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.pagefind-ui__result a')).map(a => a.getAttribute('href')).slice(0, 8);
    });
    results.enSearchForChromium = { count: enResultCount, sampleHrefs: enResultLangs };
  }

  // Test 3: /en/search/ with zh keyword (cross-contamination check)
  await page.goto(`${BASE}/en/search/`, { waitUntil: 'networkidle' });
  const enInput2 = await page.$('input[type="search"], #search input, .pagefind-ui__search-input');
  if (enInput2) {
    await enInput2.fill('渲染');
    await page.waitForTimeout(1500);
    const count = await page.evaluate(() => document.querySelectorAll('.pagefind-ui__result').length);
    results.enSearchForZhKeyword = { count, note: 'should be 0 or very low - EN index should not contain zh-only content' };
  }

  // Test 4: /search/ with en keyword (reverse cross-contamination)
  await page.goto(`${BASE}/search/`, { waitUntil: 'networkidle' });
  const zhInput2 = await page.$('input[type="search"], #search input, .pagefind-ui__search-input');
  if (zhInput2) {
    await zhInput2.fill('Chromium');
    await page.waitForTimeout(1500);
    const count = await page.evaluate(() => document.querySelectorAll('.pagefind-ui__result').length);
    results.zhSearchForEnKeyword = { count, note: 'should be 0 or very low - zh index should not contain en-only content' };
  }

  console.log('Pagefind language scoping results:');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
