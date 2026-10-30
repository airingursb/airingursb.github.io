/*
 * Comment avatar helper, shared by the post and notes comment UIs.
 *
 * Inlined as a classic script (PostLayout / notes pages import it with
 * `?raw`), so it must stay plain ES5-ish browser JS with no import/export.
 * Exposes `window.CommentAvatar`; tests load it in a node:vm context.
 *
 * Why: Gravatar wants a SHA-256 of the email, which crypto.subtle computes
 * asynchronously. The renderers build <img> HTML synchronously, so an
 * unresolved email gets a neutral placeholder plus data-avatar-email, and
 * hydrate()/observe() swap in the real URL once the hash resolves. prime()
 * lets callers hash a batch before the first render so it paints correctly.
 *
 * Since 2026-10 the comment API no longer returns other people's emails. Each
 * comment carries `avatar_key` (a server-side HMAC of the email, not an email
 * hash) and `is_author` instead; those win whenever they are present. The
 * email path stays for the visitor's own compose preview and for responses
 * from a server that has not been updated yet.
 */
(function (root) {
  var AUTHOR_AVATAR = '/images/airing-avatar-48.webp';
  var AUTHOR_EMAILS = ['me@ursb.me', 'airing@ursb.me', 'airingdeng@gmail.com'];
  // Neutral grey disc: shown only until the hash resolves (no broken image).
  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="#e5e5e5"/></svg>'
  );
  var GRAVATAR_DEFAULT = 'https://gravatar.com/avatar/?d=robohash&s=80';
  var cache = {};
  var pending = {};

  function normalize(email) { return String(email || '').trim().toLowerCase(); }
  function isAuthor(email) { return AUTHOR_EMAILS.indexOf(normalize(email)) !== -1; }
  function gravatarFromHash(hash) { return 'https://gravatar.com/avatar/' + hash + '?d=robohash&s=80'; }
  // avatar_key is not an email hash, so it never matches a real Gravatar
  // account; f=y forces the robohash default either way.
  function avatarFromKey(key) {
    return /^[0-9a-f]{16,64}$/.test(String(key || '')) ? 'https://gravatar.com/avatar/' + key + '?d=robohash&s=80&f=y' : GRAVATAR_DEFAULT;
  }
  // Server-provided identity first (is_author / avatar_key), else the email.
  function hasServerIdentity(c) { return !!c && (typeof c.is_author === 'boolean' || 'avatar_key' in c); }
  function isAuthorComment(c) {
    if (!c) return false;
    if (typeof c.is_author === 'boolean') return c.is_author;
    return isAuthor(c.email);
  }

  function sha256Hex(str) {
    var subtle = root.crypto && root.crypto.subtle;
    if (!subtle) return Promise.reject(new Error('crypto.subtle unavailable'));
    return subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  // Synchronous lookup: the final URL if known now, otherwise null.
  function peek(email) {
    var e = normalize(email);
    if (isAuthor(e)) return AUTHOR_AVATAR;
    if (!e) return GRAVATAR_DEFAULT;
    return cache[e] || null;
  }

  function resolve(email) {
    var known = peek(email);
    if (known) return Promise.resolve(known);
    var e = normalize(email);
    if (!pending[e]) {
      pending[e] = sha256Hex(e).then(function (h) {
        cache[e] = gravatarFromHash(h);
        return cache[e];
      }, function () {
        return GRAVATAR_DEFAULT;
      });
    }
    return pending[e];
  }

  function prime(emails) {
    return Promise.all((emails || []).map(resolve)).then(function () {}, function () {});
  }

  // Collect emails from comments and their nested replies.
  function emailsOf(comments, out) {
    out = out || [];
    (comments || []).forEach(function (c) {
      if (!c) return;
      if (c.email) out.push(c.email);
      if (c.replies) emailsOf(c.replies, out);
      if (c.children) emailsOf(c.children, out);
    });
    return out;
  }

  function escAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Attribute string for an <img>: `src="…"` (+ data-avatar-email while pending).
  function imgAttrs(comment) {
    var email = comment ? comment.email : '';
    if (isAuthorComment(comment)) return 'src="' + escAttr(AUTHOR_AVATAR) + '"';
    if (comment && comment.avatar) return 'src="' + escAttr(comment.avatar) + '"';
    if (hasServerIdentity(comment) && !email) return 'src="' + escAttr(avatarFromKey(comment.avatar_key)) + '"';
    var url = peek(email);
    if (url) return 'src="' + escAttr(url) + '"';
    resolve(email);
    return 'src="' + PLACEHOLDER + '" data-avatar-email="' + escAttr(normalize(email)) + '"';
  }

  function hydrateImg(img) {
    var email = img.getAttribute('data-avatar-email');
    if (email === null) return;
    img.removeAttribute('data-avatar-email');
    resolve(email).then(function (url) { img.src = url; });
  }

  function hydrate(scope) {
    scope = scope || root.document;
    if (!scope || !scope.querySelectorAll) return;
    if (scope.matches && scope.matches('img[data-avatar-email]')) hydrateImg(scope);
    Array.prototype.forEach.call(scope.querySelectorAll('img[data-avatar-email]'), hydrateImg);
  }

  var observing = false;
  function observe() {
    if (observing || !root.document || !root.MutationObserver) return;
    observing = true;
    new root.MutationObserver(function (records) {
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) hydrate(n); });
      });
    }).observe(root.document.documentElement, { childList: true, subtree: true });
    hydrate(root.document);
  }

  root.CommentAvatar = {
    AUTHOR_AVATAR: AUTHOR_AVATAR,
    AUTHOR_EMAILS: AUTHOR_EMAILS,
    PLACEHOLDER: PLACEHOLDER,
    normalize: normalize,
    isAuthor: isAuthor,
    isAuthorComment: isAuthorComment,
    avatarFromKey: avatarFromKey,
    gravatarFromHash: gravatarFromHash,
    sha256Hex: sha256Hex,
    peek: peek,
    resolve: resolve,
    prime: prime,
    emailsOf: emailsOf,
    imgAttrs: imgAttrs,
    hydrate: hydrate,
    observe: observe,
  };
})(typeof window !== 'undefined' ? window : globalThis);
