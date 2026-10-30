import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  commitHash, replyHash, layoutGraph, prunePending, MAX_ARTICLE_LANES,
  APPROVED_TTL_MS, PENDING_TTL_MS,
} from '../src/lib/guestbook-graph.ts';

const item = (id, slug, extra = {}) => ({ type: 'post', id, post_slug: slug, nickname: 'n', content: 'c', created_at: '2026-10-01T00:00:00Z', ...extra });

test('short hashes are 7 hex, stable, and distinct across post / inline ids', () => {
  assert.match(commitHash('post', 386), /^[0-9a-f]{7}$/);
  assert.equal(commitHash('post', 386), commitHash('post', '386'));
  assert.notEqual(commitHash('post', 31), commitHash('inline', 31));
  assert.notEqual(replyHash({ type: 'post', id: 31 }), commitHash('post', 31));
});

test('main is lane 0, each post gets its own lane, HEAD is the newest commit', () => {
  const l = layoutGraph([item(5, 'guestbook'), item(4, 'a'), item(3, 'b'), item(2, 'a'), item(1, 'guestbook')], [], false);
  const commits = l.rows.filter((r) => r.kind === 'commit');
  assert.deepEqual(commits.map((r) => r.lane), [0, 1, 2, 1, 0]);
  assert.equal(commits[0].head, true);
  assert.equal(commits[0].deco, 'head');
  assert.deepEqual(commits.map((r) => r.deco), ['head', 'first', 'first', null, null]);
  assert.deepEqual(l.segments.map((s) => [s.slug, s.lane, s.from, s.to, s.open]), [['a', 1, 1, 3, false], ['b', 2, 2, 2, false]]);
});

test('the latest reply forks onto the rightmost lane, right after its commit', () => {
  const l = layoutGraph([item(2, 'a', { latest_reply: { nickname: 'Airing', is_author: true, content: 'r', created_at: '2026-10-02T00:00:00Z' } }), item(1, 'b')], [], true);
  assert.deepEqual(l.rows.map((r) => r.kind), ['commit', 'reply', 'commit']);
  assert.equal(l.rows[1].lane, l.replyLane);
  // 'a' has one visible commit, so 'b' reuses its lane; replies go right of it.
  assert.deepEqual(l.rows.filter((r) => r.kind === 'commit').map((r) => r.lane), [1, 1]);
  assert.equal(l.replyLane, 2);
  assert.equal(l.lanes, 3);
  assert.deepEqual(l.segments.map((s) => s.open), [false, true], 'older commits exist: the last branch on a lane keeps running');
});

test('pending commits sit on top of main; ended branches free their lane', () => {
  const many = [];
  for (let i = 0; i < 12; i++) many.push(item(100 - i, 'slug' + i));
  const l = layoutGraph(many, [{ id: 999, hash: 'abcdef1', nickname: 'me', content: 'hi', created_at: '', status: 'pending', at: 0 }], false);
  assert.equal(l.rows[0].kind, 'pend');
  assert.equal(l.rows[0].lane, 0);
  const lanes = l.rows.filter((r) => r.kind === 'commit').map((r) => r.lane);
  assert.ok(Math.max(...lanes) <= MAX_ARTICLE_LANES);
  assert.equal(Math.max(...lanes), 1, 'single-commit branches end at once, so one lane is reused');
});

test('prunePending drops what the feed carries and what expired', () => {
  const now = 10_000_000_000;
  const list = [
    { id: 1, status: 'pending', at: now - 1000 },
    { id: 2, status: 'pending', at: now - PENDING_TTL_MS - 1 },
    { id: 3, status: 'approved', at: now - APPROVED_TTL_MS - 1 },
    { id: 4, status: 'approved', at: now - 1000 },
    { id: 5, status: 'pending', at: now - 1000 },
    null, { id: 'x' },
  ];
  const kept = prunePending(list, [{ type: 'post', id: 5 }, { type: 'inline', id: 1 }], now);
  assert.deepEqual(kept.map((p) => p.id), [1, 4]);
  assert.deepEqual(prunePending('junk', [], now), []);
});
