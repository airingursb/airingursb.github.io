import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4341';

// [zhPath, enPath] pairs that both should return 200 with correct <html lang>
const ROUTES = [
  ['/notes/', '/en/notes/'],
  ['/notes/claude-101-intro/', '/en/notes/claude-101-intro/'],
  ['/notes/claude-code-memory-system/', '/en/notes/claude-code-memory-system/'],
  ['/notes/cybernetics-and-ai-coding/', '/en/notes/cybernetics-and-ai-coding/'],
  ['/notes/openharness-visual-guide/', '/en/notes/openharness-visual-guide/'],
  ['/archive/', '/en/archive/'],
  ['/search/', '/en/search/'],
  ['/friends/', '/en/friends/'],
  ['/moments/', '/en/moments/'],
  ['/admin/', '/en/admin/'],
  ['/tags/tech/', '/en/tags/tech/'],
  ['/blog/', '/en/blog/'],
];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const failures = [];
  const warnings = [];

  for (const [zhPath, enPath] of ROUTES) {
    for (const [path, expectedLang] of [[zhPath, 'zh'], [enPath, 'en']]) {
      const url = `${BASE}${path}`;
      try {
        const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        if (!resp || resp.status() >= 400) {
          failures.push(`${url} -> HTTP ${resp?.status() ?? 'no-response'}`);
          continue;
        }
        const htmlLang = await page.getAttribute('html', 'lang');
        if (htmlLang !== expectedLang) {
          failures.push(`${url} -> html lang="${htmlLang}", expected "${expectedLang}"`);
        }
        const langSwitch = await page.$('.lang-switch');
        if (!langSwitch) {
          warnings.push(`${url} -> missing .lang-switch element`);
        }
      } catch (e) {
        failures.push(`${url} -> error: ${e.message.slice(0, 120)}`);
      }
    }
  }

  await browser.close();

  console.log(`\n=== Smoke test results ===`);
  console.log(`Routes tested: ${ROUTES.length * 2} (${ROUTES.length} zh + ${ROUTES.length} en)`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (failures.length) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log('  ' + f));
  }
  if (warnings.length) {
    console.log('\nWARNINGS:');
    warnings.forEach(w => console.log('  ' + w));
  }

  if (failures.length) process.exit(1);
  console.log(`\nAll routes pass (warnings may need manual follow-up)`);
}

main().catch(e => { console.error(e); process.exit(1); });
