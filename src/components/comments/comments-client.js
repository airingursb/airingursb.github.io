/*
 * Shared comment runtime for posts and notes: the bottom thread, inline
 * (highlight) comments in the right rail, the desktop popover and the mobile
 * sheet. Inlined as a classic script (`?raw`) by CommentsRuntime.astro, so it
 * stays plain ES5-ish browser JS; it needs window.CommentAvatar first.
 *
 * window.BlogComments.init(cfg):
 *   slug        API post_slug ('foo' for posts, 'note/foo' for notes)
 *   lang        'zh' | 'en' (page language)
 *   t           copy from strings.ts
 *   content     selector of the article body that can be highlighted
 *   grid        selector of the element card offsets are measured against
 *   rail        selector of the rail that holds #commentCards
 *   mobileMax   viewport width at/below which the mobile sheet is used
 *   anchors     true → language-independent data-aid anchors (posts)
 *   otherLangPath  same post in the other language (legacy cross-lang anchors)
 *
 * Every read and write has a visible state (loading / failed + retry /
 * invalid field / sending / sent / failed with the draft kept), announced
 * through role="status" lines — the same pattern as the Chinese Moments page.
 *
 * The request bodies sent to the comment API are part of the backend
 * contract — do not add, rename or drop fields here.
 */
