import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchQueryState } from '../../../src/components/search-delight/query-state.ts';

test('only actual completed search selects a reaction', () => {
  const state = new SearchQueryState();
  state.input('Astro');
  const ticket = state.confirm();
  assert.ok(ticket);
  assert.equal(state.reaction(ticket), null);
  state.complete('Astro', 0);
  assert.equal(state.reaction(ticket), null);
  state.start('Astro');
  assert.equal(state.reaction(ticket), null);
  state.complete('Astro', 3);
  assert.equal(state.reaction(ticket), 'found');
  assert.equal(state.confirm(), null);
});

test('empty is real zero results, not loading or an invalid count', () => {
  const state = new SearchQueryState();
  state.input('missing'); state.start('missing');
  const ticket = state.confirm();
  assert.ok(ticket);
  state.complete('missing', -1);
  assert.equal(state.reaction(ticket), null);
  state.complete('missing', 0);
  assert.equal(state.reaction(ticket), 'empty');
});

test('new input and clear invalidate old results and even repeated text', () => {
  const state = new SearchQueryState();
  state.input('A'); state.start('A');
  const old = state.confirm();
  assert.ok(old);
  state.input('B'); state.complete('A', 2);
  const current = state.confirm();
  assert.ok(current);
  assert.equal(state.reaction(current), null);
  assert.equal(state.current(old), false);
  state.input('A');
  assert.equal(state.current(old), false);
  state.input('  ');
  assert.equal(state.confirm(), null);
});
