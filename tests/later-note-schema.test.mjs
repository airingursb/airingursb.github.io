import { test } from 'node:test';
import assert from 'node:assert/strict';
import { laterNoteSchema } from '../src/lib/later-note.ts';

test('author addendum requires a real calendar date and nonempty prose', () => {
  const note = { date: '2026-09-24', title: 'An update', paragraphs: ['A later thought.'] };
  assert.deepEqual(laterNoteSchema.parse(note), note);
  for (const invalid of [
    { ...note, date: '2026-02-30' },
    { ...note, title: '   ' },
    { ...note, paragraphs: [] },
    { ...note, paragraphs: ['   '] },
  ]) assert.equal(laterNoteSchema.safeParse(invalid).success, false);
});
