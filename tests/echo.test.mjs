import test from 'node:test';
import assert from 'node:assert/strict';
import { localeOf, localPath } from '../src/features/echo/data/i18n.ts';
import { lettersFor, issuePath } from '../src/features/echo/data/catalog.ts';
import { letterPath } from '../src/features/echo/data/letters.ts';
import { issuesFor } from '../src/features/echo/data/issues.ts';

test('Echo uses the production bilingual route convention', () => {
  assert.equal(localPath('/', 'zh'), '/echo/');
  assert.equal(localPath('/', 'en'), '/en/echo/');
  assert.equal(issuePath('02', 'en'), '/en/echo/issues/02/');
  assert.equal(letterPath('output', 'en'), '/en/echo/letters/output/');
  assert.equal(localeOf('/en/echo/letters/output/'), 'en');
  assert.equal(localeOf('/echo/letters/output/'), 'zh');
});

test('English exchanges preserve original dates, paragraph order and redaction markers', () => {
  const originals = lettersFor('zh');
  const translations = lettersFor('en');
  assert.equal(originals.length, 8);
  assert.equal(translations.length, 8);
  for (const original of originals) {
    const translated = translations.find(letter => letter.id === original.id);
    assert.ok(translated);
    for (const part of ['incoming', 'reply']) {
      assert.equal(translated[part].date, original[part].date);
      assert.deepEqual(translated[part].paragraphs.map(p => [p.id, p.redaction, p.attachment]), original[part].paragraphs.map(p => [p.id, p.redaction, p.attachment]));
      assert.ok(translated[part].paragraphs.every(p => p.text.trim()));
    }
  }
});

test('Every issue quotation points to the exact reply in its own issue', () => {
  for (const lang of ['zh', 'en']) {
    const letters = lettersFor(lang);
    for (const issue of issuesFor(lang)) {
      assert.equal(issue.letterIds.length, 4);
      for (const section of [{ quote: issue.quote.join(''), source: issue.source }, ...issue.sections]) {
        if (!section.quote) continue;
        assert.ok(issue.letterIds.includes(section.source));
        const source = letters.find(letter => letter.id === section.source);
        assert.ok(source);
        assert.ok(source.reply.paragraphs.map(p => p.text).join(' ').includes(section.quote));
      }
      for (const section of issue.sections) for (const id of section.relatedSources ?? []) {
        assert.ok(issue.letterIds.includes(id));
        assert.ok(letters.some(letter => letter.id === id));
      }
    }
  }
});

test('The two-issue catalog keeps exchanges in their correct issue and chronology', () => {
  assert.deepEqual(issuesFor('zh').map(issue => issue.number), ['01', '02']);
  for (const letter of lettersFor('zh').filter(letter => (letter.issue ?? '01') === '01')) {
    assert.ok(letter.reply.date < '2026-03-31');
  }
  const career = lettersFor('zh').filter(letter => letter.issue === '02');
  assert.deepEqual(career.map(letter => letter.id), ['offer-autumn', 'offer-spring', 'offer-summer', 'four-options']);
  assert.deepEqual(career.map(letter => [letter.incoming.date, letter.reply.date]), [
    ['2024-11-18', '2024-11-18'], ['2025-04-17', '2025-04-18'], ['2025-06-20', '2025-06-20'], ['2026-04-04', '2026-04-04'],
  ]);
  for (const lang of ['zh', 'en']) for (const issue of issuesFor(lang)) {
    assert.ok(lettersFor(lang).filter(letter => issue.letterIds.includes(letter.id)).every(letter => (letter.issue ?? '01') === issue.number));
  }
});
