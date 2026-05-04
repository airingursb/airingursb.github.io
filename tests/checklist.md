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
