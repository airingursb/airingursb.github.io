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
