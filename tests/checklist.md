# Browser QA Checklist

> 供 `/qa-self-test` skill 使用。每个条目由 browser MCP 自动验证。
> 新增功能时，同步在对应 section 下新增测试条目。

## 验证方式说明

- **GET**: `browser_navigate` 到 URL，检查页面加载成功
- **DOM**: `browser_snapshot` 检查元素存在
- **CSS**: `browser_evaluate` 检查 `getComputedStyle` 属性值
- **Screenshot**: `browser_take_screenshot` 截图人工确认
- **Evaluate**: `browser_evaluate` 执行 JS 断言

---

## Homepage (`/`)

- [ ] GET `/` 返回页面，title 包含 "Airing"
- [ ] DOM: `<link rel="canonical">` 存在，href 为 `https://ursb.me/`
- [ ] DOM: `<meta property="og:url">` 存在
- [ ] DOM: `<meta name="twitter:card">` 存在

## Cyber Glitch (Homepage)

> Spec: `docs/superpowers/specs/2026-05-06-cyber-glitch-effects-design.md`
> Effects A (chromatic glitch, dark-mode only) and E (scramble bursts, both modes).

- [ ] Evaluate: `typeof window.__heroScramble === 'function'` 在首页返回 `true`
- [ ] Evaluate: `typeof window.__fireGlitch === 'undefined'` 在首页返回 `true`（debug 接口未泄漏）
- [ ] Hero 一瞥：清空 `localStorage.glitch-hero-week`，刷新，1.5s 后 `localStorage.getItem('glitch-hero-week')` 是非空字符串
- [ ] Hero 周门：再次刷新（不清存储），首 3s 内 body 不出现 `fx-rgb` class
- [ ] Light 模式下 A 静音：`document.documentElement.setAttribute('data-mode','light')` + 清存储 + 刷新，3s 内 body 不出现 `fx-rgb` class
- [ ] E 滚动触发：`window.scrollBy({top:3000})` 后立刻 `scrollBy({top:-3000})`，至少一个 `.post-title` 或 `.role` 短暂获得 `data-glitch-flashing` 属性
- [ ] 其他页面隔离：`/notes/` `/posts/[slug]` `/blog/` `/admin/` `/photos/` 上 `typeof window.__heroScramble === 'undefined'`
- [ ] reduce-motion：模拟 `prefers-reduced-motion: reduce`，刷新，永不出现 `fx-rgb` 或 `data-glitch-flashing`
- [ ] DOM: `<style is:global>` 块包含 `body.fx-rgb` 选择器

## Forest Island Pet (Homepage bottom-left)

> Component: `src/components/IslandWidget.tsx` (R3F scene, ~1600 LOC) +
> `src/components/widget-sakura.tsx` (sakura geometry) +
> `src/components/island-shared.ts` (shared wind/hearth/dwell + palette) +
> `src/components/IslandWidget.astro` (wrapper + skeleton + chip panel).
> V51+: floating body-level pet (NOT inline card). 220×220 fixed
> bottom-left. Wrapper has role="link" + tabindex=0 + JS click handler
> navigating to `/world/`. Hidden on mobile (<800px).

- [ ] DOM: `#island-3d-canvas-wrap` exists at bottom-left of homepage
      (position: fixed; bottom: 20px; left: 20px; ~220×220)
- [ ] DOM: wrapper has `role="link"` + `tabindex="0"` + `aria-label`
- [ ] DOM: `.island-skeleton` SVG renders inside the wrap (loading state)
- [ ] DOM: `.island-pet-panel` exists with `inert` attribute initially
- [ ] Hover: panel reveals (opacity 1, pointer-events auto), inert removed
- [ ] Tab key: panel reveals on focusin, chip buttons (enter + cycle)
      become focusable in tab order
- [ ] Evaluate (WebGL OK): within 12s, `wrap.classList.contains('island-loaded')` is true
- [ ] Evaluate (WebGL OK): `wrap.querySelector('canvas')` returns canvas
      with non-null `.getContext('webgl2')` or `.getContext('webgl')`
- [ ] Evaluate (WebGL failed): after 12s, `wrap.classList.contains('island-webgl-failed')` is true
- [ ] Cycle chip: clicking advances quote — `window.__islandQuoteIdx`
      increments + DOM `data-idx` increments AND both stay in sync
- [ ] Mobile (<800px): widget entirely hidden via CSS
- [ ] Reduced motion: R3F `frameloop="demand"` (single static render),
      skeleton pulse + hover lift CSS-suppressed
- [ ] Print: pet hidden via `@media print { display:none }`
- [ ] Forced-colors mode: panel uses Canvas/CanvasText with visible border
- [ ] Click anywhere on wrapper: navigates to `/world/`
- [ ] Wait ~10s: signature gust event visibly surges all wind-coupled
      elements (sakura sway, petals drift, smoke, furin, lantern flame)
      together once on each ~78s cycle, plus a guaranteed first-view
      burst at t=8-12s

## /world/ WebGL Fallback

> Component: `src/world/WorldLoader.astro` — graceful fallback for users
> whose browsers can't create a WebGL context (resolves "黑屏" bug).

- [ ] GET `/world/` 返回页面
- [ ] DOM: `#world-loader` exists initially (showing 走进林间…)
- [ ] Evaluate (WebGL OK): canvas mounts within 12s and loader fades out
- [ ] Evaluate (WebGL failed): synchronously when `WebGL2RenderingContext` and `WebGLRenderingContext` both undefined, `#world-webgl-fallback` becomes visible (hidden=false) and loader is removed
- [ ] Evaluate (WebGL failed): after 12s without canvas working, fallback DOM is shown with "无法加载 3D 场景" title
- [ ] DOM (fallback): two CTAs visible — "前往 nook 2D 版本 →" → `/nook/` and "回首页" → `/`

## /world/ V2 scene-polish wave (2026-05-25)

> Per memory `reference-world-scene` V2. Most of these only verify in
> a real browser via WorldUI buttons + observation; headless can't
> WebGL-render. Visual-only items marked (V).

- [ ] V — On first load, camera starts close on cabin door and pans
      out to 3/4 establishing angle over ~4.5s (sine in-out easing)
- [ ] V — First `pointerdown` on canvas during the intro pan skips
      it to the final pose (no waiting)
- [ ] V — After intro completes, OrbitControls is enabled (user can
      drag-to-orbit)
- [ ] V — Clicking 🌙 (theme toggle) triggers a 1.5s "breath" dolly
      ~6% closer to target, then returns to base distance
- [ ] V — Lanterns ignite at dusk (emissive lerps + per-lantern flicker)
- [ ] V — At dusk, dark fog cloud planes appear around pond/waterfall
      area (DuskFog)
- [ ] V — At dusk, a single firefly drifts from hammock area toward
      cabin window over ~28s, then back (CabinFirefly scripted path)
- [ ] V — Cat on cabin doormat periodically (every 18-40s) breaks
      from curl into stretch/lick/look/sleep, returns
- [ ] V — Easel canvas shows a procedurally-painted version of the
      scene (cabin + cedar + sakura + torii silhouettes)
- [ ] V — On hover during day, butterflies sparkle around the fox shrine
- [ ] V — Periodic ~3s wind gust event (~every 27s): trees lean
      harder, clothesline whips, pond ripples chop, lantern halos
      flicker brighter, smoke leans, leaves drift wider
- [ ] V — Wisteria arch crossbar spans perpendicular to the path
      between cabin and fox shrine (walker passes UNDER it)
- [ ] V — Fox shrine has 3 mini torii leading to fox statue + lit
      candle with flickering pointLight
- [ ] V — Onsen has steaming pool + folded yukata + geta pair
      (side-by-side, ~8cm apart) + karesansui zen garden
- [ ] V — Mochi NPC default gentle head bob; every 22-30s does a
      5-second smooth sweep (left → right → up → center)
- [ ] V — At dusk, V-formation flock of dark bird silhouettes drifts
      west→east across the sky (looping ~60s)
- [ ] V — Sakura petals drift on pond surface; brown leaves drift
      on river curve
- [ ] V — Path mushrooms (4) scattered at lateral offsets near
      reading / music / deck / easel branches
- [ ] V — Footprint trail fades from cabin door outward + back toward
      hammock branch (alpha gradient)
- [ ] V — Cabin firewood pile renders correctly via InstancedMesh
      (no per-log draw calls)
- [ ] V — On `prefers-reduced-motion`, DuskFog + CanopyDapple +
      SunsetBirds are skipped (perf gate is QUALITY=low)
- [ ] V — Hot spring pool emissiveIntensity oscillates 0.06-0.12 on
      a 4s cycle (thermal pulse — the only "invisible physics" beat)
- [ ] V — Cabin window glow breathes on ~3.2s sine (back-wall
      emissive 0.5±0.08, reads as fireplace flicker)
- [ ] V — Distant owl: at dusk only, two yellow eye-dots in a far
      tree blink every ~6s; invisible during day
- [ ] V — Wind chime tanzaku swings harder during gust event
      (verifies WindChime → getGust coupling)

### V2 perf sweep (Sub-A P1)

- [ ] Switch to another browser tab for ≥10s; return to /world/ tab.
      Scene resumes instantly without lag spike. (Canvas frameloop
      pauses on visibilitychange — verify via DevTools Performance:
      no JS activity from R3F while tab hidden.)
- [ ] Forest: ~60 unique IcosahedronGeometry uploads, not 180+
      (BIRCH_POOL/OAK_POOL/MAPLE_POOL/CHERRY_POOL × POOL_SIZE=5;
      Three.js stats panel `.geometries` should drop accordingly).
- [ ] FallingLeaves renders as 1 InstancedMesh, not 36 separate
      meshes (Three.js stats `.calls` should drop ~35).

### V2 a11y sweep

- [ ] WorldLoader: Inspect element on `#world-loader` while page loads
      — should have `role="status"` and `aria-live="polite"`. Fallback
      `#world-webgl-fallback` should have `role="alert"`.
