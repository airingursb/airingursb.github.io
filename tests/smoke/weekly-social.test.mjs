import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'parse5';
import sharp from 'sharp';
import { aiWeeklyIssues } from '../../src/data/ai-weekly.ts';

const nodes = (root) => [root, ...(root.childNodes ?? []).flatMap(nodes)];
const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const built = (pathname) => new URL(`../../dist${pathname}`, import.meta.url);

// Run after npm run build: these checks exercise the HTML and image a crawler receives.
for (const issue of aiWeeklyIssues) {
  for (const lang of ['zh', 'en']) {
    test(`${lang} issue ${issue.number} exposes one complete localized large-image card`, async () => {
      // Given the built document, without running any page JavaScript.
      const document = nodes(parse(await readFile(built(`${issue.href[lang]}index.html`), 'utf8')));
      const meta = (key) => {
        const matches = document.filter((node) => node.tagName === 'meta'
          && (attr(node, 'name') === key || attr(node, 'property') === key));
        assert.equal(matches.length, 1, key);
        return attr(matches[0], 'content');
      };
      // When an X/OG consumer resolves the card type, copy, URL and image.
      assert.equal(meta('twitter:card'), 'summary_large_image');
      const title = meta('twitter:title');
      const description = meta('twitter:description');
      const image = meta('twitter:image');
      // Then both metadata families describe the same localized public resource.
      assert.ok(title.includes(issue.number));
      assert.ok(title.includes(issue.title[lang].join(' ')));
      assert.equal(meta('og:title'), title);
      const titles = document.filter((node) => node.tagName === 'title');
      assert.equal(titles.length, 1);
      assert.equal(titles[0].childNodes.map((node) => node.value ?? '').join(''), title);
      assert.equal(meta('description'), issue.description[lang]);
      assert.equal(meta('og:description'), issue.description[lang]);
      assert.equal(description, issue.description[lang]);
      assert.ok(description.length <= 200);
      assert.equal(meta('og:image'), image);
      assert.equal(image, new URL(issue.socialImage[lang], 'https://ursb.me').href);
      assert.notEqual(image, new URL(issue.shareCover[lang], 'https://ursb.me').href);
      assert.equal(meta('og:image:type'), 'image/jpeg');
      assert.equal(meta('og:image:width'), '1200');
      assert.equal(meta('og:image:height'), '600');
      assert.equal(meta('twitter:image:alt'), meta('og:image:alt'));
      assert.ok(meta('og:image:alt').length > 20);
      assert.equal(meta('og:url'), new URL(issue.href[lang], 'https://ursb.me').href);
      const canonical = document.filter((node) => node.tagName === 'link' && attr(node, 'rel') === 'canonical');
      assert.equal(canonical.length, 1);
      assert.equal(attr(canonical[0], 'href'), meta('og:url'));
    });

    test(`${lang} issue ${issue.number} ships a compact landscape JPEG and preserves its A4 download`, async () => {
      // Given the actual generated image and unchanged downloadable cover.
      const [card, portrait] = await Promise.all([
        readFile(built(issue.socialImage[lang])), readFile(built(issue.shareCover[lang])),
      ]);
      // When decoded by an image consumer.
      const [social, cover] = await Promise.all([sharp(card).metadata(), sharp(portrait).metadata()]);
      // Then the link image has the intended geometry/budget and the print image stays A4.
      assert.equal(social.format, 'jpeg');
      assert.deepEqual([social.width, social.height], [1200, 600]);
      assert.ok(card.byteLength < 1024 * 1024);
      assert.equal(cover.format, 'png');
      assert.ok(Math.abs(cover.height / cover.width - 297 / 210) < 0.001);
    });
  }
}
