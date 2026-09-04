import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('homepage Reading Stream actions use translated copy', async () => {
  const [homepage, en, zh] = await Promise.all([
    readFile(new URL('src/pages/index.astro', root), 'utf8'),
    readFile(new URL('public/i18n/en.json', root), 'utf8').then(JSON.parse),
    readFile(new URL('public/i18n/zh.json', root), 'utf8').then(JSON.parse),
  ]);

  assert.match(homepage, /data-i18n="rdg_follow_rss"/);
  assert.match(homepage, /data-i18n="rdg_follow_weekly"/);
  assert.equal(en.rdg_follow_rss, 'Live RSS');
  assert.equal(en.rdg_follow_weekly, 'Subscribe to weekly email →');
  assert.equal(zh.rdg_follow_rss, '实时 RSS');
  assert.equal(zh.rdg_follow_weekly, '订阅每周邮件 →');
});

test('subscription dialog reapplies language after homepage switches', async () => {
  const dialog = await readFile(new URL('src/components/SubscriptionDialog.astro', root), 'utf8');

  assert.match(dialog, /window\.currentLang === 'en' \|\| window\.currentLang === 'zh'/);
  assert.match(dialog, /window\.addEventListener\('langchange'/);
  assert.match(dialog, /function applyLanguage\(/);
  assert.match(dialog, /if \(!trigger \|\| !\(dialog instanceof HTMLDialogElement\)\) return;\s*applyLanguage\(\);/);
});