- [ ] Toggle macOS System Settings → Accessibility → "Reduce motion" ON.
      Reload `/world/` — loader flower should NOT pulse, bar should NOT
      sweep (stays at 60% fill), bottom help hint stays at full opacity
      (doesn't fade out after 22s).
- [ ] WorldUI: VoiceOver (Cmd+F5) the 4 right-side icon buttons. Each
      should announce its Chinese label (保存截图 / 切到黄昏 etc.),
      not "button". Toggle theme — VoiceOver should announce
      "pressed" on the now-dusk button.
- [ ] AmbientHUD: same — VoiceOver the white-noise + pomo buttons.
      The "在岛上 X 分钟" HUD should be auto-announced when it
      ticks (aria-live="polite"). Pomo "专注中" should auto-announce.
- [ ] ZonePanel: Tab into a zone hitbox, press Enter to open the panel.
      Panel should immediately receive focus (panel itself, then Tab
      navigates inside). Press ESC — focus restores to the hitbox.
      VoiceOver should announce "dialog · Blog · 文章" on open.
- [ ] ChatBox: type a message + send. VoiceOver should announce Airing's
      reply tokens as they stream (role="log" aria-live="polite"),
      not the entire prior conversation each time. If an error fires,
      it should announce immediately (role="alert").
- [ ] AccountIndicator: Tab to the account pill. VoiceOver should
      announce "登录账户" (signed-out) or "账户菜单：name" (signed-in)
      + "expanded" / "collapsed" depending on menu state.
- [ ] LoginModal: Open the modal. VoiceOver should announce
      "dialog · 登录". Tab cycles inside the modal.
- [ ] ErrorBoundary: Manually crash by editing src/world/Cabin.tsx to
      `throw new Error('test')`. Fallback should immediately announce
      "这片林子有点累了——刷新一下试试".
- [ ] SkipNav: load /world/ + immediately press Tab. The top-left
      should reveal a small card titled "区域" with 5 zone buttons.
      Tab through them. Press Enter on "Chat · 木屋 · 跟 Airing 聊天"
      — chat panel should open. ESC closes it; focus restores back
      to the SkipNav button (not document body).

## Bonsai Pet (`/blog` + `/en/blog` author sidebar)

> Architecture: literal byte-for-byte mirror of the webml-community/
> bonsai-image-webgpu HF Space bundle, embedded via `<iframe>`. The
> bonsai bundle (`/bonsai-mirror/assets/index-Bf-HmMxp.js`, 891 KB)
> is unchanged from upstream; only `index.html` carries a small CSS
> override at the top to hide the surrounding image-generation UI +
> a script that blocks OrbitControls wheel-zoom and forwards wheel
> deltas to the parent window so blog scrolling still works.
>
> Component: `src/components/BonsaiWidget.astro` (iframe wrapper +
> SVG loading skeleton). 280×360 inline below the subscribe card.
> Hidden on <1200px and prefers-reduced-motion.

- [ ] GET `/blog` 返回页面
- [ ] DOM: `#bonsai-pet` exists in `.sidebar-sticky` (inline below
      `.subscribe-card`, width=100%, height=360px)
- [ ] DOM: `<iframe class="bonsai-iframe" src="/bonsai-mirror/index.html">`
      mounts within 1s and reports `width > 0` on its inner canvas
- [ ] DOM: `.bonsai-skel` SVG silhouette renders before iframe loads
      and fades out (`opacity: 0`) once `.bonsai-loaded` class lands
- [ ] DOM: GET `/bonsai-mirror/index.html` and `/bonsai-mirror/assets/index-Bf-HmMxp.js`
      both return 200
- [ ] CSS: `.bonsai-pet` has `pointer-events: none` (wrapper doesn't
      block clicks); `.bonsai-iframe` has `pointer-events: auto`
- [ ] Evaluate: iframe console emits `Built 8 instanced meshes from
      8 categories` (the bundle's own boot log) within 5s — confirms
      the upstream code is running unmodified
- [ ] Interaction: wheel-scroll while cursor is over the widget
      scrolls the blog page (not the bonsai camera) — bundle's
      OrbitControls is blocked at capture phase
- [ ] Screenshot: bonsai visibly cycles dark → autumn → winter →
      sakura over ~23 seconds (4 s dwell + 1.8 s fade per variant,
      4 variants, same as upstream)
- [ ] Visual: falling-leaf particles + warm dust motes both present
- [ ] Mobile (`<1200px` viewport): widget is `display:none`
- [ ] Reduced-motion: widget is `display:none`
- [ ] EN page (`/en/blog`): same widget mounted, same behavior

## Archive (`/archive/`)

- [ ] GET `/archive/` 返回页面
- [ ] DOM: 存在 `.nav-tab` 包含 "Search" 链接
- [ ] DOM: 存在 `.year-section` (按年分组)
- [ ] DOM: 文章链接 `.feed-item` 数量 > 0

## Archive — Featured

- [ ] DOM: `.featured-section` exists when featured posts exist
- [ ] DOM: `.featured-item` has left border

## Search (`/search/`)

- [ ] GET `/search/` 返回页面
- [ ] CSS: `.pagefind-ui__search-input` 背景色不是 `rgb(255, 255, 255)` (暗色模式)
- [ ] 输入 "Flutter" 后，DOM 出现搜索结果 `.pagefind-ui__result`
- [ ] DOM: 搜索结果链接颜色为主题色（非默认蓝色）
- [ ] Screenshot: 搜索页整体截图，确认风格与 Archive 一致

## Post Detail (`/posts/{any-slug}/`)

- [ ] GET 任一文章页返回成功
- [ ] DOM: `<link rel="canonical">` href 包含 `/posts/`
- [ ] DOM: `<meta property="og:type" content="article">`
- [ ] DOM: `<meta name="twitter:card">` 存在
- [ ] Evaluate: `<script type="application/ld+json">` 存在且 JSON 合法，包含 `@type: BlogPosting`
- [ ] DOM: `.post-nav-link` 存在（prev/next 导航）
- [ ] DOM: `.sb-related` 存在（侧边栏推荐阅读）
- [ ] DOM: 评论区 `#bottomComments` 存在
- [ ] DOM: 点赞按钮 `#articleLikeBtn` 存在
- [ ] DOM: Sidebar contains text matching "min" (reading time)

## Post Detail — Series (`/posts/weekly-20/`)

- [ ] DOM: `.series-badge` 存在且文本包含 "月刊"
- [ ] DOM: `.series-arrow` 存在（系列前后导航）

## Post Detail — Non-Series (`/posts/chromium-renderer/`)

- [ ] DOM: `.series-badge` 不存在

## Newsletter (Post Detail)

- [ ] DOM: `#nlForm` exists (subscribe form in post)
- [ ] DOM: `.nl-input` has transparent background (dark mode)

## SEO (全站)

- [ ] GET `/robots.txt` 返回内容包含 `Sitemap:`
- [ ] GET `/sitemap-index.xml` 返回 XML
- [ ] GET `/feed.xml` 返回 XML，包含 `<rss` 或 `<feed`

## Moments (`/moments/`)

- [ ] GET `/moments/` returns page
- [ ] DOM: `.moment-item` exists (timeline items)
- [ ] DOM: Nav tabs include "Moments" link

## Admin (`/admin/`)

- [ ] GET `/admin/` returns page
- [ ] DOM: Token input or comment list exists

## Post Detail — Image Gallery (`/posts/weekly-30/`)

- [ ] DOM: `.img-gallery` exists (consecutive images grouped into gallery)
- [ ] DOM: `.img-gallery-row` exists with multiple `.img-gallery-item` children
- [ ] CSS: `.img-gallery-row` has `display: flex`
- [ ] Evaluate: `.img-gallery-item` has non-default flex value (aspect-ratio based)

## Post Detail — Image Captions (`/posts/weekly-30/`)

- [ ] DOM: `.img-caption` exists for short text following images

## Post Detail — Table of Contents (`/posts/weekly-30/`)

- [ ] DOM: `#tocBlock` exists and is visible (`display` not `none`)
- [ ] DOM: `#tocNav` contains `.toc-link` elements matching h2/h3 headings
- [ ] DOM: `.toc-link.active` exists (scroll spy highlights current section)

## Light Mode Accent Colors

- [ ] CSS: In light mode, `--accent` is a darker shade (e.g. `#16a34a` for green theme)
- [ ] Evaluate: `getComputedStyle(document.documentElement).getPropertyValue('--accent')` returns darker color in light mode

## Post Detail — Gravatar (`/posts/weekly-30/`)

- [ ] DOM: `#bcComposeAvatar` src contains `d=robohash`
- [ ] Evaluate: `gravatarUrl` function returns URL with `d=robohash`

## Theme Switcher (任意页面)

- [ ] DOM: `#modeToggle` 存在（明暗切换）
- [ ] DOM: `#themeToggle` 存在（主题色切换）
- [ ] 点击 `#modeToggle`，`<html>` 的 `data-mode` 属性变化

## Post Detail — Code Blocks (`/posts/js-string-to-number/`, `/posts/case-sensitivity/`)

- [ ] Evaluate: `document.querySelectorAll('pre.astro-code').length` > 0
- [ ] Evaluate: 所有 `<pre>` 均带 `astro-code` class（不存在未渲染的裸代码块）
- [ ] Evaluate: 源 markdown 不含以单反引号起始的多行代码块（`grep '^\`[^\`]'` 仅命中行内代码）
- [ ] DOM: C++/JS 代码块含 Shiki 着色 span（`.line span[style*="color:"]`）

## Photos — Calendar (`/photos/calendar`)

- [ ] GET: 200 OK
- [ ] DOM: `.cal-stream` 存在,内含至少一个 `.cal-year`
- [ ] DOM: `.cal-year-head` 含 `.cal-year-num`(年份)和 `.cal-year-count`(数量)
- [ ] DOM: `.cal-month-head` 含 `.cal-month-label`(月份英文)和 `.cal-month-count`
- [ ] DOM: 每个 `.cal-month` 内有 `.photos-grid` + `.photo-card` 链接到 `/photos/<slug>`
- [ ] DOM: `.view-switcher-active` 文本为 `Calendar`,旁边有 `<a href="/photos">Grid</a>` 和 `<a href="/photos/albums">Albums</a>`
- [ ] CSS: `.cal-year-head` 有 `position: sticky; top: 0`
- [ ] Evaluate: 年份按降序排列(最新年份在前)

## Photos — Grid view-switcher (`/photos`)

- [ ] DOM: `.view-switcher` 内 `.view-switcher-active` 文本为 `Grid`
- [ ] DOM: `.view-switcher` 内有 `<a href="/photos/calendar">Calendar</a>`
- [ ] DOM: `.view-switcher` 内有 `<a href="/photos/albums">Albums</a>`(Calendar 与 Map 之间)

## Photos — Albums index (`/photos/albums`)

- [ ] GET: 200 OK
- [ ] DOM: `.view-switcher-active` 文本为 `Albums`
- [ ] DOM: `.albums-grid` 存在,内含至少一个 `.album-card`
- [ ] DOM: 每张 `.album-card` 含 `.album-name`(album 标题)+ `.album-sub`(`<n> photo(s)` + 时间范围)
- [ ] DOM: 卡片链接 href 形如 `/photos/albums/<album-slug>`
- [ ] Evaluate: 多 album 时按最新照片日期降序

## Photos — Album detail (`/photos/albums/<album>`)

- [ ] GET: `/photos/albums/2024-new-zealand` 200 OK
- [ ] DOM: `.facet-crumbs` 含 "All photos / albums / <name>" 面包屑
- [ ] DOM: `.photos-title` 显示 album 名称(原始大小写,如 `2024 New Zealand`)
- [ ] DOM: `.photos-grid` 内照片数量等于 album 内照片数
- [ ] Evaluate: 照片按 `takenAt` 降序

## Photos — Detail page album link (`/photos/<slug>` for a photo with `albums`)

- [ ] DOM: `.meta-tags` 内出现 `.meta-album` 链接,文本为 album 原名
- [ ] DOM: 该链接 href 形如 `/photos/albums/<album-slug>`

## Photos — Place taxonomy (`/photos/places/<city>`)

- [ ] GET: `/photos/places/shanghai` 200 OK(若无该城市则换一个 photos.json 里的)
- [ ] DOM: `.facet-crumbs` 含 "All photos / places" 面包屑
- [ ] DOM: `.photos-title` 显示 `City, Country` 格式

## Photos — Detail page place line (`/photos/<slug>` for a photo with `place`)

- [ ] DOM: `.meta-line.meta-link` 内含地图 pin SVG icon
- [ ] DOM: 该链接 `href` 形如 `/photos/places/<city-slug>`
- [ ] DOM: 链接文本为 `City, Country` 或仅 `City`

## Photos — Detail page mini map (`/photos/<slug>` with `place.coords`)

- [ ] DOM: `<div id="metaMap">` 存在 + `data-lat` / `data-lng` / `data-city-slug` 属性齐全
- [ ] CSS: `.meta-map` 高度 160px,有 border + border-radius
- [ ] Evaluate: 加载后 `#metaMap` 内有 `.leaflet-container`(Leaflet 已初始化)
- [ ] DOM: 地图上有 `.photo-pin` marker
- [ ] 点 marker 跳到 `/photos/places/<city-slug>`
- [ ] 没有 `place.coords` 的照片不渲染 `#metaMap`

## Photos — World map (`/photos/world`)

- [ ] GET: 200 OK
- [ ] DOM: `.world-map` + `data-pins` 属性,JSON 解析后非空数组
- [ ] CSS: `.world-map` 高度 70vh / min-height 420px (移动端 56vh / 340px)
- [ ] Evaluate: `.leaflet-container` 渲染,marker 数量 = unique city 数
- [ ] 多张照片同城显示 `.photo-pin-multi` (带计数 badge)
- [ ] 点 marker 弹出 popup,内含缩略图 + city + country + 张数
- [ ] popup 卡片 `.world-pop` 是链接,点击跳 `/photos/places/<city>`
- [ ] DOM: `.view-switcher-active` 文本为 `Map`

## Photos — Histogram (`/photos/<slug>` — every photo synced after histogram support)

- [ ] DOM: `<canvas id="histogramCanvas">` 存在 + `data-histogram` 是合法 JSON
- [ ] Evaluate: JSON.parse(canvas.dataset.histogram) 含 `red`, `green`, `blue`, `luminance` 四个数组,每个长度 128
- [ ] CSS: `.meta-histogram-canvas` 高度 110px(移动端 90px),背景 `rgba(28, 28, 30, 0.95)`
- [ ] Evaluate: 加载后 canvas.width > 0(已初始化绘制)
- [ ] Screenshot: 画面有暗背景 + RGB 叠加柱(Apple 配色)+ Luma 半透白底

## Photos — Umami custom events

- [ ] `/photos/<slug>` 点 share 按钮 → 触发 `photo-share` 事件 (data: { slug })
- [ ] `/photos/<slug>` 点全屏按钮 → 触发 `photo-fullscreen` 事件 (data: { slug })
- [ ] `/photos/<slug>` 点 camera/place/tag/album 链接 → 触发 `facet-link` 事件 (data: { kind: cameras|places|tags|albums, value, from })
- [ ] `/photos/world` 点 marker → 触发 `world-marker-click` 事件 (data: { city, country, count })
- [ ] `/photos`、`/photos/calendar`、`/photos/albums`、`/photos/world` 点 view-switcher 链接 → 触发 `view-switch` 事件 (data: { from, to })

## 沉积的像素 · 图片格式百科 (`/immersive/image-formats/`)

### 批 1 — 基础设施
- [x] Hero 区中英 H1（沉积/像素 双色 rt + web）+ deck + byline + hero-notice + TL;DR 4 step + 7 阵营 phase-pulse banner
- [x] TOC v2 9 个 toc-group 完整（Phase 0 已含 2 chip,其余 7 个 Phase + 工具箱 + 终章 chips 待回填）
- [x] 家族树 SVG viewBox 1200×900,7 行 swimlane 色带可见,时间轴 1985-2025 共 9 个 tick
- [x] 家族树 50+ 节点全部可见,13 个扛把子是方块（PNG/JPEG/WebP/AVIF/JXL/BC7/ASTC/EXR/RAW/DICOM/SVG/FITS/Neural）
- [x] 家族树关键事件标注（LZW patent / LZW expires / WebP public / HEIC iOS / AV1 1.0 / Chrome drops JXL）heat 色显示
- [x] 像素旅程 8 站点 HTML 灯条在家族树 SVG 下方独立显示（按阵营色：HDR 金/Web 蓝/GPU 紫/Ink 黑），与 SVG 不冲突
- [x] 序章 C0.1 排版正确,"50 种归宿" / "50 fates" 主题色 web 蓝
- [x] 7 个 Phase intro 已搭骨架（pi-note 占位待填），灯条按 spec 高亮正确站点：I/II/III/IV/V/VI/VII；Phase IV vec 灯条 dim
- [x] JS 加载无 console error；语言切换中→英→中全文响应,无残留
- [x] 桌面 1440 + 移动 390 两个视口无破版（移动端 family-tree 横向滚动）
- [x] gzip 后总 HTML 19 KB（远低于 250 KB 预算）

### 批 2 — Phase I · Web 显示派 13 章
- [x] Phase I intro pi-note 中英文已填,8 站灯条 active=compress+transmit
- [x] 13 章按 c1-c13 顺序插入,phase 色 cobalt 蓝染色 chap-title 一致
- [x] 5 个扛把子(C3 PNG / C6 JPEG / C10 WebP / C12 AVIF / C13 JXL)各含 4 张小 SVG + 1 张流程图 + case-study 历史专栏 + 同阵营对比表 + src-stack 命令行
- [x] 8 个普通章节(C1 BMP / C2 GIF / C4 APNG / C5 aWebP / C7 JPEG-LS / C8 JP2 / C9 JXR / C11 HEIC)各含 9 模块完整 + 1-2 张手绘 SVG
- [x] format-card 左 4px web-pale 色带 + meta-row 10 字段 + 灵魂引文 28px serif italic + use-cols + support 表 + trivia heat 边框 + lineage 父子链
- [x] TOC v2 Phase I 列回填 13 个 toc-chip(BMP 到 JPEG XL),hover/active 染色正常
- [x] 中英双语 288:288 完美对仗,切换无残留
- [x] 桌面 1440 渲染清晰、无破版;移动 390 各章节正常
- [x] gzip 后总 HTML 116 KB(预算 250 KB,占 47%)
- [x] 无 console error(只有 favicon 等无关资源 404)

### 批 3 — Phase II · GPU 纹理派 14 章
- [x] Phase II intro pi-note 中英文已填,8 站灯条 active=VRAM+sample+screen(GPU 紫色高亮)
- [x] 14 章按 c14-c27 顺序插入,phase 色 GPU 紫染色 chap-title 一致
- [x] 2 个扛把子(C20 BC7 / C24 ASTC)各含 4 张小 SVG + 1 张流程图 + case-study + 对比表 + src-stack
- [x] BC7 扛把子:8 mode 表 + 块选择流程 + BC1 vs BC7 视觉对比 + 编码时间对比 + ENCODE-TIME WAR case-study(Intel ISPC 救命)
- [x] ASTC 扛把子:14 块大小 vs bpp 表 + 16-byte block 布局 + 4×4/6×6/12×12 视觉对比 + ASTC vs BC7 + 历史专栏(ARM/Khronos/Intel HD politics/WebGPU)
- [x] 12 个普通章节(C14-C19 + C21-C23 + C25-C27)各含 9 模块完整 + 1 张手绘 SVG
- [x] BCn 家族 6 章(C16-C20)对比清晰,可看出 BC1→BC2/3→BC4/5→BC6H/BC7 进化链
- [x] TOC v2 Phase II 列回填 14 个 toc-chip(KTX 到 Mipmap),hover/active 染色正常
- [x] 中英双语完美对仗,切换无残留
- [x] 桌面 1440 渲染清晰、无破版
- [x] gzip 后总 HTML 203 KB(预算 250 KB,占 81%)
- [x] 无 console error

### 批 4 — Phase III + IV · HDR + 矢量 13 章
- [x] Phase III HDR intro pi-note 中英文已填,8 站灯条 active=birth+edit(金色高亮)
- [x] Phase IV VEC intro pi-note 中英文已填,8 站灯条全 dim 仅 screen active(反旅程 anti-journey 设计)
- [x] Phase III HDR 8 章 (C28-C35) 按顺序插入,phase 色 hdr 金染色
- [x] Phase IV VEC 5 章 (C36-C40) 按顺序插入,phase 色 vec teal 染色
- [x] 4 个扛把子完整: C28 OpenEXR (ILM 30 年 + ASWF 捐赠) / C32 RAW (Bayer + dcraw + LibRaw) / C35 DICOM (4000 tag + DIMSE/DICOMweb) / C36 SVG (W3C 战胜 Flash/VML)
- [x] 9 个普通章节: C29 Radiance / C30 PFM / C31 TIFF / C33 DNG / C34 CR3-NEF-ARW / C37 PDF / C38 EPS / C39 AI / C40 JBIG2
- [x] TOC v2 Phase III + IV 列回填 13 chip(C28-C40)
- [x] 中英双语完美对仗,切换无残留
- [x] 桌面 1440 渲染清晰
- [⚠️] gzip 后总 HTML 313 KB(超出 spec 250 KB 预算 25%,尚可接受 — 用户选择"无上限")
- [x] 无 console error

### 批 5 — Phase V + VI + VII · 复古 + 科学 + 未来 18 章
- [x] Phase V Retro intro pi-note 中英文已填,sepia copper 染色,8 站灯条 active=birth+screen(时间机器隐喻)
- [x] Phase VI Science intro pi-note 中英文已填,science indigo 染色,active=birth+edit(测量)
- [x] Phase VII Future intro pi-note 中英文已填,neural magenta 染色,active=compress+transmit
- [x] Phase V Retro 9 章(C41-C49)按顺序插入,sepia copper 染色
- [x] Phase VI Science 4 章(C50-C53)按顺序插入,science indigo 染色
- [x] Phase VII Future 5 章(C54-C58)按顺序插入,neural magenta 染色
- [x] 2 个扛把子: C52 FITS(40 年天文标准,Don Wells 1981 → JWST 2021)/ C57 神经压缩(HiFiC + CDC + 6 个 NN codec)
- [x] 16 个普通章节(C41-C46/C50/C51/C53-C56/C58)各 9 模块完整
- [x] TOC v2 Phase V (9) + VI (4 by D3) + VII (5) 列回填,共 18 chip
- [x] 中英双语完美对仗,切换无残留
- [x] 桌面 1440 渲染清晰
- [⚠️] gzip 后总 HTML 428 KB(超 spec 250 KB 预算 71%,用户选择"无上限")
- [x] 无 console error

### 批 6 — Phase VIII + IX · 工具箱 + 终章 7 章
- [x] 工具箱 4 章 (C59-C62) 按顺序插入,data-phase=bg(neutral)
- [x] C59 命令行 codec 一览 — 17+ 行表格 (JPEG/PNG/WebP/AVIF/JXL/HEIC/GIF/BC/ASTC/KTX2/Basis/EXR/TIFF/RAW/DICOM/SVG/FITS/generic) + 4 条 useful facts
- [x] C60 DevTools 看响应头与解码时间 — 4 张手绘 DevTools UI SVG (Network/Performance/picture fallback/decode time)
- [x] C61 libvips vs ImageMagick 性能对比表 — streaming vs full-load 设计哲学
- [x] C62 「我应该用哪个格式」决策树 — 大 SVG 决策树 + 4 张快速场景卡 (Web 设计师 / 游戏纹理师 / 摄影师 / 学术研究)
- [x] 终章 3 章 (C63-C65) 按顺序插入
- [x] C63 像素的归宿 — 收束 8 站旅程,3 段叙事 + 8 站时间轴 SVG + serif pull 引文
- [x] C64 三个反直觉结论 — keynum 3 卡 (最古老不一定最差 / ASTC 6×6 vs BC7 / AVIF 战胜 JXL 是政治)
- [x] C65 参考与扩展阅读 — ~70 条 reference 按 Phase 分组 (RFC/ISO/paper/blog/GitHub)
- [x] closing footer 完成 — "完 / Fin" + 斜体 serif 引文 "每一种格式都是一次妥协的化石" + 邮件 invite + byline (Author/Date/Series 链接 v8-fast-js/chromium-renderer/helio/jank-stutter) + signoff "FIELD NOTE / 05"
- [x] TOC v2 工具箱 (4) + 终章 (3) 列回填,共 67 chip 全部就位
- [x] 全文最终统计: 16096 行 HTML / 134 chap-title (67×2 双语对仗) / 58 format-card / 14 format-flow-svg / 17 case-study / 13 扛把子完整(JPEG/PNG/WebP/AVIF/JXL/BC7/ASTC/EXR/RAW/DICOM/SVG/FITS/Neural)
- [⚠️] gzip 后总 HTML 453 KB(超 spec 250 KB 预算 81%,用户选择"无上限")
- [x] 无 console error

### 批 7 — 首页节日彩蛋（仅 `/` 生效）
- [x] 首页今日命中节日表 → `<html data-theme>` 设为对应预设（6 色：green/blue/purple/amber/rose/cyan）
- [x] 离开首页（/blog 等）时无 data-theme 残留，CSS 回退到 :root 默认绿
- [x] FIXED_DATES 覆盖固定公历节日（45+ 条），FLOATING_DATES 覆盖 2026–2028 农历/伊斯兰/复活节/节气/Mother/Father/Thanksgiving（100+ 条）
- [x] 优先级：生日 > 中国法定 > SG 法定 > 节气 > 中国民俗 > 西方 > 趣味/电商
- [x] 6/30 生日 cyan，1/1 元旦 cyan，4/1 愚人节 purple，10/1–10/7 国庆 rose，11/11 双十一 purple，12/25 圣诞 green
- [x] Peak Day 1.1/2.2/3.3/6.6/7.7/8.8/9.9/10.10/11.11/12.12 全 purple（碰撞由 FLOATING 覆盖）
- [x] 5/4 默认 blue（Star Wars/青年节），但 2026/2027 落在劳动节假被 rose 覆盖
- [x] data-theme="green" 用 emerald `#34d399`（暗）/ `#059669`（亮），与默认 green `#4ade80`/`#16a34a` 区分（同明度、色相偏青）
- [x] 胶囊提示（右下角 mode-toggle 左侧）显示节日名 + 主题色描边 + 脉动小点
- [x] 胶囊文字按 `localStorage.preferred_lang` 双语切换，监听 `langchange` 即时同步
- [x] 胶囊点击 → 清掉 data-theme 回默认色 + 胶囊变灰停脉动 + sessionStorage 记忆；再点恢复
- [x] sessionStorage key = `easter-dismissed:YYYY-MM-DD`，跨日自动重亮
- [x] `?eggDate=YYYY-MM-DD` query 参数预览任意日期（不入侵生产）
- [x] `<480px` 移动端隐藏胶囊
- [x] 单元测试：`tests/easter-egg-themes.test.mjs` 13 项全过（节日命中、双语、优先级、6 色合法性）

## 从 Rust 到 SIMD · WebAssembly 的一生 (`/immersive/webassembly/`)

### 批 1 — 结构与骨架
- [ ] Hero 区中英 H1（Rust copper / SIMD gpu / 寄存器 accent 三色）+ deck + byline 4 项 + hero-notice 链回 chromium-renderer/v8-fast-js + pipeline-bar 13 段脉动
- [ ] TOC v2 六大段 progress bar (4/1/6/6/5/4 比例) + 6 个 toc-group 覆盖全部 26 章
- [ ] 26 个 `<section class="chap">` 全部存在(c1-c26 + cmain),无 id 重复,103 个内部锚点全部命中
- [ ] 左侧 toc-side 桌面端可见(viewport ≥ 1320px),scroll 时 active 章节高亮跟随
- [ ] 中英 lang-toggle 切换无残留;footer 内的 `<span lang="zh">/<span lang="en">` 同步切换
- [ ] 桌面 1440 + 移动 390 两个视口无破版(移动端 stack-viz 单列 / toc-chips 单列 / cross-link 竖排)
- [ ] gzip 后 HTML 体积 ≤ 80 KB(实际 ~ 382 KB 未压,gzip 估 ~ 50-60 KB)
- [ ] 无 console error(允许 favicon/og 资源 404)

### 批 2 — Act I 背景 4 章
- [ ] Ch01 三个公式 · 三个 formula 块染 accent 绿色边、term/term-cu 色对 + Engine tier 拓扑对照表(6 引擎)
- [ ] Ch02 家谱 · ftree pre 块时间线 2009–2026 + 4 阶段提案表 + 三个祖先 ladder(NaCl/Emscripten/asm.js)
- [ ] Ch03 栈机 · stack-viz 双栏对比(wasm vs LLVM IR) + 4 张 mismatch-card + case-study fib(40) 字节对比
- [ ] Ch04 JS 天花板 · 3 件天花板 ladder + v8-fast-js 引用 case-study + 6 行性能基准表 + tier-bar 包含

### 批 3 — Act II 主线 The Hot Loop
- [ ] Ch05 主线 cmain · hot.rs 11 行 Rust 完整;192 字节十六进制 + wat 展开版 + Liftoff/TurboFan 出码对比
- [ ] tier-bar 性能图(JS / Liftoff / TurboFan / SIMD)四档
- [ ] "回引地图"表格列出 22 章重访点

### 批 4 — Act III 二进制解剖 6 章
- [ ] Ch06 外壳 · 4 个 bin-row(magic/version/section type/payload)
- [ ] Ch07 11 section · section-grid 12 卡片(含 DataCount)
- [ ] Ch08 类型 · 9 行 cmp 表(numeric/vector/reference/GC) + tier-bar Hot Loop 类型分布
- [ ] Ch09 指令集 · 6 张 mismatch-card 家族卡 + 3 行 bin-row 单指令拆解
- [ ] Ch10 线性内存 · code-block memory 地图 + grow 代价说明
- [ ] Ch11 验证 · stack-viz 类型栈实际走步 + 3 种类型错误表 + polymorphic stack 说明

### 批 5 — Act IV 编译流水线 6 章
- [ ] Ch12 Decode · dt-mock 流水线时间线(Network/IO/Compile/Main 四 thread)
- [ ] Ch13 Validate · 4 引擎并行策略对照表
- [ ] Ch14 Liftoff · 完整 x86-64 出码(~ 240 字节) + tier-up cmp/jne 触发器
- [ ] Ch15 TurboFan · 6 步流程 ladder + Liftoff/TurboFan 6 维对比表
- [ ] Ch16 Instantiate · 7 步 ladder + JS importObject 代码块
- [ ] Ch17 JS↔Wasm · 4 种 trampoline 表 + JS-to-Wasm wrapper x86 代码 + 4 档历史 tier-bar(80→5 ns)

### 批 6 — Act V 提案族 5 章
- [ ] Ch18 Threads · 3 张 atomic 卡 + JS workers 代码 + Spectre 1.5 年延期史 + 多线程 tier-bar
- [ ] Ch19 SIMD · v128 lane shape 6 行表 + Hot Loop SIMD 版 wat + Relaxed SIMD note
- [ ] Ch20 GC · struct/array/i31/ref/cast wat 代码块 + 共享 GC 不等于共享对象模型
- [ ] Ch21 Component Model · WIT 完整接口示例 + wit-bindgen 命令
- [ ] Ch22 六提案 · section-grid 6 卡(tail/EH/memory64/JSPI/stack-switching/multi-memory) + tail-call wat 对比

### 批 7 — Act VI 综合 4 章 + 底栏
- [ ] Ch23 性能模型 · 性能 formula 公式块 + 3 场景 ladder + 4 张"反直觉"mismatch-card
- [ ] Ch24 DevTools · 3 层调试信息对照表 + Chrome DevTools 启用 3 步 ladder
- [ ] Ch25 战场 · 5 大产品段落 + 9 行案例汇总表(Figma/Photoshop/AutoCAD/Ruffle/ffmpeg/Blazor/1Password/CW)
- [ ] Ch26 术语表 · 50 个 dt/dd 条目按 wasm / asm.js / MVP / 栈机 / LEB128 / ... 顺序 + 终章 pull-quote
- [ ] 交互底栏(likes/views/comments)接入 https://chat.ursb.me + slug = "note/webassembly"
- [ ] online-presence 6 档 tier 双语正确

### 批 8 — v2 升级:12 张 SVG + 3 个新章节 + References 附录
- [ ] CSS 新增 .svg-figure(蓝图风:背景网格 + s-acc/s-cu/s-gpu fill 类 + stk-* stroke 类 + t-mono/t-serif/t-title typography)
- [ ] CSS 新增 .svg-figure.handdrawn 变体(t-hand 字体 + 不规则描边)
- [ ] CSS 新增 .refs-block(W3C/IETF/RFC/CG/WG 5 色标签 + dt/dd grid)
- [ ] CSS 新增 .w3c-pill 状态徽章(rec/cr/wd 三种)
- [ ] CSS 新增 svg-flow / ts-step / sm-pop/push keyframes
- [ ] Hero SVG (FIG · HERO) · 13 段流水线 + 4 phase 标 + 3 dot 沿 path 动画
- [ ] Ch02 SVG (FIG 02) · 家谱时间线 · 4 血脉收敛到 2015 + 主干至 2026 · handdrawn 风
- [ ] Ch06 SVG (FIG 06) · hot.wasm 192 字节按 section 比例图 + 前 16 字节 hex 放大
- [ ] Ch07 SVG (FIG 07) · 11 section 引用拓扑 · 4 列(declare/body/init/host) + arrow markers
- [ ] Ch08 SVG (FIG 08) · GC 后类型 lattice · anyref 顶 + i31/struct/array/funcref/externref + null bottom
- [ ] Ch09 SVG (FIG 09) · 256 opcode 16×16 网格 · 6 家族染色 + 0xFB-0xFE 4 prefix
- [ ] Ch10 SVG (FIG 10) · 4 GiB 地址空间 · ACTIVE + GUARD + PROT_NONE + SIGSEGV → RuntimeError 时序
- [ ] Ch11 SVG (FIG 11) · 类型栈 7 步动画 · CSS keyframes 自动循环 7 秒
- [ ] Ch15 SVG (FIG 15) · sea-of-nodes · LoadElimination 前 21 节点 vs 后 13 节点
- [ ] Ch17 SVG (FIG 17) · trampoline 三栈帧 · JS / wrapper / wasm + r15/r14 装填 + 4 档历史 tier-bar
- [ ] Ch18 SVG (FIG 18) · 共享内存拓扑 · main thread + 4 workers + 中央 SAB + COOP+COEP 提示
- [ ] Ch19 SVG (FIG 19) · v128 寄存器 6 种 lane(i8x16/i16x8/i32x4/i64x2/f32x4/f64x2)
- [ ] Ch21 SVG (FIG 21) · Component Model lift/lower · Rust String → ABI → Go string 三段
- [ ] Ch27 新章节 · 安全模型 · 三层沙箱 ladder + Spectre 1.5 年延期史 + CVE 表 + WasmCert
- [ ] Ch28 新章节 · 服务端 wasm · 6 平台对照表 + 5 档冷启动 tier-bar + WASI 0.2 + 3 限制
- [ ] Ch29 新章节 · wasm 不能做什么 · 7 个硬限制 ladder + 每条配绕过办法
- [ ] References 附录 · A 核心 W3C · B 提案 · C IEEE/RFC · D WASI · E 学术 · F 源码 · G 治理(共 7 个 refs-block ~ 45 条引用)
- [ ] TOC v2 + 左侧 toc-side 同步更新 · 新增 4 个 appendix 链接
- [ ] gzip 后 HTML 体积 ≤ 200 KB(实际 ~ 150 KB)
- [ ] 全文最终统计:30 章 + 13 figure-svg + 15 表 + 22 code block + 7 refs-block + 14 pull-quote(双语 7 对)

## 一次 setState 的一生 · React 渲染流水线 (`/immersive/react-internals/`)

### 批 1 — 结构与骨架
- [ ] Hero 区中英 H1（setState accent / React copper 双色）+ deck + byline 4 项 + hero-notice + pipeline-bar 12 段脉动
- [ ] TOC v2 四大段 progress bar (5/1/13/5 比例) + 4 个 toc-group 覆盖全部 23 章 + 主线 ✦ chip
- [ ] 24 个 `<section class="chap">` 全部存在（c1-c23 + cmain），无 id 重复
- [ ] toc-side 左侧目录滚动时高亮当前章节（IntersectionObserver）

### 批 2 — 内容章节
- [ ] Ch01 三个公式 · formula 卡 + 三段说明（公式①声明式 / ②diff ≠ vDOM / ③调度才是革命）
- [ ] Ch02 家谱 · FIG 02·1 13 年五个分水岭时间线 SVG + 5 行 ladder
- [ ] Ch03 为何重写 · FIG 03·1 Stack 17ms 阻塞 vs Fiber 5ms 切片对比 SVG + mismatch-grid
- [ ] Ch04 三层架构 · rulemap-grid 三层 + HostConfig 代码 + proc-grid 4 个 renderer
- [ ] Ch05 流水线全景 · FIG 05·1 三列 13 步总览 SVG + cmp 表 phase 边界
- [ ] cmain · Counter 9 行代码 + FIG ✦ 时间线（5 段 micro-task 着色）
- [ ] Ch06 JSX→Element · jsx() 编译后代码 + Element 形状代码 + mismatch-grid Element vs Fiber
- [ ] Ch07 Fiber · FIG 07·1 Counter 树（child 蓝 / sibling 铜 / return 灰虚线）+ 60 字段四簇代码
- [ ] Ch08 双缓冲 · FIG 08·1 commit 前后指针交换图 + ladder 三条理由
- [ ] Ch09 beginWork · workLoop 代码 + beginWork switch 代码 + bail-out 说明
- [ ] Ch10 Reconciliation · rulemap-grid 三规则 + FIG 10·1 keyed list 两遍 diff SVG + key 反模式对比
- [ ] Ch11 completeWork · 三件事 ladder + ReactFiberFlags 位掩码代码
- [ ] Ch12 Hooks · renderWithHooks 代码 + FIG 12·1 hook 链表 SVG + dispatchSetState 代码
- [ ] Ch13 BeforeMutation · 三个 commit 子阶段 proc-grid + getSnapshotBeforeUpdate 代码
- [ ] Ch14 Mutation · cmp 表 flag→action→react-dom 调用 + commitRootImpl 代码（含 root.current = 切换）
- [ ] Ch15 Layout/Passive · FIG 15·1 物理位置时间线 SVG + mismatch-grid layout vs passive
- [ ] Ch16 Lanes · ReactFiberLane 代码 + FIG 16·1 优先级阶梯图 + bitwise 操作 cmp 表
- [ ] Ch17 Time Slicing · 不用 rIC 的 3 个理由 ladder + scheduler 代码 + FIG 17·1 sync vs concurrent 时序图
- [ ] Ch18 Suspense · use() 真实代码 + 8 步生命周期 case-study + Transition SearchBox 代码
- [ ] Ch19 一次更新时间线 · FIG 19·1 全栈时间线（5 lane × 13 stage）SVG + 4 个 hotspot 标注
- [ ] Ch20 RSC · mismatch-grid Server vs Client + RSC payload 实际格式
- [ ] Ch21 React 19 · rulemap-grid 四件大事（use / Actions / Compiler / OwnerStacks）+ before/after compiler 对比
- [ ] Ch22 症状反查 · cmp 表 10 条症状 → 章节映射
- [ ] Ch23 术语表 · cmp 表 30 个名词 + Andrew Clark 引言 blockquote

### 批 3 — 交互与样式
- [ ] 中英双语切换（lang-toggle）持久化 localStorage
- [ ] hero pipeline-bar 12 cell 脉动动画（蓝→铜→紫渐变）
- [ ] toc-v2 progress 条点击跳转到对应 act
- [ ] 所有 `<a href="#cN">` 锚点平滑滚动
- [ ] 全文风格匹配 chromium-renderer / http3（cobalt + copper + violet 蓝图调色板）
- [ ] mdx 入口 `/notes/react-internals` 链回沉浸式版

---

## Visitor Pass Card (homepage sidebar, below Subscribe)

> Spec: `docs/superpowers/specs/2026-05-17-visitor-pass-card-design.md`
> Plan: `docs/superpowers/plans/2026-05-17-visitor-pass-card.md`

### Layout & render
- [ ] DOM: `#visitorPass .vp-pass` 存在于右侧栏
- [ ] Screenshot (light mode): card 完整可见，280×280 左右
- [ ] Screenshot (dark mode `data-mode="dark"`): card 背景 `#0d1117`，accent 为 `#4ade80`
- [ ] Evaluate: `getComputedStyle(document.querySelector('.vp-skull')).width === '14px'`（global CSS 命中 JS 注入的 DOM）

### Data
- [ ] Evaluate: `#vpTotal` 文本能 parse 成数字且 > 28000（含历史 offset 28655）
- [ ] Evaluate: `#vpToday` 文本匹配 `/^#\d+$/`
- [ ] Evaluate: `#vpJoined` 文本匹配 `/^\d{4}\.\d{2}\.\d{2}$/`（今日日期）
- [ ] Evaluate: 刷新页面后 sessionStorage 有 `visitor_v2` key，且 total 不变（无二次 increment）

### Skull tribe
- [ ] DOM: `.vp-tribe .vp-skull` 至少 1 个（取决于在线人数）
- [ ] Evaluate: 至少 1 个 skull 有 `.vp-you` class（要么基于真实国家匹配，要么是 fallback 给最后一个）
- [ ] Evaluate: skull 的 `<g>` `fill` 解析为合法颜色（accent / blue / purple 等）
- [ ] Hover skull：原生 tooltip 显示国家名（如 "China · You"）
- [ ] 在线人数 > 国家映射总和时，差额渲染为灰色"未知"skull（fill = `var(--c-text-dim)`）

### 3D 动效
- [ ] Hover 卡片：`#visitorPass .vp-pass` style.transform 包含 `rotateY` / `rotateX`
- [ ] Mouseleave：transform 被清空
- [ ] Evaluate: `prefers-reduced-motion: reduce` 下 transform 仍然 set 但 transition 为 none（动画被禁用）

### i18n
- [ ] EN locale: `.vp-hero-label` 文本为 "YOU ARE VISITOR"，`vp-k` 含 "TODAY"/"JOINED"
- [ ] ZH locale: `.vp-hero-label` 文本为 "你是第"，含 "今日"/"加入"
- [ ] 在线 meta 模板用单层 `<b>`（不能双重 `<b><b>`）

### 容错
- [ ] Supabase RPC 500 → card 仍渲染 `#--,---` 占位，无 console error 崩溃
- [ ] `/api/online/count` 失败 → `.vp-online-row` 保持 `hidden`，主信息仍展示
- [ ] 移动端 375×812 视口 → card 自适应不溢出

---

## Online Popover Scene (homepage, click `.online-line` under mascot)

> Spec: `docs/superpowers/specs/2026-05-17-online-popover-scene-design.md`
> Plan: `docs/superpowers/plans/2026-05-17-online-popover-scene.md`

### Render
- [ ] Click `.online-line` → popover opens with country list visible
- [ ] Scene SVG visible BELOW the country list
- [ ] Scene shows ~28 furniture pieces (bookshelf / jukebox / DJ booth / vending / TVs / plants / etc.)
- [ ] Bear count == `min(count.site, 7)`; `+N` overflow marker visible when total > 7

### Data & "you"
- [ ] Bears colored by region (CN=brown, US=orange, JP=brown, DE=purple, AU=blue, ZA=yellow)
- [ ] Current visitor's bear (if `sessionStorage.vp_country` set & matches an online country) has accent green ring with pulse
- [ ] Bears assigned to fixed slot positions — never random

### Animation
- [ ] Random bear briefly blinks every ~6-10 seconds while popover is OPEN
- [ ] String light bulbs fade in/out (5s loop, staggered)
- [ ] Disco ball inner circle gently pulses (4s loop)
- [ ] Closing popover stops the blink interval (verify `el._vpsBlinkTimer == null`)
- [ ] Reopening popover restarts blinks
- [ ] `prefers-reduced-motion: reduce` → bear blinks skipped, CSS animations disabled

### Theme & layout
- [ ] Scene renders identically in both light + dark mode (self-contained dark scene)
- [ ] 375×812 mobile viewport → scene scales proportionally, no overflow

### Edge cases
- [ ] `total === 0` → no scene rendered (popover keeps country list)
- [ ] `total === 1` → 1 bear in slot 1, scene otherwise empty
- [ ] All countries unknown → bears all grey (`#888888`)
- [ ] `vp_country` null → no bear gets the ring

---

## Lounge Page (`/lounge`, sub-project B-MVP)

> Spec: `docs/superpowers/specs/2026-05-17-lounge-page-design.md`
> Plan: `docs/superpowers/plans/2026-05-17-lounge-page.md`

### Page render
- [ ] GET `/lounge` returns page; canvas fills viewport (1600×900 logical, scaled)
- [ ] Furniture scene visible (couches, tables, DJ booth, bookshelves, posters, neon sign, disco ball)
- [ ] Back button top-left works

### Movement
- [ ] Own bear spawns at door (bottom-center, ~800,760)
- [ ] Click on floor → bear walks there with leg animation
- [ ] Click outside walkable area → clamps to floor edge
- [ ] Bear faces direction of travel (sprite flips horizontally)

### Multiplayer
- [ ] Open in 2 browsers → each sees the other's bear within ~1s
- [ ] Movement syncs within ~150ms (interpolated, smooth)
- [ ] Closing one tab → other sees disappear within ~1s

### Interactions
- [ ] Click own bear → radial menu (👋🪑💃💬) pops up at bear position
- [ ] Wave → right arm raises 1.5s, peers see it
- [ ] Sit → legs disappear, persists until clicked again
- [ ] Dance → 3s bounce loop, peers see it
- [ ] Say → text input at bottom; Enter sends; speech bubble for 3s
- [ ] Click another bear → walks to them + auto-wave on arrival

### Resilience
- [ ] WS disconnect → "reconnecting…" toast, exponential backoff
- [ ] Server restart → all clients re-snapshot when reconnected
- [ ] Cap at 50 connections → 51st gets "at capacity" toast
- [ ] Spam position updates → server rate-limits silently
- [ ] Send `say` text > 60 chars → server clamps to 60
- [ ] Send `say` containing blocklist word → dropped silently

### Entrypoint
- [ ] Homepage popover under mascot has `See more →` link at bottom
- [ ] Clicking → navigates to `/lounge`

### Mobile / a11y
- [ ] Touch = click; tap floor → walk; tap own bear → menu opens
- [ ] 375×812 viewport scales canvas, controls reachable

---

## Lounge V2.0 (`/lounge`, Phaser scaffold)

> Spec: `docs/superpowers/specs/2026-05-17-lounge-v2.0-phaser-scaffold-design.md`
> Plan: `docs/superpowers/plans/2026-05-17-lounge-v2.0-phaser-scaffold.md`
> Root docs: `lounge-v2-master-roadmap.md`, `lounge-v2-architecture-principles.md`, `lounge-v2-asset-pipeline.md`

### Mount & render
- [ ] GET `/lounge` mounts a Phaser canvas (1 canvas under `#lounge-mount`)
- [ ] Tilemap renders (wood floor, brick walls, door, table+chairs, plant)
- [ ] Own bear spawns at the spawn point (door, ~240,296)
- [ ] No console errors

### Movement
- [ ] Click on floor → bear walks there with 4-direction animation
- [ ] Click on furniture → target snapped to edge (collision avoidance)
- [ ] Click outside walls → target clamped to walkable area
- [ ] Walking up shows back-of-head sprite (no eyes/nose visible)
- [ ] Walking down shows full face (eyes + cheeks)
- [ ] Walking left/right shows side-profile (single eye visible)

### Multiplayer
- [ ] Open in two browsers → each sees the other's bear
- [ ] Position updates within ~150ms
- [ ] Closing one tab → other sees disappear within ~1s
- [ ] Server accepts `hi` messages without visitor_id (backwards compat)
- [ ] Server accepts `hi` messages WITH visitor_id (Era 2 ladder hook works)

### Functional regressions vs V1 (intentional — restored in V2.1)
- [ ] No radial interaction menu (clicking own bear walks, doesn't open menu)
- [ ] No speech bubbles
- [ ] No emote verbs (wave/sit/dance/say)

### Performance
- [ ] Bundle size /lounge ≤ 800 KB gzipped
- [ ] Steady 60 FPS with 1-3 peers visible
- [ ] No memory leak across long sessions

### Known V2.0 limitations (to address in later phases)
- [ ] `prefers-reduced-motion` does not yet pause walk animation (V2.1)

---

## Lounge V2.1 (`/lounge`, audio + UI + emotes)

> Spec: `docs/superpowers/specs/2026-05-17-lounge-v2.1-audio-ui-emotes-design.md`
> Plan: `docs/superpowers/plans/2026-05-17-lounge-v2.1-audio-ui-emotes.md`

### Audio
- [ ] Click anywhere on `/lounge` produces a faint click SFX (after first user gesture)
- [ ] Walking → footstep alternates roughly every other step
- [ ] Mute button visible top-right, 36×36, 🔊 default
- [ ] Click mute button → all audio silenced, button shows 🔇
- [ ] Reload page → mute state persists (localStorage `lounge_muted`)
- [ ] Each emote verb has distinct SFX (wave / sit / dance / say / menu_open / menu_close)

### Emote menu + verbs
- [ ] Click own bear → radial menu appears at bear's screen position
- [ ] Menu has 4 buttons: 👋 🪑 💃 💬
- [ ] Esc closes menu
- [ ] Click outside menu (on canvas) closes menu
- [ ] Click 💬 → text input appears at bottom, focused
- [ ] Type + Enter → speech bubble above own bear for 3s
- [ ] Wave: bear's right arm raises 1.5s, peers see it
- [ ] Sit: bear sits, persists until clicked again (toggle)
- [ ] Dance: bear bounces 3s with walk-cycle frames
- [ ] Say: speech bubble shows for 3s, peers see it

### Click peer interaction
- [ ] Click another bear → own bear walks near them + auto-waves on arrival

### Speech bubble lifecycle
- [ ] Bubble positioned over the bear's head
- [ ] Bubble follows bear as they walk (updates each frame)
- [ ] Bubble fades out at 3s (instant under reduced-motion)
- [ ] Only one bubble per bear at a time

### Reduced motion
- [ ] `prefers-reduced-motion: reduce`: walk frame static, no cycle
- [ ] Dance still happens (state + SFX) but no Y bounce
- [ ] Menu opens instantly (no scale animation)
- [ ] Bubble fade is instant

### Server (V2.1 bug fix)
- [ ] WS server `act` rate limit allows immediate first emote (was silently dropping all emotes pre-fix)
- [ ] Subsequent emotes throttled to ~1 per 3s per visitor

### Known V2.1 gaps (deferred)
- [ ] BGM file not yet present (V2.1.1 patch)
- [ ] Ambient sounds not present (V2.4 atmosphere)
- [ ] Per-channel volume sliders not present (V2.4)

---

## Lounge V2.2+V2.3 (`/lounge`, multi-room + interactables)

> Spec: `docs/superpowers/specs/2026-05-17-lounge-v2.2-v2.3-multi-room-interactables-design.md`
> Plan: `docs/superpowers/plans/2026-05-17-lounge-v2.2-v2.3-multi-room-interactables.md`

### Rooms
- [ ] `/lounge` opens in Lobby (default room)
- [ ] Lobby has 2 doors visible (east + west walls)
- [ ] Walking into east door → fades to black → spawns in DJ Floor at `from_lobby` point
- [ ] DJ Floor has 1 door (west wall) back to Lobby
- [ ] Walking into Balcony door (west of Lobby) → spawns in Balcony at `from_lobby`
- [ ] Each room renders its own tilemap (different layout / furniture)

### Multiplayer room scoping
- [ ] Two browsers in different rooms → each sees 0 peers from the other room
- [ ] Two browsers in same room → see each other
- [ ] Player moves through portal → other room's peers see them join; old room's peers see them leave

### Interactables
- [ ] Standing near a couch → `[E] sit` floats above own bear's head
- [ ] Pressing E → bear walks to couch anchor + sits
- [ ] Sitting → bear stays seated (state persists)
- [ ] Pressing E again while sitting → bear stands up (sit toggles off)
- [ ] Moving via WASD/arrow keys while sitting → bear stands up + walks
- [ ] Clicking the couch directly → same as pressing E
- [ ] Walking away from couch (out of proximity) → prompt disappears

### Protocol compatibility
- [ ] v=1 client (no room field) defaults to room_lobby (smoke-tested via Node script)
- [ ] v=2 client sends room field on hi/pos
- [ ] Server clamps pos updates to per-room floor bounds
- [ ] Un-greeted peers don't receive cross-room broadcasts (race fix)

### Reduced motion
- [ ] Portal transitions are instant (no fade) under reduced-motion
- [ ] All emote behaviors from V2.1 still respect reduced-motion

<<<<<<< HEAD

## Lounge V2.4 + V2.5 (atmosphere + pipeline maturity)

### Rooms (all 4 walkable)
- [ ] `/lounge` opens in Lobby with 3 visible doors (east → DJ, west → Balcony, north → Library)
- [ ] Walk into north door → fade → spawn in Library at `from_lobby`
- [ ] Library has bookshelves along north wall + reading chairs
- [ ] South door of Library back to Lobby spawns at `from_library` (just south of north door)
- [ ] All 6 portal directions work: lobby↔dj_floor, lobby↔balcony, lobby↔library

### Day / night atmosphere
- [ ] Tint overlay matches local clock phase (dawn ≈ peach, day ≈ no tint, dusk ≈ purple, night ≈ deep blue)
- [ ] Overlay persists across room transitions (no flicker)
- [ ] Within ±15 min of phase boundaries the color is a blend of the two phases

### Ambient particles
- [ ] Lobby: slow drifting dust motes (warm tint)
- [ ] DJ Floor: pink music-note particles near the booth
- [ ] Balcony: green falling leaves drifting diagonally
- [ ] Library: subtle warm glints, very low alpha
- [ ] Under `prefers-reduced-motion`, no particles spawn

### Volume controls
- [ ] ⚙️ gear button next to mute button opens panel
- [ ] Panel has 4 sliders (Master / SFX / BGM / Ambient), values persist via localStorage
- [ ] Dragging SFX slider changes next playSfx volume immediately
- [ ] Closing via outside-click or Escape works
- [ ] Reload page → sliders restore previous values
- [ ] Bumping `lounge_volume_v1` storage key (manual delete) → resets to defaults

### Audio framework (no files yet)
- [ ] With BGM/ambient files missing, page loads with no console errors related to audio
- [ ] `npm run lounge:validate` reports the missing audio as warnings (not errors), exit 0

### Library interactables
- [ ] Reading chair (left, facing up) → walks to it + sits
- [ ] Center chair pair (facing each other) → both work, sit toggle works

### Asset validator
- [ ] `npm run lounge:validate` exits 0 in clean state
- [ ] Renaming any required file (e.g. `library.tmj`) → validator exits 1 with clear message
- [ ] Restoring the file → exits 0 again
- [ ] Orphan `.tmj` (not in manifest) → flagged as error

## Lounge V3.0 (account + persistent character)

### First-time visitor flow
- [ ] Open `/lounge` fresh (clear localStorage) → name modal appears
- [ ] Modal has "How should we call you?", input (1-16 char), Skip button, Save button
- [ ] Skip → modal closes, bear label shows `Bear from {region}`, no DB row
- [ ] Save with empty input → error "Please enter a name"
- [ ] Save with 17+ chars → input maxlength caps; if bypassed, server rejects
- [ ] Save with blocked word (`<script`, `fuck`) → error "That name is not allowed"
- [ ] Save with valid name → modal closes, label shows name immediately

### Persistence
- [ ] Walk to a specific position → wait ~32s → close tab → reopen → spawn at last position
- [ ] Walk to DJ floor → close → reopen → spawn directly in DJ floor (not lobby)
- [ ] Name persists across reload — no modal shown on return
- [ ] localStorage keys present: `lounge_visitor_id`, `lounge_display_name`, `lounge_name_prompted`

### Info panel (ⓘ)
- [ ] Click ⓘ button → panel shows Name / Region / ID (last 8 chars)
- [ ] Click "Change name" → name modal appears pre-filled
- [ ] Submit new name → label updates immediately above bear
- [ ] Click outside panel or press Escape → panel closes

### Session replacement
- [ ] Tab A connected → open Tab B with same visitor_id → Tab A receives "replaced" overlay
- [ ] Tab A overlay says "This tab was replaced by a newer session"
- [ ] Tab A does NOT auto-reconnect
- [ ] Tab B works normally

### Multi-client
- [ ] Other peers' names visible above their bears
- [ ] If peer renames, label updates in real-time (via name_changed broadcast)
- [ ] Anonymous peers show `Bear from {region}` based on their CC

### Backwards compat
- [ ] v=2 client (older protocol) can still connect; receives no welcome, spawns at lobby default
- [ ] No DB row created for v=2 clients (no persistence)

### Server batching
- [ ] WS smoke: server flushes last_pos to DB within 30s OR on disconnect (whichever first)
- [ ] No DB hammering: pos updates at 10Hz don't write to DB every tick

### Validator
- [ ] `npm run lounge:validate` still exits 0 (V3.0 didn't add assets)

## Lounge V3.1 (NPC framework)

### NPCs present at correct times
- [ ] 06:00-12:00 local: Mio visible in Lobby with gold `✦ Mio` label
- [ ] 12:00-18:00 local: Mio absent from Lobby, present in Balcony
- [ ] 18:00-19:00 local: No NPCs anywhere (gap)
- [ ] 19:00-03:00 local: Kai visible in DJ Floor near booth, dancing
- [ ] 03:00-06:00 local: No NPCs anywhere

### NPC visuals
- [ ] Label is gold (#ffd166) with `✦ ` prefix
- [ ] Sprite is slightly translucent (alpha ~0.95)
- [ ] Sprite renders below player depth (player walks in front)
- [ ] Sit state: NPC stays in sit pose
- [ ] Dance state: NPC bounces (or static if reduced motion)

### NPC interaction
- [ ] Click Mio → dialog bubble appears with one of 5 lines
- [ ] Click again within 5s → different line (memory excludes last)
- [ ] After 3s, bubble fades
- [ ] Click Kai → similar behavior

### Player vs NPC click priority
- [ ] Click own bear → emote menu (not NPC behind)
- [ ] Click NPC → dialog (not floor click behind)
- [ ] Click empty floor near NPC → walk (not NPC interaction)
- [ ] Player walks THROUGH NPCs (no collision)

### Schedule refresh
- [ ] At a time boundary (e.g. 12:00), Mio teleports from Lobby to Balcony within 10s
- [ ] No console errors when NPC spawn/despawn happens

### Persistence on portal
- [ ] Walk through portal — NPCs from old room destroyed; NPCs of new room (if any) spawn

### Validator
- [ ] `npm run lounge:validate` shows "X NPCs" in summary, exit 0
- [ ] Inject overlap in npcs.json → exit 1 with clear message
- [ ] Inject bad room name → exit 1 with clear message

## /comics (四格)

- [ ] `/comics` 页面打开，masthead "四格" 高亮，hero block 渲染 4 张图
- [ ] hero 标题序号 `No. N` 与 Supabase 最新 approved 一致
- [ ] 至少 1 张图带 dialog bubble，位置 (tl/tr/bl/br) 正确
- [ ] 往期 archive 网格 desktop 3 列、mobile 2 列
- [ ] 点 archive card 跳 `/comics/<n>`，详情页 4 panel 大图 + 源文本 + 上下期导航
- [ ] `/en/comics` 显示英文标题、英文 dialog、英文按钮
- [ ] LangSwitch 在 /comics ↔ /en/comics 间正确切换
- [ ] dark mode 下 panel background `#1a1a1a` 与白图边缘对比清晰
- [ ] 移动端 (375px) 标题字号缩放、archive 2 列、详情页 panels 1 列

## Lounge V3.2 (Listening Booth)

### Booth in DJ Floor
- [ ] Walk into DJ Floor → near interactable at south of booth (240, 224) → "🎧 listen" prompt shows
- [ ] Press E or click booth rect → picker opens with 4 tracks
- [ ] Tracks listed: Dawn Drift, Midnight Drift, Static Haze, Warm Bath
- [ ] Click a track → audio plays (loops), pill shows "🎧 Now: <track>" at bottom-center
- [ ] Selected track button highlighted green
- [ ] Click different track → previous stops, new starts
- [ ] Stop button → audio stops + pill hides
- [ ] Close button → picker hides but audio continues
- [ ] Press Escape → picker hides

### Walk-away monitor
- [ ] While track plays, walk >80px from booth → audio fades/stops + pill hides
- [ ] Walking back doesn't auto-resume (must click again)

### Volume integration
- [ ] Track plays at ambient channel volume (master × ambient)
- [ ] Slide ambient slider → track volume changes immediately

### Validator
- [ ] `npm run lounge:validate` shows "4 booth tracks", exit 0
- [ ] Rename one track .ogg + .mp3 → validator exit 1

## Lounge V3.3 (Pebbles inventory)

### Pebbles in rooms
- [ ] Each room has 3-4 tiny golden pebbles at fixed positions
- [ ] Pebbles slow-bob (sine tween) and gently pulse alpha
- [ ] Under reduced-motion, no animation
- [ ] Click a pebble within 12px → fade-out + scale-up animation + bubble shows "✦ <name>"

### Inventory
- [ ] 📦 button (top-right cluster, 3rd from right) opens panel
- [ ] Panel shows "X / 13" count + grid of items
- [ ] Collected items show in gold with ✦ prefix
- [ ] Uncollected items show "???" in dim
- [ ] Close via Escape, outside click, or 📦 toggle
- [ ] Reload page → collected items persist (server-loaded inventory)

### Server
- [ ] WS `collect {item_id}` returns `collected {item_id, newly:true}` first time
- [ ] Same item again → `collected {newly:false}`
- [ ] Invalid item_id format → `error {reason:'invalid_item'}`

### Multi-room
- [ ] Walk to DJ Floor → see 3 different pebbles
- [ ] Collect one → not visible on return
- [ ] Each player has independent inventory

### Validator
- [ ] `npm run lounge:validate` shows "13 pebbles", exit 0
- [ ] Inject duplicate id → exit 1

## Lounge V3.4 (Seasonal content)

### Seasons (real local clock)
- [ ] Mar-May: spring tint (greenish) + pink petal particles drift down
- [ ] Jun-Aug: summer tint (warm gold) + soft yellow sunlight particles
- [ ] Sep-Nov: fall tint (orange) + brown leaf particles drift diagonally
- [ ] Dec-Feb: winter tint (cool blue) + white snowflakes drift down

### Holidays (override or stack on season)
- [ ] CN New Year (Feb 14-22 window 2026): red lantern particles rise from bottom
- [ ] Christmas (Dec 21-26 window each year): light-blue snowflake particles + cooler tint

### Stacking
- [ ] During Christmas (winter + holiday): see both winter snow + holiday snowflakes
- [ ] During CN NY (winter + holiday): see both snow + red lanterns

### Reduced motion
- [ ] `prefers-reduced-motion: reduce` → no seasonal tint, no seasonal particles

### Validator
- [ ] `npm run lounge:validate` shows "4 seasons, 2 holidays", exit 0
- [ ] Bad particle name in seasons.json → exit 1

## Lounge V4.0 (Friendship)

### Scoring
- [ ] Two greeted v=3 peers in same room → server +1/min per pair (cap 30/session per pair)
- [ ] Click on peer bear → bear walks toward them + waves; server scores +5 to that pair
- [ ] Pair where visitor_a === visitor_b: server ignores (self-double-tab not exploitable)
- [ ] Score persists in lounge_friendships (visitor_a < visitor_b canonical)

### Welcome.friendships
- [ ] Returning visitor with prior friendships → welcome includes top 10 (sorted by score desc)
- [ ] New visitor → welcome.friendships is []

### Real-time friend_update
- [ ] When score changes, BOTH peers in the pair receive `friend_update {friend_id, score, level}`
- [ ] Other peers do NOT receive it (private)

### Heart visualization
- [ ] Level 0 (0-10): no heart above peer
- [ ] Level 1 (11-50): ♡ pale pink
- [ ] Level 2 (51-200): ♥ red
- [ ] Level 3 (201+): ✦ gold

### Info panel Friends section
- [ ] Click ⓘ → panel shows "Friends" heading + top 10 list
- [ ] No friendships → "No friendships yet — spend time with peers."
- [ ] Each entry: heart glyph (colored by level), display name (or "(anonymous)"), score
- [ ] Sorted by score desc

### Privacy
- [ ] No public friendship leaderboard
- [ ] friend_update only sent to the two parties
- [ ] welcome.friendships only contains your own list (server scoped by visitor_id)

## Lounge V4.1 (Gifts + DMs)

### Gifts
- [ ] Click peer bear → peer menu shows: Wave / Gift pebble / Send DM
- [ ] Click "Gift pebble" — modal opens listing your collected pebbles
- [ ] Pick a pebble → toast "🎁 Sent ... to <name>"
- [ ] Recipient (if online) gets toast "🎁 <you> gifted you ..."
- [ ] Recipient's inventory shows item with "🎁 (sender)" annotation
- [ ] Already-gifted item shown greyed-out in modal
- [ ] Gift to non-friend → "🎁 You need to be friends first"

### DMs
- [ ] Click peer bear → "Send DM" opens messages panel + selects that friend's thread
- [ ] Type 140 chars max, send → message appears in thread (out class, green-tinted)
- [ ] Recipient (online) gets toast preview + badge increments
- [ ] Recipient (offline) sees badge "N" on next login
- [ ] Open thread → marks as read on server, badge decrements
- [ ] DM to non-friend → "✉ Friends only"
- [ ] DM with blocklist word → "✉ Message blocked"
- [ ] Empty/oversized DM → "✉ 1-140 chars"

### Welcome hydration
- [ ] `welcome.gifts_received: [{from, from_name, item_id, sent_at}]` populates correctly
- [ ] `welcome.unread_dm_count: N` populates badge

### Rate limiting
- [ ] >3 gifts/min → "🎁 Slow down"
- [ ] >5 DMs/min → "✉ Slow down"

### Server
- [ ] WS `gift {to, item_id}` → `gift_sent_ok` or `gift_failed {reason}`
- [ ] WS `dm {to, text}` → `dm_sent_ok` or `dm_failed {reason}`
- [ ] WS `dm_thread {other}` → `dm_thread {other, messages}`
- [ ] WS `dm_read {from}` → `dm_read_ack`

## Lounge V4.2 (Player Homes)

### Home access
- [ ] Lobby south wall has a new door at tile (14, 19)
- [ ] Walking through south door → travels to `room_home_<your_short_id>`
- [ ] Home room is 320×192 (smaller than other rooms) with wood floor + brick walls + 2 plants flanking north door
- [ ] North door in home → back to Lobby `from_home` spawn

### Decorations
- [ ] In own home, open inventory (📦) → each collected pebble shows a "Place" button
- [ ] Click "Place" → place mode activated, inventory closes, indicator shows "Click floor to place '<name>'"
- [ ] Click empty floor → server places, sprite renders as golden pebble, "📦 Placed." toast
- [ ] Click already-placed pebble in own home → "📦 Picked up." toast, decoration removed
- [ ] Already-placed pebble shows "✓" instead of "Place" in inventory
- [ ] Place mode cancellable with Escape

### Constraints
- [ ] Place an item you don't own → "📦 You don't own this pebble"
- [ ] Place same item twice in same home → second is a no-op (already placed via UNIQUE)
- [ ] After placing 30 items → cap reached error

### Visit friend's home
- [ ] (Not in V4.2 — defer to V4.2.1 Homes-directory panel)
- [ ] Server-side support is in place: hi with `room: room_home_<other_short>` works
- [ ] Read-only in others' homes — Place button hidden, click on decoration does nothing

### Welcome hydration
- [ ] `welcome.my_home_room: "room_home_<short>"` populates
- [ ] `welcome.my_home_decorations: [{item_id, x, y}]` populates
- [ ] Cross-room welcome (e.g. last_room = home) triggers scene.restart → decorations render correctly

### Server protocol
- [ ] `place {item_id, x, y}` → `place_ok {item_id, x, y}` or `place_failed {reason}`
- [ ] `pickup {item_id}` → `pickup_ok` or `pickup_failed`
- [ ] `home_decorations {owner_visitor_id}` → `home_decorations {owner_visitor_id, decorations}`
- [ ] `home_decoration {owner, action, item_id, x?, y?}` broadcast to same-room peers

## Lounge V4.3 (Jam Pads — Era 3 finale)

### Pad rendering
- [ ] In DJ Floor, 4 colored pads visible at center: red (C), yellow (E), green (G), blue (B) in a 2×2 grid
- [ ] Walking near a pad → "🎵 jam" interaction prompt above own bear
- [ ] Pads have subtle border + 35% fill alpha when idle

### Tap mechanics
- [ ] Click a pad → bear walks to it + pad flashes (scale-up + opacity surge) + plays note
- [ ] Press E near pad → same behavior
- [ ] Other peers see the same flash + hear the note when you tap

### Co-op detection
- [ ] 2 visitors tap any pads within 4s → "🎵 Jam!" toast + each pair +2 friendship (`friend_update` push)
- [ ] 3 visitors tap → "✨ Jam Circle!" toast + each pair +5 friendship
- [ ] 4 distinct pads tapped from 2+ visitors within 4s → "🎵 Full Jam!" toast + sparkle burst particle effect + each pair +10
- [ ] Same tier only awards once per sliding window (no spam)

### Constraints
- [ ] Solo tapping → no jam_burst, no score
- [ ] Per-pair daily cap: 30 jam points (after which extra jams don't add)
- [ ] Per-visitor rate limit: 6 taps/min (excess silently dropped)

### Server
- [ ] WS `jam_tap {pad_index}` → broadcast `jam_tap {id, visitor_id, pad_index, region}` to room
- [ ] Co-op transitions → broadcast `jam_burst {tier, distinct_visitors, distinct_pads, bonus_per_pair, awarded_pairs}` + per-pair friend_update pushes

### Reduced motion
- [ ] Pad flash still happens (it's an info signal) but Full Jam particle burst is suppressed

## Lounge V5.0 (Beach biome — Era 4 begins)

### Beach room
- [ ] Balcony south wall has a new driftwood-plank door at tile (12, 14)
- [ ] Walking through Balcony south door → travels to `room_beach`
- [ ] Beach room is 480×320 with sand floor, cliff borders, 4 palm trees
- [ ] 2 driftwood logs as sit interactables (one east, one west)
- [ ] 2 beach umbrellas (decorative)
- [ ] Beach north door → back to Balcony at `from_beach` spawn

### Tileset
- [ ] `outdoor_beach_v0` tileset loads (visible: sand floor, cliff walls, driftwood, umbrella, palm)
- [ ] Tiles look distinct from indoor_lobby_v0

### Ambient + particles
- [ ] Waves ambient loop plays (filtered pink noise via tremolo)
- [ ] Seagulls (white particles) drift east across the sky every ~3.5s

### Pebbles
- [ ] 3 new pebbles: Coral / Driftwood / Tide at fixed spots
- [ ] Inventory total now 16

### Server
- [ ] `room_beach` in VALID_ROOMS + ROOM_FLOORS
- [ ] Welcome.last_room = 'room_beach' triggers client scene.restart

### Validator
- [ ] `npm run lounge:validate` reports "6 rooms, 2 tilesets, 16 pebbles"

## Lounge V5.1 (Letters / Notes)

### Drop a note
- [ ] Click own bear → emote menu shows new 📜 button
- [ ] Click 📜 → modal opens with textarea (1-80 char limit, live counter)
- [ ] Type + click Drop → server roundtrip → "📜 Note dropped" toast
- [ ] A 📜 icon appears at your bear's position with gentle bob animation
- [ ] One letter per room per author — dropping again overwrites + repositions

### Read notes
- [ ] Click any 📜 in the room → parchment-styled read card shows author / time-ago / content
- [ ] Close via Close button or Escape
- [ ] Letters from other peers appear via `letter_appeared` broadcast (real-time)

### Cross-room
- [ ] Walk to another room → new room's letters loaded via `letters {room}` request
- [ ] Previous room's letter sprites cleaned up

### Constraints
- [ ] >3 drops/hour → "📜 Slow down — too many notes"
- [ ] Empty content → modal error "Please write something"
- [ ] Content with blocklist word (script/fuck/shit) → "📜 Note blocked"
- [ ] Content >80 chars → maxlength caps; server rejects anyway with "1-80 chars"

### Server protocol
- [ ] `letter_drop {content, x, y}` → `letter_drop_ok` or `letter_drop_failed`
- [ ] `letters {room}` → `letters_in_room {room, letters: [...]}`
- [ ] `letter_appeared` broadcast on drop (visible to peers in same room)

## Lounge V5.2 (Wishboard)

### Submit
- [ ] 🌟 button (top-right cluster, leftmost) opens Wishboard panel
- [ ] Form has category select + textarea (1-140 char counter)
- [ ] Submit → toast "🌟 Wish submitted" → list refreshes with new wish on top (own wish highlighted)
- [ ] Resubmit by same author → upserts (overwrites prior wish)

### Vote
- [ ] Click ☆ button → toggles vote (★ filled green when voted)
- [ ] Vote count updates immediately
- [ ] Can un-vote by clicking again

### Server
- [ ] `wish_submit {category, content}` → `wish_submit_ok` + refreshed `wishes_list`
- [ ] `wish_vote {wish_id}` → `wish_vote_ok {voted}` + refreshed list
- [ ] Blocklist words rejected; >140 chars rejected; invalid category rejected

## Lounge V5.3 (Modding hooks — public API)

### Endpoints
- [ ] GET `/api/lounge/stats` → runtime room counts + DB row totals + generated_at
- [ ] GET `/api/lounge/manifest` → public asset manifests (rooms, sprites, NPCs, seasons, pebbles)
- [ ] GET `/api/lounge/wishes` → anonymized top wishes (no visitor_ids)

### CORS
- [ ] All public lounge endpoints return `Access-Control-Allow-Origin: *`
- [ ] OPTIONS preflight returns 204 for any Origin
- [ ] Cache-Control: public, max-age=30

## Lounge V6.0 (Navigation + visibility patch — Era 5 begins)

### Country flag
- [ ] Own bear label shows `🇨🇳 Name` instead of `Bear from asia`
- [ ] Peer bear with CC shows their flag
- [ ] Anonymous + no CC → `🌍 Bear`

### Minimap (bottom-left)
- [ ] Shows 6 rooms with connections (Library / Balcony / Lobby / DJ Floor / Beach / Home)
- [ ] Current room highlighted green
- [ ] Rooms with NPCs marked with gold border + small dot
- [ ] Refreshes every 30s for schedule drift

### Door labels
- [ ] Walking within 48px of a portal → `→ <Room Name>` floats above own bear
- [ ] Disappears when walking away
- [ ] Home portal shows "Home" not the dynamic room_home_<hash>

### NPC schedule widening
- [ ] Mio: 06-12 Lobby / 12-18 Balcony / 18-22 Library — covers 16h/day
- [ ] Kai: 14-04 DJ Floor — covers 14h
- [ ] Pip (new): 24/7 in Lobby — every visitor sees at least one NPC immediately
- [ ] Pip's dialog tells visitor about doors and basic mechanics

## Lounge V6.1 (Indoor tileset v1 — Lobby refactor)

### Tileset bake
- [ ] `node scripts/lounge/bake-tileset-v1.mjs` → emits `public/lounge/assets/tilesets/indoor_lobby_v1/{tiles.png,tiles.json}`
- [ ] Tileset is 8×4 grid = 32 tiles, 128×64 px total
- [ ] tiles.json declares `name: "indoor_lobby_v1"`, `columns: 8`, `tilecount: 32`
- [ ] Legacy IDs 1-6 (floor/wall/door/table/chair/plant) preserved with upgraded art

### Lobby refactor
- [ ] `node scripts/lounge/patch-lobby-v1.mjs` re-points `lobby.tmj` tileset to v1
- [ ] Floor variants (tiles 7/8/9) sprinkled across interior wood — visible color/grain variation
- [ ] Top wall has windows (light blue panes) and 2 sconces; library door tile preserved
- [ ] Left/right walls show painting + clock on top of brick
- [ ] Fireplace (top-left) renders: stone mantle + glowing logs (red/orange/yellow flame pixels)
- [ ] 2 bookshelves on right wall: top tile shows colored book spines, bottom tile shows cabinet doors with brass handles
- [ ] Floor lamp standing (cream shade + wood pole + dark base)
- [ ] Vase with flowers near top-right
- [ ] New 3-tile purple sofa (left/center/right) at bottom-left interior — sit interactable
- [ ] Existing centered table now has side-view chairs (tiles 28/29) flanking it
- [ ] 3 hanging lanterns visible at top of room (above-layer, brass + warm glow)
- [ ] Accent rug (tile 30) on floor near left

### Backward compat
- [ ] Existing collision/spawn/portal objects untouched (DJ Floor portal still works, balcony portal still works, etc)
- [ ] DJ Floor + Library + Balcony rooms still render correctly (still use `indoor_lobby_v0`)
- [ ] Bears still walk on floor without z-fighting against fireplace/bookshelves/lamp/vase/sofa (new collision rects added)
- [ ] Clicking new sofa triggers sit animation with bear at anchor 120,264 facing down

### Client loader
- [ ] `RoomScene.ts` preloads both `indoor_lobby_v0` AND `indoor_lobby_v1` images
- [ ] Tileset chosen by name from TMJ — no warnings in console about missing tilesets
- [ ] Build clean (`npm run build` passes); validate clean (`npm run lounge:validate` no new errors)

## Lounge V6.1.1 (DJ Floor + Library refactored to v1)

### Tileset extension
- [ ] `indoor_lobby_v1` now 40 tiles (8×5 grid, 128×80 px)
- [ ] New IDs 33-40 = speaker stack / turntable / dance-floor neon A (cyan) / dance-floor neon B (magenta) / disco ball / strobe panel / neon DJ sign / subwoofer
- [ ] All 32 V6.1 tiles still render correctly (no shift in tile IDs)

### DJ Floor refactor
- [ ] `node scripts/lounge/patch-dj-floor-v1.mjs` re-points `dj_floor.tmj` tileset to v1
- [ ] Dance floor at center: 10×3 checkered cyan/magenta neon squares
- [ ] 4 speaker stacks in 4 corners (black cabinets, green LED, woofer + tweeter cones)
- [ ] 2 subwoofers flanking the bottom couches
- [ ] 2 turntables on the booth (circular platters with magenta center label + tone arm)
- [ ] Top wall: 4 strobe panels (RGB light bars) + 1 neon "DJ" sign at center + 2 sconces
- [ ] Disco ball hangs in center of dance floor (above-layer, faceted sphere)
- [ ] Existing jam pads + couches + DJ booth interactables unaffected

### Library refactor
- [ ] `node scripts/lounge/patch-library-v1.mjs` re-points `library.tmj` tileset to v1
- [ ] Bookshelves drawn at all 16 north-wall + 8 side-wall positions (visible book spines)
- [ ] Top wall: 4 windows + 1 clock
- [ ] Side walls: 2 paintings + 2 sconces
- [ ] 2 reading nooks (bottom-left + bottom-right): 3-tile sofa + floor lamp + accent rug each
- [ ] 3 hanging lanterns in center
- [ ] 2 new sit interactables (`sofa_l_sit`, `sofa_r_sit`) functional
- [ ] Existing table + chairs + portal to lobby unaffected

---

## Lounge V10 (Era 9 — Living World)

> Spec: see V10.0–V10.8 commit messages on master.
> Smoke-test runner: `node scripts/lounge/_dev-shot-v10-smoke.mjs`

### V10.0 — 4 new NPC bedrooms (Marin/Cole/Wren/Dane)
- [ ] Walking into Lobby portal at (32, 16) loads `room_bedroom_marin`
- [ ] Library top-left + middle portals load `room_bedroom_cole` and `room_bedroom_wren`
- [ ] DJ Floor top-left portal loads `room_bedroom_dane`
- [ ] Minimap title shows "Marin's room" (not raw id) inside each new bedroom
- [ ] Each NPC's sleep bracket in `npcs.json` points at their own bedroom

### V10.1 — NPC heart system + 44 deep cutscenes
- [ ] Talking to an NPC awards +1 heart point (cap 5/day per NPC)
- [ ] Giving an item to an NPC awards +5 points (cap 1 gift/day per NPC)
- [ ] Completing an NPC's quest awards +15 points (once per quest id)
- [ ] At 30 points (heart 4), Mio's `mio_h4` cutscene fires on next Lobby entry
- [ ] At 200 points (heart 10), `*_h10` cutscene is reachable
- [ ] `findCutsceneForRoom` reads `getNpcHeartLevel`, not the player friendships map

### V10.2 / V10.8b — Pet system
- [ ] 🐾 top-bar button opens the adoption panel
- [ ] Picking kitten/puppy/bunny saves to `lounge_pet_v1`
- [ ] On next scene boot, the chosen pet sprite renders behind the player
- [ ] Each species uses its own atlas (kitten=cat, puppy=puppy, bunny=bunny) — NOT just a tint
- [ ] "Feed today" disables until next UTC day; +1 affection per feed
- [ ] At affection 10: kitten gives +10% gift shells, puppy +5 max energy, bunny +5% walk speed (cache invalidated immediately)

### V10.3 — Marriage
- [ ] Marriage Pebble 💍 buyable in Mio's shop for 100 shells; stack count shown in panel
- [ ] Clicking NPC at heart 10 holding a pebble shows propose confirm
- [ ] Accepting consumes pebble + sets `lounge_marriage_v1` + fires hearts cutscene
- [ ] Spouse renders in Home room during 07:00–10:00 and 18:00–22:00 game time
- [ ] First Home visit per UTC day shows a greeting bubble

### V10.4 + V10.7 — Achievement album (51 unlocks)
- [ ] 🏆 button opens album grouped by 7 categories
- [ ] Unlock fires a golden top-center toast + +5/15/30/50 shells by tier
- [ ] All 51 achievements have a recordEvent emit site (verified via smoke test)

### V10.5 — Photo mode
- [ ] Equip 📷, click in canvas → saves a 240×160 PNG to `lounge_photos_v1`
- [ ] White flash overlay appears AFTER the snapshot (so captured frame is clean)
- [ ] 🖼️ button opens album; click thumbnail opens lightbox; ✕ deletes
- [ ] Cap is 25 photos; oldest evicted on overflow

### V10.6 — Friend activity notifications
- [ ] Friend onJoin → 'online' mail (24h throttle per friend)
- [ ] Friend in your Home → 'home_visit' mail (30min throttle)
- [ ] Friend drops letter → 'sent_letter' mail (30min throttle)
- [ ] Info panel toggle 🔔/🔕 suppresses new mail when off
- [ ] Throttle map prunes entries older than 48h

### V10.8c — Pet multiplayer broadcast
- [ ] WS `hi` includes `pet_species` + `pet_name`
- [ ] Server relays `pet_species`/`pet_name` in `join` + `snap`
- [ ] Peer with adopted pet renders the pet sprite behind their bear
- [ ] Peer pet destroyed on `leave` + on scene shutdown (no leaks)
- [ ] Requires `./scripts/deploy-blog-api.sh` to ship the server side

### V10.8d — Smoke test runner
- [ ] `node scripts/lounge/_dev-shot-v10-smoke.mjs` exits 0 with all 4 cases ✅
- [ ] Tests cover: heart-4 gate, marriage flow, V10.7 new achievements, friend-notif toggle

## Nook Living World — briefing card

- [ ] nook briefing card — shows latest world briefing once/day, × dismisses, reappears next day
- [ ] GET briefing/latest returns `{body:null}` → card stays hidden (no console errors)
- [ ] GET briefing/latest returns valid body → card appears at bottom-right with ☀️ title + body text
- [ ] Clicking × hides card and sets `localStorage['nook-briefing-seen']` to `data.day`
- [ ] Refreshing same day → card does not reappear (localStorage gate)
- [ ] On mobile (≤600px): card sits above 70px (clear touch strip)

## Nook Living World — lobby ambient ghosts

- [ ] Lobby shows faint translucent silhouettes ≈ online count (`/api/online/count` site), capped at 8
- [ ] Ghosts are clearly fainter than real NPC/Bear sprites (alpha ~0.3), read as "presence not players"
- [ ] Ghosts wander the floor region only (not on walls/furniture/NPCs), non-interactive (no click/hover)
- [ ] Count reconciles on ~45s poll — ghosts fade in/out as online count changes
- [ ] Only in `room_lobby`; other rooms unaffected; no console errors from the fetch
