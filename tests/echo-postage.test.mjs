import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lettersFor } from '../src/features/echo/data/catalog.ts';
import { readerCharacters, readerForLetter } from '../src/features/echo/data/reader-characters.ts';

test('Each reader has a distinct fixed character, shared across their continuing exchanges and languages', () => {
  const readers = Object.values(readerCharacters);
  assert.equal(readers.length, 16);
  assert.equal(new Set(readers.map(reader => reader.character)).size, readers.length);
  for (const lang of ['zh', 'en']) {
    const aliases = new Map();
    const identities = new Map();
    for (const letter of lettersFor(lang)) {
      const reader = readerForLetter(letter.id);
      if (aliases.has(letter.code)) assert.equal(reader.id, aliases.get(letter.code));
      if (identities.has(reader.id)) assert.equal(letter.code, identities.get(reader.id));
      aliases.set(letter.code, reader.id);
      identities.set(reader.id, letter.code);
      const portrait = readFileSync(new URL(`../src/features/echo/assets/readers/${reader.character}.webp`, import.meta.url));
      assert.equal(portrait.subarray(8, 12).toString(), 'WEBP');
    }
    assert.equal(aliases.size, readers.length);
  }
  assert.throws(() => readerForLetter('not-assigned'), /Missing Echo reader identity/);
});

test('Every canonical correspondence has a distinct, sized RGBA postage asset in both languages', () => {
  const hashes = new Set();
  const chinese = lettersFor('zh');
  assert.deepEqual(lettersFor('en').map(letter => letter.id), chinese.map(letter => letter.id));
  for (const letter of chinese) {
    const image = readFileSync(new URL(`../src/features/echo/assets/postage/${letter.id}.png`, import.meta.url));
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${letter.id}: expected PNG`);
    assert.equal(image.readUInt32BE(16), 228, `${letter.id}: wrong delivery width`);
    assert.equal(image.readUInt32BE(20), 304, `${letter.id}: wrong delivery height`);
    assert.equal(image[25], 6, `${letter.id}: expected RGBA color type`);
    const hash = createHash('sha256').update(image).digest('hex');
    assert.ok(!hashes.has(hash), `${letter.id}: stamp reused by another correspondence`);
    hashes.add(hash);
  }
});

test('Repeated reader aliases represent only the verified ongoing correspondences', () => {
  const expected = [
    ['mist', 'evening-letter'],
    ['offer-autumn', 'offer-spring', 'offer-summer'],
    ['time-race', 'useful-hours'],
  ];
  for (const lang of ['zh', 'en']) {
    const groups = new Map();
    for (const letter of lettersFor(lang)) {
      if (!groups.has(letter.code)) groups.set(letter.code, []);
      groups.get(letter.code).push(letter.id);
      assert.equal(letter.incoming.sender, letter.code, `${letter.id}: inconsistent sender alias`);
      assert.equal(letter.reply.recipient, letter.code, `${letter.id}: inconsistent recipient alias`);
    }
    const repeated = [...groups.values()].filter(ids => ids.length > 1);
    assert.deepEqual(repeated, expected, `${lang}: accidental alias collision or broken reader continuity`);
  }
});
