import assert from 'node:assert/strict';
import { actorEvidence, capture, observeActor, waitForMotion } from './editorial-motion-qa.mjs';

export async function inspectBlog(session, name) {
  const { page } = session;
  const footer = page.locator('[data-archive-bookcart]');
  const actor = footer.locator('[data-editorial-actor]');
  await observeActor(actor);
  await actor.scrollIntoViewIfNeeded();
  await waitForMotion(actor);
  const arrival = await actorEvidence(actor);
  const screenshots = [await capture(page, `${name}-bookcart`)];
  const firstYear = footer.locator('summary').first();
  await firstYear.click();
  assert.equal(await footer.locator('details').first().evaluate(element => element.open), true);
  const hrefs = await footer.locator('details').first().locator('li a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  assert.ok(hrefs.length > 0 && hrefs.every(href => /^\/(en\/)?posts\/.+\/$/.test(href)));
  screenshots.push(await capture(page, `${name}-archive-open`));
  await firstYear.press('Enter');
  assert.equal(await footer.locator('details').first().evaluate(element => element.open), false);
  return { arrival, links: hrefs.length, screenshots };
}

export async function inspectHarness(session, name) {
  const { page } = session;
  await page.locator('[data-demo-ready="true"]').last().waitFor();
  assert.equal(await page.locator('[data-demo-clip]').count(), 7);
  const sizes = await page.locator('[data-editorial-actor]').evaluateAll(actors => actors.map(actor => {
    const rect = actor.getBoundingClientRect();
    return { manifest: actor.dataset.editorialActor, width: rect.width, height: rect.height };
  }));
  const expected = page.viewportSize().width <= 768 ? [168, 96, 88] : [208, 96, 112];
  assert.deepEqual(sizes.map(actor => actor.width), expected, 'All preview actors use their designed display sizes');
  assert.ok(await page.locator('[data-demo-clip]').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 44)));
  await page.locator('[data-actor-poster]').evaluateAll(async images => Promise.all(images.map(image => image.decode())));
  return { sizes, screenshots: [await capture(page, `${name}-showcase`, { fullPage: true })] };
}

export async function inspectArticle(session, name) {
  const { page, subscriptions } = session;
  const dock = page.locator('[data-article-pet-dock][data-dock-ready="true"]');
  await dock.waitFor({ state: 'attached' });
  const panda = dock.locator('[data-editorial-actor]');
  await observeActor(panda);
  await dock.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-article-pet-dock]')?.dataset.dockState === 'docked');
  await waitForMotion(panda);
  assert.equal(await page.locator('#blog-pet').isVisible(), false, 'Floating and docked panda cannot both be visible');
  const screenshots = [await capture(page, `${name}-panda-docked`)];
  const pandaEvidence = await actorEvidence(panda);
  const section = page.locator('[data-newspaper-subscription]');
  await page.locator('[data-newspaper-subscription][data-subscription-state="idle"]').waitFor();
  const counter = section.locator('[data-editorial-actor]');
  await observeActor(counter);
  await section.scrollIntoViewIfNeeded();
  const input = section.locator('input[type="email"]');
  const submit = section.locator('button[type="submit"]');
  await input.fill('reader@example.test');
  subscriptions.mode = 'already';
  await submit.click();
  await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription]')?.dataset.subscriptionState === 'already');
  assert.equal((await actorEvidence(counter)).events.some(event => event.kind === 'start' && event.clip === 'subscribe'), false, 'Existing subscriber must not trigger the success action');
  subscriptions.mode = 'confirmed';
  await submit.click();
  await page.waitForFunction(() => document.querySelector('[data-newspaper-subscription]')?.dataset.subscriptionState === 'confirmed');
  await waitForMotion(counter);
  screenshots.push(await capture(page, `${name}-subscription-playing`));
  const counterEvidence = await actorEvidence(counter);
  assert.ok(counterEvidence.events.some(event => event.kind === 'start' && event.clip === 'subscribe'));
  assert.equal(subscriptions.requests.length, 2);
  assert.equal(await input.inputValue(), '');
  await page.locator('h1').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-article-pet-dock]')?.dataset.dockState === 'floating');
  if (await page.evaluate(() => matchMedia('(min-width: 801px)').matches)) {
    assert.equal(await page.locator('#blog-pet').isVisible(), true, 'Scrolling back restores the floating panda');
  } else assert.equal(await page.locator('#blog-pet').isVisible(), false, 'Mobile never shows a floating panda');
  return { panda: pandaEvidence, counter: counterEvidence, screenshots };
}

export async function inspectNeighborFallback(session, name) {
  const { page } = session;
  await page.locator('[data-subscription-state="idle"]').waitFor();
  const papers = page.locator('[data-page-paper]');
  assert.equal(await papers.count(), 2, 'Middle article exposes both chronological neighbors');
  assert.equal(await papers.locator('img').count(), 0, 'Coverless neighbors use typography without an image box');
  const screenshots = [];
  const links = [];
  for (let index = 0; index < 2; index++) {
    const paper = papers.nth(index);
    await paper.scrollIntoViewIfNeeded();
    links.push(await paper.locator('[data-article-card]').getAttribute('href'));
    screenshots.push(await capture(page, `${name}-neighbor-${index}`));
  }
  const prefix = page.url().includes('/en/posts/') ? '/en/posts/' : '/posts/';
  assert.ok(links.every(link => link.startsWith(prefix)));
  assert.equal(await papers.first().locator('.next-page-description').isVisible(), true);
  assert.equal(await papers.first().locator('.next-page-read').getAttribute('href'), links[0]);
  const secondaryLink = papers.last().locator('[data-article-card]');
  await secondaryLink.focus();
  assert.equal(await secondaryLink.evaluate(element => element === document.activeElement), true, 'Both neighbors remain keyboard accessible');
  await secondaryLink.press('Enter');
  await page.waitForURL(url => url.pathname === links[1]);
  return { links, screenshots };
}
