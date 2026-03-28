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

## SEO (全站)

- [ ] GET `/robots.txt` 返回内容包含 `Sitemap:`
- [ ] GET `/sitemap-index.xml` 返回 XML
- [ ] GET `/feed.xml` 返回 XML，包含 `<rss` 或 `<feed`

## Theme Switcher (任意页面)

- [ ] DOM: `#modeToggle` 存在（明暗切换）
- [ ] DOM: `#themeToggle` 存在（主题色切换）
- [ ] 点击 `#modeToggle`，`<html>` 的 `data-mode` 属性变化
