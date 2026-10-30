import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const SRC = readFileSync(new URL('../src/lib/comment-avatar.js', import.meta.url), 'utf8');
const GH = '/images/airing-avatar-48.webp';
const attr = (u) => u.replace(/&/g, '&amp;');
const sha = (s) => createHash('sha256').update(s).digest('hex');

function load() {
  const ctx = { crypto: globalThis.crypto, TextEncoder, Uint8Array, Array, Promise, String, encodeURIComponent };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return ctx.CommentAvatar;
}

test('all three author emails map to the blog avatar, sync and case-insensitive', () => {
  const CA = load();
  for (const e of ['me@ursb.me', 'airing@ursb.me', 'airingdeng@gmail.com', '  Airing@URSB.me ']) {
    assert.equal(CA.isAuthor(e), true, e);
    assert.equal(CA.peek(e), GH);
    assert.equal(CA.imgAttrs({ email: e }), `src="${attr(GH)}"`);
  }
  assert.equal(CA.isAuthor('someone@example.com'), false);
});

test('non-authors resolve to a per-email sha256 gravatar with robohash fallback', async () => {
  const CA = load();
  const a = await CA.resolve(' Kng@Example.com ');
  const b = await CA.resolve('other@example.com');
  assert.equal(a, `https://gravatar.com/avatar/${sha('kng@example.com')}?d=robohash&s=80`);
  assert.equal(b, `https://gravatar.com/avatar/${sha('other@example.com')}?d=robohash&s=80`);
  assert.notEqual(a, b);
});

test('imgAttrs: placeholder + data-avatar-email until primed, final URL after', async () => {
  const CA = load();
  const c = { email: 'reader@example.com' };
  const before = CA.imgAttrs(c);
  assert.match(before, /^src="data:image\/svg\+xml/);
  assert.match(before, /data-avatar-email="reader@example.com"/);
  await CA.prime(CA.emailsOf([{ email: 'x@example.com', replies: [c] }]));
  assert.equal(CA.imgAttrs(c), `src="${attr(`https://gravatar.com/avatar/${sha('reader@example.com')}?d=robohash&s=80`)}"`);
});

test('author identity overrides a legacy stored avatar', () => {
  const CA = load();
  const comment = { email: ' Me@URSB.me ', avatar: 'https://avatars.githubusercontent.com/u/10513408?v=4&s=80' };
  assert.equal(CA.imgAttrs(comment), `src="${attr(GH)}"`);
});

test('stored reader avatar wins and attributes are escaped', () => {
  const CA = load();
  assert.equal(CA.imgAttrs({ nickname: 'Airing', avatar: 'https://x/a.png?a=1&b="2"', email: 'reader@example.com' }), 'src="https://x/a.png?a=1&amp;b=&quot;2&quot;"');
  assert.match(CA.imgAttrs({ email: 'a"b@example.com' }), /data-avatar-email="a&quot;b@example.com"/);
});

test('emailsOf walks nested replies', () => {
  const CA = load();
  assert.deepEqual([...CA.emailsOf([{ email: 'a', replies: [{ email: 'b', replies: [{ email: 'c' }] }] }, { email: 'd' }])], ['a', 'b', 'c', 'd']);
});

// 2026-10: the API sends avatar_key + is_author instead of other people's emails.
test('server identity: is_author wins and avatar_key becomes a forced robohash', () => {
  const CA = load();
  const key = '99c2cb5f9c7b0405bce5bde47496f31b';
  assert.equal(CA.imgAttrs({ is_author: true, avatar_key: key }), `src="${attr(GH)}"`);
  assert.equal(CA.imgAttrs({ is_author: false, avatar_key: key }), `src="${attr(`https://gravatar.com/avatar/${key}?d=robohash&s=80&f=y`)}"`);
  assert.equal(CA.imgAttrs({ is_author: false, avatar_key: null }), `src="${attr('https://gravatar.com/avatar/?d=robohash&s=80')}"`);
  // A key that is not hex never reaches the URL.
  assert.equal(CA.avatarFromKey('"><script>'), 'https://gravatar.com/avatar/?d=robohash&s=80');
  assert.equal(CA.isAuthorComment({ is_author: true }), true);
  assert.equal(CA.isAuthorComment({ is_author: false, email: 'me@ursb.me' }), false, 'server flag beats the email');
  assert.equal(CA.isAuthorComment({ email: 'me@ursb.me' }), true, 'old API responses still work');
  assert.equal(CA.isAuthorComment(null), false);
  assert.deepEqual([...CA.emailsOf([{ avatar_key: key, replies: [{ avatar_key: key }] }])], []);
});
