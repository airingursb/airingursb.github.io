import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4341';

const REDIRECT_PAIRS = [
  ['/notes/', '/en/notes/'],
  ['/archive/', '/en/archive/'],
  ['/search/', '/en/search/'],
  ['/friends/', '/en/friends/'],
  ['/moments/', '/en/moments/'],
  ['/admin/', '/en/admin/'],
];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = [];

  // Set preferred_lang=en in localStorage, then visit zh pages, expect redirect to EN
  for (const [zhPath, enPath] of REDIRECT_PAIRS) {
    await page.goto(`${BASE}${zhPath}`);
    await page.evaluate(() => localStorage.setItem('preferred_lang', 'en'));
    await page.goto(`${BASE}${zhPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const finalUrl = page.url();
    const normalized = finalUrl.replace(/\/$/, '');
    const expectedNormalized = `${BASE}${enPath}`.replace(/\/$/, '');
    const ok = normalized === expectedNormalized;
    results.push({ direction: 'zh->en', from: zhPath, expected: enPath, actual: finalUrl.replace(BASE, ''), ok });
    await page.evaluate(() => localStorage.removeItem('preferred_lang'));
  }

  // Reverse: set pref=zh, visit EN pages, expect redirect to zh
  for (const [zhPath, enPath] of REDIRECT_PAIRS) {
    await page.goto(`${BASE}${enPath}`);
    await page.evaluate(() => localStorage.setItem('preferred_lang', 'zh'));
    await page.goto(`${BASE}${enPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const finalUrl = page.url();
    const normalized = finalUrl.replace(/\/$/, '');
    const expectedNormalized = `${BASE}${zhPath}`.replace(/\/$/, '');
    const ok = normalized === expectedNormalized;
    results.push({ direction: 'en->zh', from: enPath, expected: zhPath, actual: finalUrl.replace(BASE, ''), ok });
    await page.evaluate(() => localStorage.removeItem('preferred_lang'));
  }

  await browser.close();

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok);
  console.log(`Auto-redirect: ${passed}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED:');
    failed.forEach(f => console.log(`  [${f.direction}] ${f.from} -> expected ${f.expected}, got ${f.actual}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
