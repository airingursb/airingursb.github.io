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
  assert.equal(originals.length, 4);
  assert.equal(translations.length, 4);
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
      for (const section of issue.sections) {
        if (!section.quote) continue;
        assert.ok(issue.letterIds.includes(section.source));
        const source = letters.find(letter => letter.id === section.source);
        assert.ok(source);
        assert.ok(source.reply.paragraphs.map(p => p.text).join(' ').includes(section.quote));
      }
    }
  }
});

// The second issue remains a private draft until its final exchange passes the 180-day rule.
test('The initial public catalog contains only the approved, mature first issue', () => {
  assert.deepEqual(issuesFor('zh').map(issue => issue.number), ['01']);
  assert.deepEqual(lettersFor('zh').map(letter => letter.id), ['output', 'practice', 'interest', 'mist']);
  for (const letter of lettersFor('zh')) {
    assert.ok(letter.reply.date < '2026-03-31');
  }
});