(function (root) {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var PAGE_SIZE = 20;

  function init(cfg) {
    var API = 'https://chat.ursb.me';
    var SLUG = cfg.slug;
    var PAGE_LANG = cfg.lang === 'en' ? 'en' : 'zh';
    var T = cfg.t;
    var USER_KEY = 'blog-user-identity';
    var ANCHORS = !!cfg.anchors;

    function fmt(tpl, vars) {
      return String(tpl).replace(/\{(\w+)\}/g, function (_, k) { return vars && vars[k] != null ? vars[k] : ''; });
    }
    function hasCJK(s) { return /[㐀-鿿豈-﫿]/.test(s || ''); }
    // Origin language of a comment: explicit column if present, else inferred
    // from the quoted text's script (legacy rows created before the lang column).
    function commentLang(c) { return c.lang || (hasCJK(c.selected_text) ? 'zh' : 'en'); }

    var $ = function (id) { return document.getElementById(id); };
    var postContent = document.querySelector(cfg.content);
    var contentGrid = document.querySelector(cfg.grid);
    var commentRail = document.querySelector(cfg.rail);
    var commentCards = $('commentCards');
    var crEmpty = $('crEmpty');
    var fab = $('fabComment');
    var popover = $('commentPopover');
    var cipText = $('cipSelectedText');
    var cipNickname = $('cipNickname');
    var cipEmailInput = $('cipEmail');
    var cipArea = $('cipTextarea');
    var cipCancel = $('cipCancel');
    var cipSubmit = $('cipSubmit');
    var cipStatus = $('cipStatus');
    var sheet = $('mobileSheet');
    var msQuote = $('msQuote');
    var msBody = $('msBody');
    var msAuthor = $('msAuthor');
    var msTime = $('msTime');
    var msReplies = $('msReplies');
    var msReplyToggle = $('msReplyToggle');
    var msReplyForm = $('msReplyForm');
    var msRfNickname = $('msRfNickname');
    var msRfEmail = $('msRfEmail');
    var msRfTextarea = $('msRfTextarea');
    var msRfNotify = $('msRfNotify');
    var msRfSubmit = $('msRfSubmit');
    var msRfStatus = $('msRfStatus');

    var bcThread = $('bcThread');
    var bcCount = $('bcCount');
    var bcCompose = $('bcCompose');
    var bcNickname = $('bcNickname');
    var bcEmail = $('bcEmail');
    var bcWebsite = $('bcWebsite');
    var bcTextarea = $('bcTextarea');
    var bcNotify = $('bcNotify');
    var bcSubmit = $('bcSubmit');
    var bcStatus = $('bcStatus');
    var bcLoadMore = $('bcLoadMore');
    var bcReplyHint = $('bcReplyHint');
    var bcReplyName = $('bcReplyName');
    var bcReplyCancel = $('bcReplyCancel');
    var bcComposeAvatar = $('bcComposeAvatar');

    var pendingRange = null;
    var activeMobileComment = null;
    var sheetOpener = null;
    var inlineComments = [];
    var bottomComments = [];

    function isMobile() { return window.innerWidth <= cfg.mobileMax; }

    // Short date + time used on inline cards and the mobile sheet.
    function shortStamp(iso) {
      var d = new Date(iso);
      return d.toLocaleDateString(T.locale, { month: '2-digit', day: '2-digit' }) +
        ' ' + d.toLocaleTimeString(T.locale, { hour: '2-digit', minute: '2-digit' });
    }

    // --- Status lines + validation (shared by every form) ---
    function setStatus(el, msg, kind) {
      if (!el) return;
      el.textContent = msg || '';
      el.classList.toggle('is-error', kind === 'error');
      el.classList.toggle('is-ok', kind === 'ok');
    }
    function setInvalid(el, on) {
      el.classList.toggle('cip-error', !!on);
      if (on) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
    }
    // fields: [{ el, label, required, email }] → true when valid; otherwise
    // marks the fields, writes one sentence to `statusEl` and focuses the first.
    function validate(fields, statusEl) {
      var missing = [], badEmail = false, first = null;
      fields.forEach(function (f) {
        var v = f.el.value.trim(), bad = false;
        if (f.required && !v) { missing.push(f.label); bad = true; }
        else if (f.email && v && !EMAIL_RE.test(v)) { badEmail = true; bad = true; }
        setInvalid(f.el, bad);
        if (bad && !first) first = f.el;
      });
      if (!first) { setStatus(statusEl, ''); return true; }
      var msg = missing.length ? fmt(T.missing, { fields: missing.join(T.fieldSep) }) : '';
      if (badEmail) msg = msg ? msg + ' ' + T.badEmail : T.badEmail;
      setStatus(statusEl, msg, 'error');
      first.focus();
      return false;
    }
    // Typing into a flagged field clears its flag.
    function clearOnInput(container) {
      container.addEventListener('input', function (e) {
        if (e.target && e.target.getAttribute && e.target.getAttribute('aria-invalid')) setInvalid(e.target, false);
      });
    }
    function failMessage(err) {
      var detail = err && typeof (err.error || err.message) === 'string' ? (err.error || err.message) : '';
      return T.sendFail + (detail && detail.length < 120 ? ' (' + detail + ')' : '');
    }
    function setBusy(btn, busy, idleText) {
      btn.disabled = busy;
      btn.setAttribute('aria-busy', busy ? 'true' : 'false');
      btn.textContent = busy ? T.sending : idleText;
    }

    // --- User identity persistence (shared with the homepage guestbook) ---
    // Saved only after a successful send; merges so a form without a website
    // field never wipes the stored website.
    function getSavedIdentity() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)) || {}; } catch (e) { return {}; }
    }
    function saveIdentity(patch) {
      try {
        var cur = getSavedIdentity();
        for (var k in patch) if (patch[k] !== undefined) cur[k] = patch[k];
        localStorage.setItem(USER_KEY, JSON.stringify(cur));
      } catch (e) {}
    }
    function restoreIdentity() {
      var id = getSavedIdentity();
      if (id.nickname) { cipNickname.value = id.nickname; bcNickname.value = id.nickname; }
      if (id.email) { cipEmailInput.value = id.email; bcEmail.value = id.email; updateComposeAvatar(id.email); }
      if (id.website) bcWebsite.value = id.website;
    }

    // Avatars: see src/lib/comment-avatar.js (authors -> GitHub avatar, everyone
    // else -> per-email SHA-256 Gravatar with robohash fallback).
    var CA = root.CommentAvatar;
    CA.observe();
    function commentAvatarAttrs(comment) { return CA.imgAttrs(comment); }
    function authorTag(c) {
      return c && c.email && CA.isAuthor(c.email) ? '<span class="cm-author-tag">' + esc(T.author) + '</span>' : '';
    }
    function updateComposeAvatar(email) {
      if (!email) return;
      CA.resolve(email).then(function (url) { if (CA.normalize(bcEmail.value) === CA.normalize(email)) bcComposeAvatar.src = url; });
    }
    var avatarTimer;
    bcEmail.addEventListener('input', function () {
      clearTimeout(avatarTimer);
      avatarTimer = setTimeout(function () { updateComposeAvatar(bcEmail.value); }, 500);
    });

    // --- API helpers ---
    function handleResponse(r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) return Promise.reject(data);
        return data;
      });
    }
    function apiGet(path) {
      return fetch(API + path, { headers: { 'Origin': location.origin } }).then(handleResponse);
    }
    function apiPost(path, body) {
      return fetch(API + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(handleResponse);
    }

    // =================================================================
    // INLINE (HIGHLIGHT) COMMENTS — right rail
    // =================================================================

    // Highlights are <span class="comment-highlight" role="mark">, not <mark>:
    // read-later/annotation extensions (e.g. Cubox) reset `mark` styles with
    // !important and erased every highlight.
    function isHighlight(el) { return !!el && el.classList.contains('comment-highlight'); }

    function wrapRange(range, id) {
      var hl = document.createElement('span');
      hl.className = 'comment-highlight';
      hl.setAttribute('role', 'mark');
      hl.dataset.commentId = id;
      hl.id = 'inline-' + id; // deep-link target for the guestbook feed
      try { range.surroundContents(hl); }
      catch (e) {
        var fragment = range.extractContents();
        hl.appendChild(fragment);
        range.insertNode(hl);
      }
      return hl;
    }

    // Find a Range spanning `searchText` inside `root`. Walks all text nodes,
    // concatenates them, indexOf, then maps back to the Range endpoints, so
    // selections that cross element boundaries still resolve.
    function findRangeByText(root, searchText, fromIndex) {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [];
      var fullText = '';
      var n;
      while ((n = walker.nextNode())) {
        nodes.push({ node: n, start: fullText.length });
        fullText += n.textContent;
      }
      // Bias toward the stored offset so a passage repeated inside the same
      // block resolves to the right occurrence; fall back to the first.
      var idx = fullText.indexOf(searchText, fromIndex || 0);
      if (idx === -1 && fromIndex) idx = fullText.indexOf(searchText);
      if (idx === -1) return null;
      var endIdx = idx + searchText.length;
      var startNode = null, startOffset = 0, endNode = null, endOffset = 0;
      for (var i = 0; i < nodes.length; i++) {
        var entry = nodes[i];
        var entryEnd = entry.start + entry.node.textContent.length;
        if (startNode === null && idx >= entry.start && idx <= entryEnd) {
          startNode = entry.node;
          startOffset = idx - entry.start;
        }
        if (endIdx >= entry.start && endIdx <= entryEnd) {
          endNode = entry.node;
          endOffset = endIdx - entry.start;
          break;
        }
      }
      if (!startNode || !endNode) return null;
      var range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      return range;
    }

    // The block a comment is anchored to (language-independent data-aid).
    function anchorBlock(c) {
      if (!ANCHORS || !c.anchor_id) return null;
      return postContent.querySelector('[data-aid="' + c.anchor_id + '"]');
    }

    // Element used to position/scroll a card: the exact highlight, else the
    // zero-size block-level anchor.
    function anchorElFor(id) {
      return postContent.querySelector(
        '.comment-highlight[data-comment-id="' + id + '"], .cm-block-anchor[data-comment-id="' + id + '"]'
      );
    }

    // Cross-language (or quote-not-found) fallback: tag the block and drop a
    // zero-size anchor at its start for the rail card to line up against.
    function markBlockLevel(block, id) {
      block.classList.add('has-inline-note');
      var a = document.createElement('span');
      a.className = 'cm-block-anchor';
      a.dataset.commentId = id;
      a.setAttribute('aria-hidden', 'true');
      block.insertBefore(a, block.firstChild);
      return a;
    }

    function nearestAnchorBlock(node) {
      var el = node && node.nodeType === 3 ? node.parentNode : node;
      while (el && el !== postContent) {
        if (el.dataset && el.dataset.aid != null) return el;
        el = el.parentNode;
      }
      return null;
    }

    // Character offset of (container, offset) within a block's text; mirrors
    // findRangeByText's walk so create-time and restore-time offsets line up.
    function offsetWithinBlock(block, container, offset) {
      var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null, false);
      var total = 0, n;
      while ((n = walker.nextNode())) {
        if (n === container) return total + offset;
        total += n.textContent.length;
      }
      return total;
    }

    // Fetch + parse the other-language rendered blocks once: [{aid, text}].
    var _otherLangBlocks = null;
    function getOtherLangBlocks() {
      if (_otherLangBlocks) return _otherLangBlocks;
      _otherLangBlocks = fetch(cfg.otherLangPath, { credentials: 'omit' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (html) {
          if (!html) return [];
          var doc = new DOMParser().parseFromString(html, 'text/html');
          var rootEl = doc.querySelector(cfg.content) || doc.body;
          if (!rootEl) return [];
          var out = [];
          rootEl.querySelectorAll('[data-aid]').forEach(function (el) {
            out.push({ aid: el.getAttribute('data-aid'), text: el.textContent });
          });
          return out;
        })
        .catch(function () { return []; });
      return _otherLangBlocks;
    }

    // Legacy cross-language highlights without an anchor_id: find the quote
    // in the other language's blocks and adopt that block's data-aid.
    function resolveCrossLangAnchors() {
      if (!ANCHORS || !cfg.otherLangPath) return Promise.resolve();
      var needy = inlineComments.filter(function (c) {
        return c.selected_text && !c.anchor_id && commentLang(c) !== PAGE_LANG &&
          !findRangeByText(postContent, c.selected_text);
      });
      if (!needy.length) return Promise.resolve();
      return getOtherLangBlocks().then(function (blocks) {
        if (!blocks.length) return;
        needy.forEach(function (c) {
          for (var i = 0; i < blocks.length; i++) {
            if (blocks[i].text.indexOf(c.selected_text) !== -1) { c.anchor_id = blocks[i].aid; break; }
          }
        });
      });
    }

    function restoreHighlights() {
      if (!postContent) return;
      inlineComments.forEach(function (c) {
        if (!c.selected_text) return;
        if (anchorElFor(c.id)) return; // already painted/anchored
        if (!ANCHORS) {
          var r = findRangeByText(postContent, c.selected_text);
          if (r) wrapRange(r, c.id);
          return;
        }
        var block = anchorBlock(c);
        if (commentLang(c) === PAGE_LANG) {
          var range = block
            ? findRangeByText(block, c.selected_text, c.range_start || 0)
            : findRangeByText(postContent, c.selected_text);
          if (range) { wrapRange(range, c.id); return; }
          if (block) markBlockLevel(block, c.id);
        } else if (block) {
          markBlockLevel(block, c.id);
        }
      });
    }

    function flash(el, ms) {
      el.classList.add('highlight-flash');
      setTimeout(function () { el.classList.remove('highlight-flash'); }, ms || 1000);
    }

    // Deep link: …#inline-<id> (from the homepage guestbook feed) scrolls to
    // and flashes that highlight once it has been painted.
    function scrollToHashHighlight() {
      var m = /^#inline-(\d+)$/.exec(location.hash || '');
      if (!m || !postContent) return;
      var target = anchorElFor(m[1]);
      if (!target) return;
      var flashEl = isHighlight(target) ? target : target.closest('[data-aid]') || target;
      requestAnimationFrame(function () {
        flashEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(flashEl, 1200);
      });
    }

    function offsetFromGrid(el) {
      var top = 0;
      while (el && el !== contentGrid) { top += el.offsetTop; el = el.offsetParent; }
      return top;
    }

    function layoutCards() {
      if (!commentCards || !commentRail || !postContent) return;
      var cards = commentCards.querySelectorAll(':scope > .cm-card');
      if (!cards.length) { commentCards.style.minHeight = ''; return; }
      var railOffset = offsetFromGrid(commentRail);
      var positions = [];
      cards.forEach(function (card) {
        var anchor = anchorElFor(card.dataset.commentId);
        var desiredTop = 0;
        if (anchor) desiredTop = offsetFromGrid(anchor) - railOffset;
        positions.push({ card: card, desired: desiredTop, height: card.offsetHeight });
      });
      positions.sort(function (a, b) { return a.desired - b.desired; });
      var GAP = 8, nextAvailable = 0;
      positions.forEach(function (p) {
        var top = Math.max(p.desired, nextAvailable);
        p.card.style.top = top + 'px';
        nextAvailable = top + p.height + GAP;
      });
      commentCards.style.minHeight = nextAvailable + 'px';
    }

    function repliesMarkup(replies, prefix) {
      return replies.map(function (r) {
        return '<div class="' + prefix + '-reply' + (prefix === 'ms' ? '-item' : '') + '">' +
          '<div class="' + prefix + '-reply-header">' +
            '<img class="' + prefix + '-reply-avatar" ' + commentAvatarAttrs(r) + ' alt="" />' +
            '<span class="' + prefix + '-reply-name">' + esc(r.nickname) + countryFlag(r) + authorTag(r) + '</span>' +
            '<span class="' + prefix + '-reply-time">' + shortStamp(r.created_at) + '</span>' +
          '</div>' +
          '<div class="' + prefix + '-reply-body">' + esc(r.comment) + '</div>' +
        '</div>';
      }).join('');
    }

    function buildInlineCard(c) {
      if (!c.replies) c.replies = [];
      var card = document.createElement('div');
      card.className = 'cm-card';
      card.dataset.commentId = c.id;
      // L8: the card is reachable by keyboard; Enter/Space jumps to the passage.
      card.tabIndex = 0;
      card.setAttribute('aria-label', fmt(T.highlightLabel, { name: c.nickname || '' }) + ' “' + trunc(c.selected_text, 50) + '”');

      var anchorEl = anchorElFor(c.id);
      var exact = isHighlight(anchorEl);
      var hlEl = exact ? anchorEl : (anchorEl ? anchorEl.closest('[data-aid]') : null);
      var activeClass = exact ? 'highlight-active' : 'inline-note-active';
      var crossLang = commentLang(c) !== PAGE_LANG;
      var uid = 'cm' + c.id;

      // Tag a card whose highlight was made on the other language version.
      var langTag = (ANCHORS && crossLang)
        ? '<span class="cm-card-lang" title="' + esc(T.otherLang) + '">' + (commentLang(c) === 'en' ? 'EN' : '中') + '</span>'
        : '';

      card.innerHTML =
        '<div class="cm-card-author">' +
          '<img ' + commentAvatarAttrs(c) + ' class="cm-card-avatar" alt="" />' +
          '<span class="cm-card-name">' + esc(c.nickname) + countryFlag(c) + authorTag(c) + '</span>' +
        '</div>' +
        '<div class="cm-card-quote">' + langTag + '“' + esc(trunc(c.selected_text, 50)) + '”</div>' +
        '<div class="cm-card-body">' + esc(c.comment) + '</div>' +
        '<div class="cm-card-footer">' +
          '<time class="cm-card-time" datetime="' + esc(c.created_at) + '">' + shortStamp(c.created_at) + '</time>' +
        '</div>' +
        (c.replies.length ? '<div class="cm-replies">' + repliesMarkup(c.replies, 'cm') + '</div>' : '') +
        '<p class="cm-status cm-card-status" role="status" aria-live="polite"></p>' +
        '<button type="button" class="cm-reply-btn" aria-expanded="false" aria-controls="' + uid + '-form">' + esc(T.reply) + '</button>' +
        '<div class="cm-reply-form" id="' + uid + '-form" hidden>' +
          '<div class="cm-rf-identity">' +
            '<label class="cm-sr-only" for="' + uid + '-name">' + esc(T.nickname) + '</label>' +
            '<input class="cm-rf-input" id="' + uid + '-name" type="text" autocomplete="nickname" placeholder="' + esc(T.nickname) + '" required />' +
            '<label class="cm-sr-only" for="' + uid + '-email">' + esc(T.email) + '</label>' +
            '<input class="cm-rf-input" id="' + uid + '-email" type="email" autocomplete="email" placeholder="' + esc(T.email) + '" />' +
          '</div>' +
          '<label class="cm-sr-only" for="' + uid + '-text">' + esc(T.replyLabel) + '</label>' +
          '<textarea class="cm-rf-textarea" id="' + uid + '-text" placeholder="' + esc(T.replyPlaceholder) + '" rows="2" required></textarea>' +
          '<label class="cm-rf-notify"><input type="checkbox" checked /> ' + esc(T.notifyShort) + '</label>' +
          '<p class="cm-status cm-rf-status" role="status" aria-live="polite"></p>' +
          '<div class="cm-rf-actions">' +
            '<button type="button" class="cm-rf-cancel">' + esc(T.cancel) + '</button>' +
            '<button type="button" class="cm-rf-submit">' + esc(T.reply) + '</button>' +
          '</div>' +
        '</div>';

      function activate(on) {
        if (hlEl) hlEl.classList.toggle(activeClass, on);
        card.classList.toggle('cm-card-active', on);
      }
      function jumpToPassage(focusIt) {
        if (!hlEl) return;
        hlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flash(hlEl);
        if (focusIt && exact) hlEl.focus({ preventScroll: true });
      }
      card.addEventListener('mouseenter', function () { activate(true); });
      card.addEventListener('mouseleave', function () { activate(false); });
      card.addEventListener('focusin', function () { activate(true); });
      card.addEventListener('focusout', function (e) { if (!card.contains(e.relatedTarget)) activate(false); });
      card.addEventListener('click', function (e) {
        if (e.target.closest('.cm-reply-btn') || e.target.closest('.cm-reply-form')) return;
        jumpToPassage(false);
      });
      card.addEventListener('keydown', function (e) {
        if (e.target !== card) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpToPassage(true); }
      });
      if (anchorEl) {
        anchorEl.addEventListener('mouseenter', function () { activate(true); });
        anchorEl.addEventListener('mouseleave', function () { activate(false); });
        anchorEl.addEventListener('click', function (e) {
          if (!isMobile()) return;
          e.preventDefault(); e.stopPropagation();
          openMobileSheet(c, anchorEl);
        });
        if (exact) {
          // L8: highlights are focusable; Enter opens the sheet on phones and
          // moves to the matching rail card on desktop.
          anchorEl.tabIndex = 0;
          anchorEl.setAttribute('aria-label', fmt(T.highlightLabel, { name: c.nickname || '' }));
          anchorEl.addEventListener('focus', function () { activate(true); });
          anchorEl.addEventListener('blur', function () { activate(false); });
          anchorEl.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            if (isMobile()) openMobileSheet(c, anchorEl);
            else { card.focus(); }
          });
        }
      }

      var replyBtn = card.querySelector('.cm-reply-btn');
      var replyForm = card.querySelector('.cm-reply-form');
      var rfInputs = replyForm.querySelectorAll('.cm-rf-input');
      var rfNickname = rfInputs[0];
      var rfEmail = rfInputs[1];
      var rfTextarea = replyForm.querySelector('.cm-rf-textarea');
      var rfNotify = replyForm.querySelector('.cm-rf-notify input');
      var rfCancel = replyForm.querySelector('.cm-rf-cancel');
      var rfSubmit = replyForm.querySelector('.cm-rf-submit');
      var rfStatus = replyForm.querySelector('.cm-rf-status');
      clearOnInput(replyForm);

      function toggleForm(open) {
        replyForm.hidden = !open;
        replyBtn.hidden = open;
        replyBtn.setAttribute('aria-expanded', String(open));
        layoutCards();
      }
      replyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleForm(true);
        var identity = getSavedIdentity();
        if (identity.nickname && !rfNickname.value) rfNickname.value = identity.nickname;
        if (identity.email && !rfEmail.value) rfEmail.value = identity.email;
        (rfNickname.value ? rfTextarea : rfNickname).focus();
      });
      rfCancel.addEventListener('click', function (e) {
        e.stopPropagation();
        setStatus(rfStatus, '');
        toggleForm(false);
        replyBtn.focus();
      });
      replyForm.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.stopPropagation(); rfCancel.click(); }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') rfSubmit.click();
      });
      rfSubmit.addEventListener('click', function (e) {
        e.stopPropagation();
        if (rfSubmit.disabled) return;
        var ok = validate([
          { el: rfNickname, label: T.nickname, required: true },
          { el: rfEmail, label: T.email, email: true },
          { el: rfTextarea, label: T.contentField, required: true }
        ], rfStatus);
        layoutCards();
        if (!ok) return;
        var nickname = rfNickname.value.trim();
        var email = rfEmail.value.trim();
        setBusy(rfSubmit, true, T.reply);
        setStatus(rfStatus, '');
        apiPost('/api/inline-comments', {
          post_slug: SLUG,
          nickname: nickname,
          email: email,
          comment: rfTextarea.value.trim(),
          parent_id: c.id,
          notify_replies: rfNotify.checked
        }).then(function (res) {
          saveIdentity({ nickname: nickname, email: email });
          if (res.comment) c.replies.push(res.comment);
          renderInlineComments();
          announceOnCard(c.id, T.replySent);
        }).catch(function (err) {
          setBusy(rfSubmit, false, T.reply);
          setStatus(rfStatus, failMessage(err), 'error');
          layoutCards();
        });
      });

      return card;
    }

    function announceOnCard(id, msg) {
      var card = commentCards && commentCards.querySelector('.cm-card[data-comment-id="' + id + '"]');
      if (!card) return;
      setStatus(card.querySelector('.cm-card-status'), msg, 'ok');
      card.querySelector('.cm-reply-btn').focus({ preventScroll: true });
    }

    function renderInlineComments() {
      if (!commentCards) return;
      commentCards.innerHTML = '';
      if (crEmpty) {
        crEmpty.innerHTML = '<p>' + esc(T.railEmpty) + '</p>';
        crEmpty.style.display = (inlineComments.length || crEmpty.classList.contains('cm-rail-state')) ? 'none' : '';
      }
      inlineComments.forEach(function (c) { commentCards.appendChild(buildInlineCard(c)); });
      requestAnimationFrame(function () { requestAnimationFrame(layoutCards); });
    }

    function showInlineLoadError() {
      if (!crEmpty && commentCards) {
        // Notes have no empty-state box in their sidebar; add one for the error.
        crEmpty = document.createElement('div');
        crEmpty.className = 'cr-empty cm-rail-state';
        commentCards.parentNode.insertBefore(crEmpty, commentCards);
      }
      if (!crEmpty) return;
      crEmpty.style.display = '';
      crEmpty.innerHTML = '<p class="cm-status is-error" role="status">' + esc(T.inlineLoadFail) +
        ' <button type="button" class="cm-retry">' + esc(T.retry) + '</button></p>';
      crEmpty.querySelector('.cm-retry').addEventListener('click', function () {
        if (commentRail) { commentRail.tabIndex = -1; commentRail.focus({ preventScroll: true }); }
        loadInlineComments();
      });
    }

    // --- Mobile sheet: native <dialog> (Escape, focus trap, backdrop) ---
    function fillSheet(comment) {
      msQuote.textContent = '“' + trunc(comment.selected_text, 80) + '”';
      msBody.textContent = comment.comment;
      msAuthor.innerHTML = esc(comment.nickname) + countryFlag(comment) + authorTag(comment);
      msTime.textContent = shortStamp(comment.created_at);
      msReplies.innerHTML = repliesMarkup(comment.replies || [], 'ms');
    }
    function openMobileSheet(comment, opener) {
      activeMobileComment = comment;
      sheetOpener = opener || document.activeElement;
      fillSheet(comment);
      msReplyForm.hidden = true;
      msReplyToggle.hidden = false;
      setStatus(msRfStatus, '');
      document.documentElement.classList.add('cm-sheet-open');
      if (typeof sheet.showModal === 'function') sheet.showModal();
      else sheet.setAttribute('open', '');
      $('msClose').focus();
    }
    function closeMobileSheet() {
      if (typeof sheet.close === 'function' && sheet.open) sheet.close();
      else { sheet.removeAttribute('open'); onSheetClosed(); }
    }
    function onSheetClosed() {
      document.documentElement.classList.remove('cm-sheet-open');
      activeMobileComment = null;
      var back = sheetOpener;
      sheetOpener = null;
      if (back && back.isConnected && typeof back.focus === 'function') back.focus({ preventScroll: true });
    }
    sheet.addEventListener('close', onSheetClosed);
    // A click that lands on the <dialog> itself (not .ms-inner) is the backdrop.
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeMobileSheet(); });
    sheet.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !sheet.open) closeMobileSheet(); // non-modal fallback
    });
    $('msClose').addEventListener('click', closeMobileSheet);
    clearOnInput(msReplyForm);
    msReplyToggle.addEventListener('click', function () {
      msReplyForm.hidden = false;
      msReplyToggle.hidden = true;
      var id = getSavedIdentity();
      if (id.nickname && !msRfNickname.value) msRfNickname.value = id.nickname;
      if (id.email && !msRfEmail.value) msRfEmail.value = id.email;
      (msRfNickname.value ? msRfTextarea : msRfNickname).focus();
    });
    $('msRfCancel').addEventListener('click', function () {
      msReplyForm.hidden = true;
      msReplyToggle.hidden = false;
      setStatus(msRfStatus, '');
      msReplyToggle.focus();
    });
    msRfSubmit.addEventListener('click', function () {
      if (msRfSubmit.disabled || !activeMobileComment) return;
      if (!validate([
        { el: msRfNickname, label: T.nickname, required: true },
        { el: msRfEmail, label: T.email, email: true },
        { el: msRfTextarea, label: T.contentField, required: true }
      ], msRfStatus)) return;
      var parent = activeMobileComment;
      var nickname = msRfNickname.value.trim();
      var email = msRfEmail.value.trim();
      setBusy(msRfSubmit, true, T.reply);
      setStatus(msRfStatus, '');
      apiPost('/api/inline-comments', {
        post_slug: SLUG,
        nickname: nickname,
        email: email,
        comment: msRfTextarea.value.trim(),
        parent_id: parent.id,
        notify_replies: msRfNotify.checked,
      }).then(function (res) {
        saveIdentity({ nickname: nickname, email: email });
        if (res.comment) {
          if (!parent.replies) parent.replies = [];
          parent.replies.push(res.comment);
        }
        msRfTextarea.value = '';
        renderInlineComments();
        if (activeMobileComment === parent) {
          fillSheet(parent);
          msReplyForm.hidden = true;
          msReplyToggle.hidden = false;
          setStatus(msRfStatus, '');
          var note = document.createElement('p');
          note.className = 'cm-status is-ok';
          note.setAttribute('role', 'status');
          note.textContent = T.replySent;
          msReplies.appendChild(note);
          msReplyToggle.focus();
        }
      }).catch(function (err) {
        setStatus(msRfStatus, failMessage(err), 'error');
      }).then(function () {
        setBusy(msRfSubmit, false, T.reply);
      });
    });

    // --- FAB: show on text selection ---
    fab.style.display = 'none';
    popover.style.display = 'none';

    function selectionRange() {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
      var range = sel.getRangeAt(0);
      if (!postContent || !postContent.contains(range.commonAncestorContainer)) return null;
      if (!sel.toString().trim()) return null;
      return range;
    }
    document.addEventListener('mouseup', function () {
      if (popover.style.display !== 'none') return;
      if (isMobile()) { fab.style.display = 'none'; return; }
      var range = selectionRange();
      if (!range) { fab.style.display = 'none'; return; }
      var rect = range.getBoundingClientRect();
      fab.style.display = 'flex';
      fab.style.top = (rect.top + window.scrollY - 36) + 'px';
      fab.style.left = (rect.right + window.scrollX + 8) + 'px';
      pendingRange = range.cloneRange();
    });
    document.addEventListener('selectionchange', function () {
      if (!isMobile()) return;
      var range = selectionRange();
      if (!range) { fab.style.display = 'none'; return; }
      var rect = range.getBoundingClientRect();
      fab.style.display = 'flex';
      fab.style.top = (rect.bottom + window.scrollY + 8) + 'px';
      fab.style.left = Math.max(8, rect.left + window.scrollX + (rect.width / 2) - (fab.offsetWidth || 36) / 2) + 'px';
      pendingRange = range.cloneRange();
    });
    document.addEventListener('mousedown', function (e) {
      if (fab.contains(e.target) || popover.contains(e.target)) return;
      if (popover.style.display === 'none') fab.style.display = 'none';
    });

    clearOnInput(popover);
    fab.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!pendingRange) return;
      var selectedText = pendingRange.toString().trim();
      if (!selectedText) return;
      cipText.textContent = '“' + trunc(selectedText, 60) + '”';
      cipArea.value = '';
      setStatus(cipStatus, '');
      [cipNickname, cipArea].forEach(function (el) { setInvalid(el, false); });
      var rect = pendingRange.getBoundingClientRect();
      if (isMobile()) {
        popover.style.top = (rect.bottom + window.scrollY + 12) + 'px';
        popover.style.left = '50%';
        popover.style.transform = 'translateX(-50%)';
      } else {
        popover.style.top = (rect.top + window.scrollY) + 'px';
        popover.style.left = (postContent.getBoundingClientRect().right + 24) + 'px';
        popover.style.transform = '';
      }
      popover.style.display = 'block';
      fab.style.display = 'none';
      (cipNickname.value ? cipArea : cipNickname).focus();
    });

    function closePopover() {
      popover.style.display = 'none';
      pendingRange = null;
      setStatus(cipStatus, '');
      window.getSelection().removeAllRanges();
    }
    cipCancel.addEventListener('click', closePopover);

    cipSubmit.addEventListener('click', function () {
      if (cipSubmit.disabled) return;
      if (!pendingRange) { setStatus(cipStatus, T.needSelection, 'error'); return; }
      if (!validate([
        { el: cipNickname, label: T.nickname, required: true },
        { el: cipEmailInput, label: T.email, email: true },
        { el: cipArea, label: T.contentField, required: true }
      ], cipStatus)) return;

      var range = pendingRange;
      var text = cipArea.value.trim();
      var nickname = cipNickname.value.trim();
      var email = cipEmailInput.value.trim();
      var selectedText = range.toString().trim();

      var body;
      if (ANCHORS) {
        // Anchor to a language-independent block id + block-local offsets so
        // it can be re-located on the other-language version of the post.
        var block = nearestAnchorBlock(range.startContainer);
        var anchorId = block ? (block.dataset.aid || '') : '';
        var rangeStart = 0, rangeEnd = selectedText.length;
        if (block) {
          rangeStart = offsetWithinBlock(block, range.startContainer, range.startOffset);
          rangeEnd = offsetWithinBlock(block, range.endContainer, range.endOffset);
        }
        body = {
          post_slug: SLUG, nickname: nickname, email: email, selected_text: selectedText,
          comment: text, anchor_id: anchorId, lang: PAGE_LANG,
          range_start: rangeStart, range_end: rangeEnd, notify_replies: true
        };
      } else {
        body = {
          post_slug: SLUG, nickname: nickname, email: email, selected_text: selectedText,
          comment: text, range_start: 0, range_end: selectedText.length, notify_replies: true
        };
      }

      setBusy(cipSubmit, true, T.inlineSubmit);
      setStatus(cipStatus, '');
      apiPost('/api/inline-comments', body).then(function (res) {
        saveIdentity({ nickname: nickname, email: email });
        if (res.comment) {
          if (ANCHORS && !res.comment.lang) res.comment.lang = PAGE_LANG;
          wrapRange(range, res.comment.id);
          inlineComments.push(res.comment);
          renderInlineComments();
        }
        closePopover();
        if (res.comment) announceOnCard(res.comment.id, T.sent);
      }).catch(function (err) {
        // Keep the popover, the selection and the draft; say what happened.
        setStatus(cipStatus, failMessage(err), 'error');
      }).then(function () {
        setBusy(cipSubmit, false, T.inlineSubmit);
      });
    });

    // L4: shortcuts work from any field in the popover, not only the textarea.
    popover.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); cipSubmit.click(); }
      if (e.key === 'Escape') { e.preventDefault(); closePopover(); }
    });

    var layoutTimer;
    window.addEventListener('resize', function () {
      clearTimeout(layoutTimer);
      layoutTimer = setTimeout(layoutCards, 60);
    });

    function loadInlineComments() {
      if (crEmpty) { crEmpty.style.display = 'none'; }
      apiGet('/api/inline-comments?post_slug=' + encodeURIComponent(SLUG)).then(function (res) {
        inlineComments = res.comments || [];
        var avatarsReady = CA.prime(CA.emailsOf(inlineComments)).catch(function () {});
        // Resolve legacy cross-language anchors (best-effort), then paint.
        return Promise.all([resolveCrossLangAnchors().catch(function () {}), avatarsReady]).then(function () {
          restoreHighlights();
          renderInlineComments();
          scrollToHashHighlight();
        });
      }).catch(showInlineLoadError);
    }

    // =================================================================
    // BOTTOM COMMENTS
    // =================================================================
    var visibleRoots = PAGE_SIZE;
    var expanded = {};
    var replyTarget = null; // { id, prefix }

    function countLabel(n) { return fmt(n === 1 ? T.countOne : T.count, { n: n }); }

    function loadBottomComments(retrying) {
      bcCount.textContent = T.countPending;
      bcThread.setAttribute('aria-busy', 'true');
      bcThread.innerHTML = '<p class="bc-state" role="status" tabindex="-1">' + esc(T.loading) + '</p>';
      // A retry removes the button that had focus; keep focus in the thread.
      if (retrying === true) bcThread.firstChild.focus();
      bcLoadMore.hidden = true;
      apiGet('/api/comments?post_slug=' + encodeURIComponent(SLUG)).then(function (res) {
        bottomComments = res.comments || [];
        return CA.prime(CA.emailsOf(bottomComments)).catch(function () {});
      }).then(function () {
        bcThread.removeAttribute('aria-busy');
        renderBottomComments();
      }, function () {
        bcThread.removeAttribute('aria-busy');
        bcCount.textContent = T.countPending;
        bcThread.innerHTML = '<p class="bc-state is-error" role="status">' + esc(T.loadFail) +
          ' <button type="button" class="cm-retry">' + esc(T.retry) + '</button></p>';
        bcThread.querySelector('.cm-retry').addEventListener('click', function () { loadBottomComments(true); });
      });
    }

    // Re-render when crossing the mobile/desktop breakpoint so the nesting cap
    // (1 vs 4 levels) follows the viewport.
    function bcMaxDepth() { return window.matchMedia('(max-width: 640px)').matches ? 1 : 4; }
    var bcLastMaxDepth = bcMaxDepth();
    var bcResizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(bcResizeTimer);
      bcResizeTimer = setTimeout(function () {
        var d = bcMaxDepth();
        if (d !== bcLastMaxDepth && bottomComments.length) {
          bcLastMaxDepth = d;
          renderBottomComments();
        }
      }, 200);
    });

    function threadRoots() {
      var roots = [];
      var byId = {};
      bottomComments.forEach(function (c) { c._replies = []; byId[c.id] = c; });
      bottomComments.forEach(function (c) {
        if (c.parent_id && byId[c.parent_id]) byId[c.parent_id]._replies.push(c);
        else roots.push(c);
      });
      return roots;
    }

    function renderBottomComments(focusIndex) {
      bcThread.innerHTML = '';
      var count = bottomComments.length;
      bcCount.textContent = countLabel(count);
      document.dispatchEvent(new CustomEvent('comments:count', { detail: { count: count } }));

      var roots = threadRoots();
      if (!roots.length) {
        bcThread.innerHTML = '<p class="bc-state">' + esc(T.empty) + '</p>';
        bcLoadMore.hidden = true;
        return;
      }
      // Cap visual nesting: desktop indents up to 4 levels, mobile to 1;
      // deeper replies flatten as siblings at the capped level.
      var maxDepth = bcMaxDepth();
      var shown = roots.slice(0, visibleRoots);
      shown.forEach(function (c) { appendThread(c, bcThread, 0, maxDepth); });
      var rest = roots.length - shown.length;
      bcLoadMore.hidden = rest <= 0;
      if (rest > 0) bcLoadMore.textContent = fmt(T.loadMore, { n: rest });
      clampLongComments();
      if (focusIndex != null) {
        var items = bcThread.querySelectorAll(':scope > .bc-item');
        var target = items[focusIndex];
        if (target) { target.tabIndex = -1; target.focus({ preventScroll: false }); }
      }
    }

    bcLoadMore.addEventListener('click', function () {
      var firstNew = visibleRoots;
      visibleRoots += PAGE_SIZE;
      renderBottomComments(firstNew);
    });

    // M3: bodies longer than 12 lines collapse behind "show more".
    function clampLongComments() {
      bcThread.querySelectorAll('.bc-text').forEach(function (box) {
        var id = box.getAttribute('data-id');
        var p = box.querySelector('p');
        if (expanded[id]) return;
        box.classList.add('is-clamped');
        if (p.scrollHeight <= p.clientHeight + 2) { box.classList.remove('is-clamped'); return; }
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bc-expand';
        btn.textContent = T.expand;
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', function () {
          var open = box.classList.contains('is-clamped');
          box.classList.toggle('is-clamped', !open);
          expanded[id] = open;
          btn.textContent = open ? T.collapse : T.expand;
          btn.setAttribute('aria-expanded', String(open));
        });
        box.appendChild(btn);
      });
    }

    function appendThread(c, container, depth, maxDepth) {
      var div = buildCommentEl(c, depth);
      container.appendChild(div);
      var childContainer = depth < maxDepth ? div.querySelector('.bc-replies-container') : container;
      var childDepth = Math.min(depth + 1, maxDepth);
      (c._replies || []).forEach(function (r) { appendThread(r, childContainer, childDepth, maxDepth); });
    }

    var HEART = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';

    // L2: zero likes show only the heart.
    function likeText(n) { return n > 0 ? String(n) : ''; }

    function buildCommentEl(c, depth) {
      var isReply = depth > 0;
      var div = document.createElement('div');
      div.className = 'bc-item' + (isReply ? ' bc-reply' : '');
      div.dataset.commentId = c.id;
      var timeStr = new Date(c.created_at).toLocaleDateString(T.locale, { year: 'numeric', month: 'short', day: 'numeric' });
      var avatarSize = isReply ? 32 : 40;
      var likes = c.likes || 0;
      var nameHtml = (c.website
        ? '<a class="bc-name bc-name-link" href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">' + esc(c.nickname) + '</a>'
        : '<span class="bc-name">' + esc(c.nickname) + '</span>') + countryFlag(c) + authorTag(c);
      div.innerHTML =
        '<div class="bc-avatar-wrap"><img ' + commentAvatarAttrs(c) + ' class="bc-avatar-img" alt="" style="width:' + avatarSize + 'px;height:' + avatarSize + 'px" /></div>' +
        '<div class="bc-body">' +
          '<div class="bc-meta">' +
            nameHtml +
            '<span class="bc-dot" aria-hidden="true">&middot;</span>' +
            '<time class="bc-time" datetime="' + esc(c.created_at) + '">' + timeStr + '</time>' +
          '</div>' +
          '<div class="bc-text" data-id="' + esc(c.id) + '"><p>' + linkify(esc(c.content)).replace(/\n/g, '<br>') + '</p></div>' +
          '<div class="bc-actions">' +
            '<button type="button" class="bc-like-btn' + (c._userLiked ? ' liked' : '') + '" aria-pressed="' + (c._userLiked ? 'true' : 'false') + '" aria-label="' + esc(T.like) + (likes ? ' ' + likes : '') + '">' + HEART +
              '<span>' + likeText(likes) + '</span>' +
            '</button>' +
            '<button type="button" class="bc-reply-btn">' + esc(T.reply) + '</button>' +
          '</div>' +
          '<div class="bc-replies-container"></div>' +
        '</div>';

      var likeBtn = div.querySelector('.bc-like-btn');
      function paintLike(liked, n) {
        likeBtn.classList.toggle('liked', liked);
        likeBtn.setAttribute('aria-pressed', String(liked));
        likeBtn.setAttribute('aria-label', T.like + (n ? ' ' + n : ''));
        likeBtn.querySelector('span').textContent = likeText(n);
        likeBtn.querySelector('path').setAttribute('fill', liked ? 'currentColor' : 'none');
        c.likes = n; c._userLiked = liked;
      }
      likeBtn.addEventListener('click', function () {
        var wasLiked = likeBtn.classList.contains('liked');
        var prevCount = c.likes || 0;
        var newLiked = !wasLiked;
        paintLike(newLiked, newLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
        apiPost('/api/comments/' + c.id + '/like', {}).then(function (res) {
          paintLike(!!res.liked, res.count || 0);
        }).catch(function () {
          paintLike(wasLiked, prevCount);
        });
      });

      div.querySelector('.bc-reply-btn').addEventListener('click', function () { startReply(c); });
      return div;
    }

    // M2: replying shows "Replying to @name · cancel" above the textarea; the
    // parent is cleared only through cancel or a successful send.
    function startReply(c) {
      var prefix = '@' + c.nickname + ' ';
      replyTarget = { id: c.id, prefix: prefix };
      if (bcTextarea.value.indexOf(prefix) !== 0) bcTextarea.value = prefix + bcTextarea.value.replace(/^@\S+\s/, '');
      bcReplyName.textContent = fmt(T.replyingTo, { name: c.nickname });
      bcReplyHint.hidden = false;
      bcTextarea.focus();
      bcTextarea.setSelectionRange(bcTextarea.value.length, bcTextarea.value.length);
      bcTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function cancelReply(stripPrefix) {
      if (replyTarget && stripPrefix && bcTextarea.value.indexOf(replyTarget.prefix) === 0) {
        bcTextarea.value = bcTextarea.value.slice(replyTarget.prefix.length);
      }
      replyTarget = null;
      bcReplyHint.hidden = true;
    }
    bcReplyCancel.addEventListener('click', function () { cancelReply(true); bcTextarea.focus(); });

    clearOnInput(bcCompose);
    bcCompose.addEventListener('submit', function (e) {
      e.preventDefault();
      if (bcSubmit.disabled) return;
      if (!validate([
        { el: bcNickname, label: T.nickname, required: true },
        { el: bcEmail, label: T.email, required: true, email: true },
        { el: bcTextarea, label: T.contentField, required: true }
      ], bcStatus)) return;

      var nickname = bcNickname.value.trim();
      var email = bcEmail.value.trim();
      var website = bcWebsite.value.trim();
      var parentId = replyTarget ? replyTarget.id : null;
      var body = {
        post_slug: SLUG,
        nickname: nickname,
        email: email,
        content: bcTextarea.value.trim(),
        parent_id: parentId ? parseInt(parentId) : null,
        notify_replies: bcNotify.checked
      };
      if (website) body.website = website;

      setBusy(bcSubmit, true, T.submit);
      setStatus(bcStatus, '');
      apiPost('/api/comments', body).then(function (res) {
        saveIdentity({ nickname: nickname, email: email, website: website });
        bcTextarea.value = '';
        cancelReply(false);
        if (res.comment) {
          bottomComments.push(res.comment);
          visibleRoots = Infinity; // the new comment is never hidden behind "load more"
          renderBottomComments();
        }
        setStatus(bcStatus, T.sent, 'ok');
      }).catch(function (err) {
        setStatus(bcStatus, failMessage(err), 'error');
      }).then(function () {
        setBusy(bcSubmit, false, T.submit);
      });
    });

    bcTextarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); bcCompose.requestSubmit ? bcCompose.requestSubmit() : bcSubmit.click(); }
    });

    // =================================================================
    // INIT
    // =================================================================
    restoreIdentity();
    loadInlineComments();
    loadBottomComments();

    // --- Helpers ---
    function trunc(s, n) { s = s || ''; return s.length > n ? s.slice(0, n) + '…' : s; }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    // Region flag: self-hosted SVG (/flags/<cc>.svg) with a localized tooltip,
    // or '' when there's no ISO 3166-1 alpha-2 code. Leading space included.
    var _regionNames = null;
    try { _regionNames = new Intl.DisplayNames([T.locale], { type: 'region' }); } catch (e) {}
    function countryFlag(c) {
      var up = (c && c.country ? String(c.country) : '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(up)) return '';
      var region = up;
      if (_regionNames) { try { region = _regionNames.of(up) || up; } catch (e) {} }
      var label = (c.city ? c.city + ' · ' : '') + region;
      return ' <img class="c-flag" src="/flags/' + up.toLowerCase() + '.svg" alt="' + esc(region) +
        '" title="' + esc(label) + '" loading="lazy" onerror="this.style.display=\'none\'" />';
    }
    function linkify(s) { return s.replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }
  }

  root.BlogComments = { init: init };
})(window);
