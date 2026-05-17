/* Shared mock content + scramble lib for the glitch prototypes */
window.GLITCH = {};

(function() {
  var POOL = '';
  for (var b = 0x2580; b <= 0x259F; b++) POOL += String.fromCharCode(b);
  var POOL_MAX = POOL.length - 1;
  var CURSOR = '░▒▓█';
  var CURSOR_LEN = CURSOR.length;
  var SETTLE_RATE = 30;

  function rint(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

  window.GLITCH.scramble = function(el, text, opts) {
    if (!el || text == null) return;
    if (el.__scrambleId) cancelAnimationFrame(el.__scrambleId);
    opts = opts || {};
    var from = opts.from || 'random';
    var duration = opts.duration || 780;
    var perturbation = opts.perturbation != null ? opts.perturbation : 0.22;
    var settleDuration = opts.settleDuration || 220;
    var n = text.length;
    if (n === 0) { el.textContent = ''; return; }

    var u = new Array(n);
    if (from === 'random') {
      for (var i = 0; i < n; i++) u[i] = i;
      for (var i = n - 1; i > 0; i--) {
        var j = rint(0, i);
        var tmp = u[i]; u[i] = u[j]; u[j] = tmp;
      }
    } else {
      var anchor = from === 'right' ? n - 1 : from === 'center' ? (n - 1) / 2 : 0;
      var pos = []; for (var i = 0; i < n; i++) pos.push(i);
      pos.sort(function(a, b) { return Math.abs(a - anchor) - Math.abs(b - anchor); });
      for (var i = 0; i < n; i++) u[pos[i]] = i;
    }

    var H = settleDuration / duration;
    var J = (1 - H) / n;
    var Ct = CURSOR_LEN * J;
    var K = 1000 / (SETTLE_RATE * duration);
    if (!isFinite(K) || K <= 0) K = 0.001;

    var N = new Float32Array(n);
    var X = new Float32Array(n);
    var Z = perturbation * H;
    for (var i = 0; i < n; i++) {
      var jit1 = Z > 0 ? (rint(0, 2000) - 1000) / 1000 * Z : 0;
      var jit2 = Z > 0 ? (rint(0, 2000) - 1000) / 1000 * Z : 0;
      N[i] = u[i] * J + jit1;
      X[i] = Math.ceil((N[i] + H + jit2) / K) * K;
    }

    var L = new Array(n);
    for (var i = 0; i < n; i++) L[i] = POOL.charAt(rint(0, POOL_MAX));

    var initial = '';
    for (var c = 0; c < n; c++) {
      var ch = text.charAt(c);
      initial += (ch === ' ' ? ' ' : L[c]);
    }
    el.textContent = initial;

    var startTime = performance.now();
    var lastR = -1;
    function tick(now) {
      var t = (now - startTime) / duration;
      if (t >= 1) { el.textContent = text; el.__scrambleId = 0; return; }
      var r = (t / K) | 0;
      var aChanged = r !== lastR;
      if (aChanged) lastR = r;
      var l = t;
      var s = '';
      for (var c = 0; c < n; c++) {
        var ch = text.charAt(c);
        var cs = N[c], ce = X[c];
        if (l >= ce) { s += ch; continue; }
        if (ch === ' ') { s += ' '; continue; }
        if (l < cs) {
          if (aChanged) L[c] = POOL.charAt(rint(0, POOL_MAX));
          s += L[c]; continue;
        }
        var dt = l - cs;
        if (dt < Ct) {
          var idx = (dt / J) | 0;
          if (idx >= CURSOR_LEN) idx = CURSOR_LEN - 1;
          s += CURSOR.charAt(CURSOR_LEN - 1 - idx);
        } else {
          if (aChanged) L[c] = POOL.charAt(rint(0, POOL_MAX));
          s += L[c];
        }
      }
      el.textContent = s;
      el.__scrambleId = requestAnimationFrame(tick);
    }
    el.__scrambleId = requestAnimationFrame(tick);
  };
})();

GLITCH.renderCard = function() {
  var card = document.getElementById('mockCard');
  if (!card) return;
  card.innerHTML =
    '<div class="greeting scrambleable">Hi, folks. I\'m</div>' +
    '<div><span class="name scrambleable">Airing</span><span class="cursor">_</span></div>' +
    '<div class="role scrambleable">Software Engineer @ Singapore</div>' +
    '<hr class="divider">' +
    '<div class="chat-row">' +
      '<span class="chat-prompt">&gt;_</span>' +
      '<input class="chat-input" placeholder="Tell Airing something..." />' +
    '</div>' +
    '<hr class="divider">' +
    '<div class="links">' +
      '<a href="#" class="scrambleable">Blog</a><span class="sep">/</span>' +
      '<a href="#" class="scrambleable">Channel</a><span class="sep">/</span>' +
      '<a href="#" class="scrambleable">Message</a><span class="sep">/</span>' +
      '<a href="#" class="scrambleable">Notes</a>' +
    '</div>' +
    '<div class="social">' +
      '<span>GH</span><span>TG</span><span>X</span><span>ZH</span>' +
    '</div>';
};

GLITCH.renderBelow = function() {
  var below = document.getElementById('below');
  if (!below) return;
  var posts = [
    { title: 'Building a real-time presence system with SSE', date: '2026-04-18' },
    { title: '关于 LLM 上下文压缩的思考', date: '2026-04-12' },
    { title: 'Why I switched from Notion to Obsidian (again)', date: '2026-04-03' },
    { title: 'Astro + GitHub Pages: my deploy setup in 2026', date: '2026-03-28' },
    { title: '一年的 Last.fm 数据可视化', date: '2026-03-19' },
    { title: 'Cyberpunk UI patterns I keep stealing', date: '2026-03-11' },
    { title: 'On rituals and weekly retros', date: '2026-03-05' },
    { title: '为什么我还在写博客', date: '2026-02-26' },
    { title: 'Type-safe RPC without tRPC: just functions', date: '2026-02-19' },
    { title: '我的 2026 清单', date: '2026-02-04' }
  ];
  var html = '<h2>// recent posts (scroll to test)</h2>';
  posts.forEach(function(p) {
    html += '<div class="post"><div class="post-title scrambleable">' + p.title +
            '</div><div class="post-meta scrambleable">' + p.date + '</div></div>';
  });
  html += '<h2 style="margin-top: 60px;">// keep scrolling ↓</h2>';
  var lorem = 'Cyberpunk is not aesthetic, it is structural. The flicker, the tear, the dropped frame — these are signals that the system is alive, lossy, and human.';
  for (var i = 0; i < 14; i++) {
    html += '<p class="scrambleable" style="opacity: ' + (1 - i * 0.05) + '">' + lorem + '</p>';
  }
  below.innerHTML = html;
};

GLITCH.renderTopbar = function(letter, name, desc, opts) {
  opts = opts || {};
  var bar = document.getElementById('topbar');
  if (!bar) return;
  var triggerBtn = opts.trigger ? '<button id="triggerBtn">Trigger now</button>' : '';
  var liveBtn = opts.live !== false ? '<button id="liveBtn" class="live">Auto: ON</button>' : '';
  var intensity = opts.intensity ? (
    '<select id="intensitySel">' +
    '<option value="low">Low</option>' +
    '<option value="medium" selected>Medium</option>' +
    '<option value="high">High</option>' +
    '</select>'
  ) : '';
  bar.innerHTML =
    '<a href="./index.html">← Gallery</a>' +
    '<div class="style-label">' + letter + '. ' + name + '</div>' +
    '<div class="controls">' + intensity + triggerBtn + liveBtn + '</div>' +
    '<div class="desc">' + desc + '</div>';
};

GLITCH.init = function(letter, name, desc, opts) {
  GLITCH.renderTopbar(letter, name, desc, opts);
  GLITCH.renderCard();
  GLITCH.renderBelow();
};
