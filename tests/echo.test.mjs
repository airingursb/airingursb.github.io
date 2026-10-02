import test from 'node:test';
import assert from 'node:assert/strict';
import { localeOf, localPath, exchangeCount, archiveCount } from '../src/features/echo/data/i18n.ts';
import { lettersFor, issuePath } from '../src/features/echo/data/catalog.ts';
import { letterPath } from '../src/features/echo/data/letters.ts';
import { issuesFor } from '../src/features/echo/data/issues.ts';
import { editionRoutes } from '../src/features/echo/data/routes.ts';

test('Echo uses the production bilingual route convention', () => {
  assert.equal(localPath('/', 'zh'), '/echo/');
  assert.equal(localPath('/', 'en'), '/en/echo/');
  assert.equal(issuePath('02', 'en'), '/en/echo/issues/02/');
  assert.equal(letterPath('output', 'en'), '/en/echo/letters/output/');
  assert.equal(letterPath('practice', 'en', '06'), '/en/echo/letters/practice/?issue=06');
  assert.equal(localeOf('/en/echo/letters/output/'), 'en');
  assert.equal(localeOf('/echo/letters/output/'), 'zh');
});

test('English exchanges preserve original dates, paragraph order and redaction markers', () => {
  const originals = lettersFor('zh');
  const translations = lettersFor('en');
  assert.equal(originals.length, 20);
  assert.equal(translations.length, originals.length);
  for (const original of originals) {
    const translated = translations.find(letter => letter.id === original.id);
    assert.ok(translated);
    for (const part of ['incoming', 'reply']) {
      assert.equal(translated[part].date, original[part].date);
      assert.deepEqual(translated[part].paragraphs.map(p => [p.id, p.redaction, p.attachment]), original[part].paragraphs.map(p => [p.id, p.redaction, p.attachment]));
      assert.ok(translated[part].paragraphs.every(p => p.text.trim()));
    }
    assert.equal(translated.followups?.length, original.followups?.length);
    for (const [index, part] of (original.followups ?? []).entries()) {
      const english = translated.followups[index];
      assert.equal(english.id, part.id);
      assert.equal(english.date, part.date);
      assert.ok(!part.dateNote || english.dateNote);
      assert.deepEqual(english.paragraphs.map(p => [p.id, p.redaction, p.attachment]), part.paragraphs.map(p => [p.id, p.redaction, p.attachment]));
      assert.ok(english.paragraphs.every(p => p.text.trim()));
    }
  }
});

test('Every issue quotation points to the exact reply in its own issue', () => {
  for (const lang of ['zh', 'en']) {
    const letters = lettersFor(lang);
    for (const issue of issuesFor(lang)) {
      assert.ok(issue.letterIds.length > 0);
      assert.equal(new Set(issue.letterIds).size, issue.letterIds.length);
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

test('The catalog keeps exchanges in their correct issue and chronology', () => {
  assert.deepEqual(issuesFor('zh').map(issue => issue.number), Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')));
  for (const letter of lettersFor('zh').filter(letter => (letter.issue ?? '01') === '01')) {
    assert.ok(letter.reply.date < '2026-03-31');
  }
  const career = lettersFor('zh').filter(letter => letter.issue === '02');
  assert.deepEqual(career.map(letter => letter.id), ['offer-autumn', 'offer-spring', 'offer-summer', 'four-options']);
  assert.deepEqual(career.map(letter => [letter.incoming.date, letter.reply.date]), [
    ['2024-11-18', '2024-11-18'], ['2025-04-17', '2025-04-18'], ['2025-06-20', '2025-06-20'], ['2026-04-04', '2026-04-04'],
  ]);
  for (const lang of ['zh', 'en']) {
    const letters = lettersFor(lang), issues = issuesFor(lang);
    assert.equal(new Set(letters.map(letter => letter.id)).size, letters.length);
    for (const issue of issues) for (const id of issue.letterIds) assert.ok(letters.some(letter => letter.id === id), `${issue.number}: missing ${id}`);
    for (const letter of letters) {
      assert.ok(issues.find(issue => issue.number === (letter.issue ?? '01'))?.letterIds.includes(letter.id));
      if (letter.incoming.date && letter.reply.date) assert.ok(letter.incoming.date <= letter.reply.date, `${letter.id}: reversed dates`);
    }
  }
});

test('New transcripts preserve follow-up roles and honestly label missing dates', () => {
  for (const lang of ['zh', 'en']) {
    const letters = lettersFor(lang);
    for (const id of ['record-and-return', 'study-purpose']) {
      const letter = letters.find(letter => letter.id === id);
      assert.equal(letter.followups.length, 1);
      assert.equal(letter.followups[0].id, 'incoming-2');
      assert.equal(letter.followups[0].sender, letter.code);
      assert.equal(letter.followups[0].date, null);
      assert.ok(letter.followups[0].dateNote);
    }
    const messages = letters.find(letter => letter.id === 'work-boundaries');
    for (const part of [messages.incoming, messages.reply]) {
      assert.equal(part.date, null);
      assert.ok(part.dateNote.includes('2025'));
    }
  }
});

test('The July exchange retains its standard 180-day eligibility metadata', () => {
  for (const lang of ['zh', 'en']) {
    const issue = issuesFor(lang).find(issue => issue.number === '10');
    const reply = lettersFor(lang).find(letter => letter.id === 'starting-gently').reply;
    assert.equal(issue.releaseAfter, '2027-01-15');
    assert.equal((Date.parse(issue.releaseAfter) - Date.parse(reply.date)) / 86400000, 181);
  }
});

test('The third issue preserves two readers, the continuing thread and its original dates', () => {
  const rest = lettersFor('zh').filter(letter => letter.issue === '03');
  assert.deepEqual(rest.map(letter => letter.id), ['time-race', 'useful-hours', 'evening-letter']);
  assert.deepEqual(rest.map(letter => [letter.incoming.date, letter.reply.date]), [
    ['2025-02-08', '2025-02-10'], ['2025-02-12', '2025-02-14'], ['2025-10-09', '2025-10-24'],
  ]);
  assert.equal(new Set(rest.map(letter => letter.code)).size, 2);
  for (const lang of ['zh', 'en']) {
    const letters = lettersFor(lang);
    assert.equal(letters.find(l => l.id === 'time-race').code, letters.find(l => l.id === 'useful-hours').code);
    assert.equal(letters.find(l => l.id === 'evening-letter').code, letters.find(l => l.id === 'mist').code);
    const issue = issuesFor(lang).find(i => i.number === '03');
    assert.ok(issue.reflection?.question);
    assert.equal(issue.exercise, undefined);
    assert.equal(issue.sections.length, 4);
  }
});

test('Public analytics identifiers cover the catalog without containing letter content', () => {
  assert.deepEqual(editionRoutes.map(e => e.number), issuesFor('zh').map(e => e.number));
  for (const edition of editionRoutes) {
    assert.deepEqual([...edition.letters], issuesFor('zh').find(i => i.number === edition.number).letterIds);
  }
  assert.equal(exchangeCount(3, 'en'), '3 exchanges');
  assert.equal(exchangeCount(1, 'en'), '1 exchange');
  assert.equal(archiveCount(3, 11, 'zh'), '3 期专题 · 11 组往返');
});
