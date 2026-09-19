import { chromium } from 'playwright';
import { assertPageHealth, capture, openEditorialPage, saveReport } from './editorial-motion-qa.mjs';
import { inspectArticle, inspectBlog, inspectHarness, inspectNeighborFallback } from './editorial-motion-scenarios.mjs';
import { inspectFullPerformances, inspectReducedMotion, inspectResourceFailure, inspectSurprise } from './editorial-motion-temporal.mjs';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { started: new Date().toISOString(), expectedScenarios: 44, scenarios: [], temporal: null, reduced: null, resourceFailure: null, surprise: null };
const inspectors = { blog: inspectBlog, harness: inspectHarness, article: inspectArticle, neighbors: inspectNeighborFallback };
try {
  for (const lang of ['zh', 'en']) for (const width of [375, 768, 1280]) for (const theme of ['light', 'dark']) {
    for (const surface of width === 768 ? ['blog', 'harness', 'article'] : ['blog', 'harness', 'article', 'neighbors']) {
      const scenario = { lang, width, theme, surface };
      const name = `${surface}-${lang}-${width}-${theme}`;
      const session = await openEditorialPage(browser, scenario);
      try {
        await assertPageHealth(session);
        const result = await inspectors[surface](session, name);
        const layout = await assertPageHealth(session);
        report.scenarios.push({ ...scenario, ...result, layout, mediaRequests: session.mediaRequests, pageErrors: session.pageErrors });
        console.log(`Matrix complete: ${name}`);
      } catch (error) {
        report.failedScenario = { ...scenario, mediaFailures: session.mediaFailures, pageErrors: session.pageErrors, screenshot: await capture(session.page, `${name}-failure`) };
        throw error;
      } finally { await session.context.close(); }
      await saveReport('motion-report', report);
    }
  }
  report.temporal = await inspectFullPerformances(browser);
  await saveReport('motion-report', report);
  report.reduced = await inspectReducedMotion(browser);
  report.resourceFailure = await inspectResourceFailure(browser);
  if (process.env.EDITORIAL_QA_SURPRISE === '1') report.surprise = await inspectSurprise(browser);
  report.completed = new Date().toISOString();
} catch (error) {
  report.failure = error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) };
  throw error;
} finally {
  await saveReport('motion-report', report);
  await browser.close();
}
