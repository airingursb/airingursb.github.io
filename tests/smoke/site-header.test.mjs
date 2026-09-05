import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';

const baseURL = process.env.SITE_HEADER_BASE_URL || 'http://localhost:4325';
const sections = ['blog', 'moments', 'notes', 'reading', 'friends'];
let browser;
before(async () => { browser = await chromium.launch({ channel: 'chrome', headless: true }); });
after(async () => { await browser?.close(); });

for (const lang of ['zh', 'en']) {
  for (const section of sections) {
    test(`${lang} ${section} header exposes every main section`, async () => {
      const prefix = lang === 'en' ? '/en' : '';
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      try {
        await page.goto(`${baseURL}${prefix}/${section}/`, { waitUntil: 'domcontentloaded' });
        const nav = page.locator('.site-header-nav');
        const hrefs = await nav.locator('a').evaluateAll(links => links.map(link => new URL(link.href).pathname.replace(/\/$/, '')));
        assert.deepEqual(hrefs, ['blog', 'moments', 'notes', 'reading', 'photos', 'friends'].map(path => `${path === 'photos' ? '' : prefix}/${path}`));
        assert.equal(await nav.locator('[aria-current="page"]').getAttribute('href'), `${prefix}/${section}/`);
      } finally {
        await page.close();
      }
    });
  }
}

test('mobile menu exposes Reading and Escape restores focus', async () => {
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  try {
    await page.goto(`${baseURL}/en/moments/`, { waitUntil: 'domcontentloaded' });
    const toggle = page.getByRole('button', { name: 'Toggle navigation', exact: true });
    await toggle.click();
    assert.equal(await page.locator('.site-header-nav').getByRole('link', { name: 'Reading', exact: true }).isVisible(), true);
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await toggle.evaluate(element => element === document.activeElement), true);
  } finally {
    await page.close();
  }
});
