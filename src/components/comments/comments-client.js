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
 * The request bodies sent to the comment API are part of the backend
 * contract — do not add, rename or drop fields here.
 */
(function (root) {
  'use strict';

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
    var mobileOverlay = $('mobileOverlay');
    var mobileSheet = $('mobileSheet');
    var msQuote = $('msQuote');
    var msBody = $('msBody');
    var msAuthor = $('msAuthor');
    var msTime = $('msTime');

    var bcThread = $('bcThread');
    var bcCount = $('bcCount');
    var bcNickname = $('bcNickname');
    var bcEmail = $('bcEmail');
    var bcWebsite = $('bcWebsite');
    var bcTextarea = $('bcTextarea');
    var bcNotify = $('bcNotify');
    var bcSubmit = $('bcSubmit');
    var bcComposeAvatar = $('bcComposeAvatar');

    var pendingRange = null;
    var activeMobileCommentId = null;
    var inlineComments = [];
    var bottomComments = [];

    function isMobile() { return window.innerWidth <= cfg.mobileMax; }

    // Short date + time used on inline cards and the mobile sheet.
    function shortStamp(iso) {
      var d = new Date(iso);
      return d.toLocaleDateString(T.locale, { month: '2-digit', day: '2-digit' }) +
        ' ' + d.toLocaleTimeString(T.locale, { hour: '2-digit', minute: '2-digit' });
    }

    // --- User identity persistence (shared with the homepage guestbook) ---
    function getSavedIdentity() {
      try { return JSON.parse(localStorage.getItem(USER_KEY)) || {}; } catch (e) { return {}; }
    }
    function saveIdentity(nickname, email, website) {
      localStorage.setItem(USER_KEY, JSON.stringify({ nickname: nickname, email: email, website: website || '' }));
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
      return r.json().then(function (data) {
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

    function wrapRange(range, id) {
      var mark = document.createElement('mark');
      mark.className = 'comment-highlight';
      mark.dataset.commentId = id;
      mark.id = 'inline-' + id; // deep-link target for the guestbook feed
      try { range.surroundContents(mark); }
      catch (e) {
        var fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
      }
      return mark;
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
        'mark[data-comment-id="' + id + '"], .cm-block-anchor[data-comment-id="' + id + '"]'
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

    // Deep link: …#inline-<id> (from the homepage guestbook feed) scrolls to
    // and flashes that highlight once it has been painted.
    function scrollToHashHighlight() {
      var m = /^#inline-(\d+)$/.exec(location.hash || '');
      if (!m || !postContent) return;
      var target = anchorElFor(m[1]);
      if (!target) return;
      var flashEl = target.tagName === 'MARK' ? target : target.closest('[data-aid]') || target;
      requestAnimationFrame(function () {
        flashEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashEl.classList.add('highlight-flash');
        setTimeout(function () { flashEl.classList.remove('highlight-flash'); }, 1200);
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

    function buildInlineCard(c) {
      if (!c.replies) c.replies = [];
      var card = document.createElement('div');
      card.className = 'cm-card';
      card.dataset.commentId = c.id;

      var anchorEl = anchorElFor(c.id);
      var isMark = !!anchorEl && anchorEl.tagName === 'MARK';
      var hlEl = isMark ? anchorEl : (anchorEl ? anchorEl.closest('[data-aid]') : null);
      var activeClass = isMark ? 'highlight-active' : 'inline-note-active';
      var crossLang = commentLang(c) !== PAGE_LANG;

      var repliesHtml = '';
      if (c.replies.length) {
        repliesHtml = '<div class="cm-replies">';
        c.replies.forEach(function (r) {
          repliesHtml +=
            '<div class="cm-reply">' +
              '<div class="cm-reply-header">' +
                '<img class="cm-reply-avatar" ' + commentAvatarAttrs(r) + ' />' +
                '<span class="cm-reply-name">' + esc(r.nickname) + countryFlag(r) + '</span>' +
                '<span class="cm-reply-time">' + shortStamp(r.created_at) + '</span>' +
              '</div>' +
              '<div class="cm-reply-body">' + esc(r.comment) + '</div>' +
            '</div>';
        });
        repliesHtml += '</div>';
      }

      // Tag a card whose highlight was made on the other language version.
      var langTag = (ANCHORS && crossLang)
        ? '<span class="cm-card-lang" title="' + esc(T.otherLang) + '">' + (commentLang(c) === 'en' ? 'EN' : '中') + '</span>'
        : '';

      card.innerHTML =
        '<div class="cm-card-author">' +
          '<img ' + commentAvatarAttrs(c) + ' class="cm-card-avatar" />' +
          '<span class="cm-card-name">' + esc(c.nickname) + countryFlag(c) + '</span>' +
        '</div>' +
        '<div class="cm-card-quote">' + langTag + '“' + esc(trunc(c.selected_text, 50)) + '”</div>' +
        '<div class="cm-card-body">' + esc(c.comment) + '</div>' +
        '<div class="cm-card-footer">' +
          '<span class="cm-card-time">' + shortStamp(c.created_at) + '</span>' +
        '</div>' +
        repliesHtml +
        '<button type="button" class="cm-reply-btn">' + esc(T.reply) + '</button>' +
        '<div class="cm-reply-form" style="display:none;">' +
          '<div class="cm-rf-identity">' +
            '<input class="cm-rf-input" placeholder="' + esc(T.nickname) + '" />' +
            '<input class="cm-rf-input" placeholder="' + esc(T.email) + '" />' +
          '</div>' +
          '<textarea class="cm-rf-textarea" placeholder="' + esc(T.replyPlaceholder) + '" rows="2"></textarea>' +
          '<label class="cm-rf-notify"><input type="checkbox" checked /> ' + esc(T.notifyShort) + '</label>' +
          '<div class="cm-rf-actions">' +
            '<button type="button" class="cm-rf-cancel">' + esc(T.cancel) + '</button>' +
            '<button type="button" class="cm-rf-submit">' + esc(T.reply) + '</button>' +
          '</div>' +
        '</div>';

      card.addEventListener('mouseenter', function () {
        if (hlEl) hlEl.classList.add(activeClass);
        card.classList.add('cm-card-active');
      });
      card.addEventListener('mouseleave', function () {
        if (hlEl) hlEl.classList.remove(activeClass);
        card.classList.remove('cm-card-active');
      });
      card.addEventListener('click', function (e) {
        if (e.target.closest('.cm-reply-btn') || e.target.closest('.cm-reply-form')) return;
        if (hlEl) {
          hlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          hlEl.classList.add('highlight-flash');
          setTimeout(function () { hlEl.classList.remove('highlight-flash'); }, 1000);
        }
      });
      if (anchorEl) {
        anchorEl.addEventListener('mouseenter', function () { card.classList.add('cm-card-active'); if (hlEl) hlEl.classList.add(activeClass); });
        anchorEl.addEventListener('mouseleave', function () { card.classList.remove('cm-card-active'); if (hlEl) hlEl.classList.remove(activeClass); });
        anchorEl.addEventListener('click', function (e) {
          if (!isMobile()) return;
          e.preventDefault(); e.stopPropagation();
          openMobileSheet(c);
        });
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

      replyBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        replyForm.style.display = '';
        replyBtn.style.display = 'none';
        var identity = getSavedIdentity();
        if (identity.nickname) rfNickname.value = identity.nickname;
        if (identity.email) rfEmail.value = identity.email;
        rfNickname.focus();
        layoutCards();
      });
      rfCancel.addEventListener('click', function (e) {
        e.stopPropagation();
        replyForm.style.display = 'none';
        replyBtn.style.display = '';
        layoutCards();
      });
      rfSubmit.addEventListener('click', function (e) {
        e.stopPropagation();
        var nickname = rfNickname.value.trim();
        var email = rfEmail.value.trim();
        var comment = rfTextarea.value.trim();
        var rfValid = true;
        rfNickname.classList.remove('cip-error');
        rfTextarea.classList.remove('cip-error');
        if (!nickname) { rfNickname.classList.add('cip-error'); rfValid = false; }
        if (!comment) { rfTextarea.classList.add('cip-error'); rfValid = false; }
        if (!rfValid) return;
        saveIdentity(nickname, email);
        rfSubmit.disabled = true;
        apiPost('/api/inline-comments', {
          post_slug: SLUG,
          nickname: nickname,
          email: email,
          comment: comment,
          parent_id: c.id,
          notify_replies: rfNotify.checked
        }).then(function (res) {
          if (res.comment) {
            c.replies.push(res.comment);
            renderInlineComments();
          }
        }).finally(function () {
          rfSubmit.disabled = false;
        });
      });

      return card;
    }

    function renderInlineComments() {
      if (!commentCards) return;
      commentCards.innerHTML = '';
      if (crEmpty) crEmpty.style.display = inlineComments.length ? 'none' : '';
      inlineComments.forEach(function (c) { commentCards.appendChild(buildInlineCard(c)); });
      requestAnimationFrame(function () { requestAnimationFrame(layoutCards); });
    }

    // --- Mobile bottom sheet ---
    function openMobileSheet(comment) {
      activeMobileCommentId = comment.id;
      msQuote.textContent = '“' + trunc(comment.selected_text, 80) + '”';
      msBody.textContent = comment.comment;
      msAuthor.innerHTML = esc(comment.nickname) + countryFlag(comment);
      msTime.textContent = shortStamp(comment.created_at);
      var repliesEl = $('msReplies');
      repliesEl.innerHTML = '';
      (comment.replies || []).forEach(function (r) {
        var div = document.createElement('div');
        div.className = 'ms-reply-item';
        div.innerHTML =
          '<div class="ms-reply-header">' +
            '<img ' + commentAvatarAttrs(r) + ' class="ms-reply-avatar" />' +
            '<span class="ms-reply-name">' + esc(r.nickname) + countryFlag(r) + '</span>' +
            '<span class="ms-reply-time">' + shortStamp(r.created_at) + '</span>' +
          '</div>' +
          '<div class="ms-reply-body">' + esc(r.comment) + '</div>';
        repliesEl.appendChild(div);
      });
      $('msReplyForm').style.display = 'none';
      $('msReplyToggle').style.display = '';
      mobileOverlay.classList.add('active');
      mobileSheet.classList.add('active');
    }
    function closeMobileSheet() {
      mobileOverlay.classList.remove('active');
      mobileSheet.classList.remove('active');
      activeMobileCommentId = null;
    }
    mobileOverlay.addEventListener('click', closeMobileSheet);
    $('msReplyToggle').addEventListener('click', function () {
      $('msReplyForm').style.display = 'block';
      this.style.display = 'none';
      var id = getSavedIdentity();
      if (id.nickname) $('msRfNickname').value = id.nickname;
      if (id.email) $('msRfEmail').value = id.email;
      $('msRfNickname').focus();
    });
    $('msRfCancel').addEventListener('click', function () {
      $('msReplyForm').style.display = 'none';
      $('msReplyToggle').style.display = '';
    });
    $('msRfSubmit').addEventListener('click', function () {
      var msNickEl = $('msRfNickname');
      var msTextEl = $('msRfTextarea');
      var nickname = msNickEl.value.trim();
      var email = $('msRfEmail').value.trim();
      var text = msTextEl.value.trim();
      var notify = $('msRfNotify').checked;
      var msValid = true;
      msNickEl.classList.remove('cip-error');
      msTextEl.classList.remove('cip-error');
      if (!nickname) { msNickEl.classList.add('cip-error'); msValid = false; }
      if (!text) { msTextEl.classList.add('cip-error'); msValid = false; }
      if (!msValid || !activeMobileCommentId) return;
      saveIdentity(nickname, email);
      var submitBtn = this;
      submitBtn.disabled = true;
      submitBtn.textContent = '...';
      apiPost('/api/inline-comments', {
        post_slug: SLUG,
        nickname: nickname,
        email: email,
        comment: text,
        parent_id: activeMobileCommentId,
        notify_replies: notify,
      }).then(function (res) {
        if (res.comment) {
          var parent = inlineComments.find(function (c) { return c.id === activeMobileCommentId; });
          if (parent) {
            if (!parent.replies) parent.replies = [];
            parent.replies.push(res.comment);
          }
          closeMobileSheet();
          renderInlineComments();
        }
      }).finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = T.reply;
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
      fab.style.left = (rect.left + window.scrollX + (rect.width / 2) - (fab.offsetWidth || 28) / 2) + 'px';
      pendingRange = range.cloneRange();
    });
    document.addEventListener('mousedown', function (e) {
      if (fab.contains(e.target) || popover.contains(e.target)) return;
      if (popover.style.display === 'none') fab.style.display = 'none';
    });

    fab.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (!pendingRange) return;
      var selectedText = pendingRange.toString().trim();
      if (!selectedText) return;
      cipText.textContent = '“' + trunc(selectedText, 60) + '”';
      cipArea.value = '';
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
      cipNickname.focus();
    });

    cipCancel.addEventListener('click', function () {
      popover.style.display = 'none';
      pendingRange = null;
      window.getSelection().removeAllRanges();
    });

    cipSubmit.addEventListener('click', function () {
      var text = cipArea.value.trim();
      var nickname = cipNickname.value.trim();
      var email = cipEmailInput.value.trim();
      var valid = true;
      cipNickname.classList.remove('cip-error');
      cipArea.classList.remove('cip-error');
      if (!nickname) { cipNickname.classList.add('cip-error'); valid = false; }
      if (!text) { cipArea.classList.add('cip-error'); valid = false; }
      if (!valid || !pendingRange) return;

      var selectedText = pendingRange.toString().trim();
      saveIdentity(nickname, email);

      var body;
      if (ANCHORS) {
        // Anchor to a language-independent block id + block-local offsets so
        // it can be re-located on the other-language version of the post.
        var block = nearestAnchorBlock(pendingRange.startContainer);
        var anchorId = block ? (block.dataset.aid || '') : '';
        var rangeStart = 0, rangeEnd = selectedText.length;
        if (block) {
          rangeStart = offsetWithinBlock(block, pendingRange.startContainer, pendingRange.startOffset);
          rangeEnd = offsetWithinBlock(block, pendingRange.endContainer, pendingRange.endOffset);
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

      cipSubmit.disabled = true;
      cipSubmit.textContent = '...';
      apiPost('/api/inline-comments', body).then(function (res) {
        if (res.comment) {
          if (ANCHORS && !res.comment.lang) res.comment.lang = PAGE_LANG;
          wrapRange(pendingRange, res.comment.id);
          inlineComments.push(res.comment);
          renderInlineComments();
        }
        popover.style.display = 'none';
        pendingRange = null;
        window.getSelection().removeAllRanges();
      }).finally(function () {
        cipSubmit.disabled = false;
        cipSubmit.textContent = T.inlineSubmit;
      });
    });

    cipArea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') cipSubmit.click();
      if (e.key === 'Escape') cipCancel.click();
    });

    var layoutTimer;
    window.addEventListener('resize', function () {
      clearTimeout(layoutTimer);
      layoutTimer = setTimeout(layoutCards, 60);
    });

    // =================================================================
    // BOTTOM COMMENTS
    // =================================================================

    function loadBottomComments() {
      apiGet('/api/comments?post_slug=' + encodeURIComponent(SLUG)).then(function (res) {
        bottomComments = res.comments || [];
        CA.prime(CA.emailsOf(bottomComments)).then(renderBottomComments);
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

    function countLabel(n) { return fmt(n === 1 ? T.countOne : T.count, { n: n }); }

    function renderBottomComments() {
      bcThread.innerHTML = '';
      var count = bottomComments.length;
      bcCount.textContent = countLabel(count);
      document.dispatchEvent(new CustomEvent('comments:count', { detail: { count: count } }));

      var roots = [];
      var byId = {};
      bottomComments.forEach(function (c) { c._replies = []; byId[c.id] = c; });
      bottomComments.forEach(function (c) {
        if (c.parent_id && byId[c.parent_id]) byId[c.parent_id]._replies.push(c);
        else roots.push(c);
      });
      // Cap visual nesting: desktop indents up to 4 levels, mobile to 1;
      // deeper replies flatten as siblings at the capped level.
      var maxDepth = bcMaxDepth();
      roots.forEach(function (c) { appendThread(c, bcThread, 0, maxDepth); });
    }

    function appendThread(c, container, depth, maxDepth) {
      var div = buildCommentEl(c, depth);
      container.appendChild(div);
      var childContainer = depth < maxDepth ? div.querySelector('.bc-replies-container') : container;
      var childDepth = Math.min(depth + 1, maxDepth);
      (c._replies || []).forEach(function (r) { appendThread(r, childContainer, childDepth, maxDepth); });
    }

    var HEART = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';

    function buildCommentEl(c, depth) {
      var isReply = depth > 0;
      var div = document.createElement('div');
      div.className = 'bc-item' + (isReply ? ' bc-reply' : '');
      var timeStr = new Date(c.created_at).toLocaleDateString(T.locale, { year: 'numeric', month: 'short', day: 'numeric' });
      var avatarSize = isReply ? 32 : 40;
      var nameHtml = c.website
        ? '<a class="bc-name bc-name-link" href="' + esc(c.website) + '" target="_blank" rel="noopener noreferrer">' + esc(c.nickname) + '</a>' + countryFlag(c)
        : '<span class="bc-name">' + esc(c.nickname) + '</span>' + countryFlag(c);
      div.innerHTML =
        '<div class="bc-avatar-wrap"><img ' + commentAvatarAttrs(c) + ' class="bc-avatar-img" style="width:' + avatarSize + 'px;height:' + avatarSize + 'px" /></div>' +
        '<div class="bc-body">' +
          '<div class="bc-meta">' +
            nameHtml +
            '<span class="bc-dot">&middot;</span>' +
            '<time class="bc-time" datetime="' + esc(c.created_at) + '">' + timeStr + '</time>' +
          '</div>' +
          '<div class="bc-text"><p>' + linkify(esc(c.content)).replace(/\n/g, '<br>') + '</p></div>' +
          '<div class="bc-actions">' +
            '<button type="button" class="bc-like-btn' + (c._userLiked ? ' liked' : '') + '">' + HEART +
              '<span>' + (c.likes || 0) + '</span>' +
            '</button>' +
            '<button type="button" class="bc-reply-btn">' + esc(T.reply) + '</button>' +
          '</div>' +
          '<div class="bc-replies-container"></div>' +
        '</div>';

      div.querySelector('.bc-like-btn').addEventListener('click', function () {
        var btn = this;
        var icon = btn.querySelector('path');
        var span = btn.querySelector('span');
        var wasLiked = btn.classList.contains('liked');
        var prevCount = parseInt(span.textContent) || 0;
        var newLiked = !wasLiked;
        var newCount = newLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
        btn.classList.toggle('liked', newLiked);
        span.textContent = newCount;
        icon.setAttribute('fill', newLiked ? 'currentColor' : 'none');
        apiPost('/api/comments/' + c.id + '/like', {}).then(function (res) {
          btn.classList.toggle('liked', res.liked);
          span.textContent = res.count;
          icon.setAttribute('fill', res.liked ? 'currentColor' : 'none');
        }).catch(function () {
          btn.classList.toggle('liked', wasLiked);
          span.textContent = prevCount;
          icon.setAttribute('fill', wasLiked ? 'currentColor' : 'none');
        });
      });

      div.querySelector('.bc-reply-btn').addEventListener('click', function () {
        bcTextarea.value = '@' + c.nickname + ' ';
        bcTextarea.dataset.parentId = c.id;
        bcTextarea.focus();
        bcTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      return div;
    }

    bcSubmit.addEventListener('click', function () {
      var content = bcTextarea.value.trim();
      var nickname = bcNickname.value.trim();
      var email = bcEmail.value.trim();
      var website = bcWebsite.value.trim();
      if (!content || !nickname || !email) return;

      saveIdentity(nickname, email, website);
      bcSubmit.disabled = true;
      bcSubmit.textContent = '...';

      var parentId = bcTextarea.dataset.parentId || null;
      var body = {
        post_slug: SLUG,
        nickname: nickname,
        email: email,
        content: content,
        parent_id: parentId ? parseInt(parentId) : null,
        notify_replies: bcNotify.checked
      };
      if (website) body.website = website;

      apiPost('/api/comments', body).then(function (res) {
        if (res.comment) {
          bottomComments.push(res.comment);
          renderBottomComments();
          bcTextarea.value = '';
          delete bcTextarea.dataset.parentId;
        }
      }).finally(function () {
        bcSubmit.disabled = false;
        bcSubmit.textContent = T.submit;
      });
    });

    bcTextarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') bcSubmit.click();
    });

    // =================================================================
    // INIT
    // =================================================================
    restoreIdentity();

    apiGet('/api/inline-comments?post_slug=' + encodeURIComponent(SLUG)).then(function (res) {
      inlineComments = res.comments || [];
      var avatarsReady = CA.prime(CA.emailsOf(inlineComments));
      // Resolve legacy cross-language anchors (best-effort), then paint.
      Promise.all([resolveCrossLangAnchors().catch(function () {}), avatarsReady]).then(function () {
        restoreHighlights();
        renderInlineComments();
        scrollToHashHighlight();
      });
    });

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
