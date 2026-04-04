# Notes Tab 设计文档

## 目标

在 blog 导航栏新增 Notes tab，将 `../notebook` 项目的笔记内容迁移到 blog 项目中，提供列表浏览、搜索筛选、详情阅读的完整体验。支持 MDX 渲染、交互式 React 组件、双向链接（wikilinks）。

## 架构

Notes 作为 blog 站点的一个子模块，使用 Astro Content Collections 管理 MDX 文件。列表页 `/notes` 和详情页 `/notes/[slug]` 均为独立页面。交互式组件通过 `@astrojs/react` 集成渲染。

## 导航

在 masthead 导航栏现有 tabs（Blog、Archive、Moments、Friends）中新增 **Notes** 入口，放在 Moments 和 Friends 之间。移动端同样展示。

## 数据

### 来源

从 `../notebook/src/content/notes/` 迁移 MDX 文件到 `src/content/notes/`。同时迁移交互式 React 组件到 `src/components/notes/`。

### Content Collection Schema

```typescript
const notes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),           // ISO 格式 "YYYY-MM-DD"
    tags: z.array(z.string()),
    public: z.boolean().default(true),
    draft: z.boolean().default(false),
    interactive: z.boolean().default(false),
    summary: z.string(),
  }),
});
```

只有 `public: true` 且 `draft: false` 的笔记会展示在列表和详情页。

### 需要迁移的依赖

Blog 项目需新增以下依赖（notebook 项目已使用）：

- `@astrojs/react` + `react` + `react-dom` — 交互式组件渲染
- `@astrojs/mdx` — MDX 支持
- `d3` — ForceGraph 知识图谱可视化
- `@codesandbox/sandpack-react` — Code Playground 组件
- `unist-util-visit` — remark wikilinks 插件的 AST 遍历
- `pagefind` — 全文搜索索引

### Remark Wikilinks 插件

迁移 `../notebook/src/lib/remark-wikilinks.ts`，将 `[[title]]` 和 `[[title|displayText]]` 语法转换为 `<a href="/notes/{slug}" class="wikilink">` 链接。在 `astro.config.mjs` 的 `markdown.remarkPlugins` 中注册。

### Backlinks

迁移 `../notebook/src/lib/backlinks.ts`，在构建时扫描所有笔记的正文，生成反向链接映射（哪些笔记引用了当前笔记）。在详情页右栏的"相关笔记"区域展示。

## 页面设计

### 列表页 `/notes`

#### 布局：Tag 侧边栏 + 笔记列表

```
┌─────────────────────────────────────────────────┐
│  Masthead (Blog / Archive / Notes / ...)        │
├────────────┬────────────────────────────────────┤
│            │  🔍 搜索笔记...                     │
│  Tags      ├────────────────────────────────────┤
│            │                                    │
│  全部  16  │  ┌──────────────────────────────┐  │
│  控制论  3 │  │ 控制论与 AI Coding            │  │
│  Math    4 │  │ 2026-03-29 · 控制论 · 系统思维 │  │
│  AI      2 │  │ 探索控制论思想如何影响...       │  │
│  Frontend 5│  └──────────────────────────────┘  │
│  Canvas  2 │  ┌──────────────────────────────┐  │
│  Meta    2 │  │ 贝塞尔曲线的数学原理          │  │
│            │  │ 2026-03-28 · Math · Canvas    │  │
│  (sticky)  │  │ 从线性插值到三次贝塞尔曲线... │  │
│            │  └──────────────────────────────┘  │
│            │  ┌──────────────────────────────┐  │
│            │  │ ...                           │  │
│            │  └──────────────────────────────┘  │
│            │                                    │
│            │  ← 1 2 3 ... →  (分页)             │
└────────────┴────────────────────────────────────┘
```

#### Tag 侧边栏

- 宽度约 160px，sticky 定位
- 显示所有标签及对应笔记数量
- 点击标签筛选列表，支持单选切换
- "全部" 选项始终在最上方
- 当前选中的标签使用 accent 色高亮

#### 笔记列表

- 顶部搜索框：基于 Pagefind 的全文搜索，输入即筛选
- 每条笔记卡片显示：标题、摘要（summary）、日期、tags
- 按日期倒序排列
- 分页：每页 20 条，底部分页导航
- hover 效果：标题变为 accent 色

#### 移动端适配

- Tag 侧边栏变为水平滚动的 tag 条（在搜索框下方）
- 笔记卡片单列全宽

### 详情页 `/notes/[slug]`

#### 布局：三栏

```
┌─────────────────────────────────────────────────────────┐
│  Masthead                                               │
├───────────┬──────────────────────────────┬──────────────┤
│           │                              │              │
│  笔记列表  │  标题                        │  目录        │
│           │  2026-03-29 · 12 min read    │  · 概述      │
│  🔍 搜索   │                              │    · 核心概念│
│           │  正文内容...                  │    · 反馈回路 │
│ ▌控制论    │                              │  · AI Coding │
│  贝塞尔    │  代码块、交互组件、           │    · 人机协作 │
│  反馈控制  │  引用、图片等...              │  · 结语      │
│  Hello    │                              │              │
│  OpenH... │                              │  ──────────  │
│  Code...  │                              │  标签        │
│           │                              │  控制论      │
│  (sticky) │                              │  系统思维    │
│           │                              │              │
│           │                              │  ──────────  │
│           │                              │  相关笔记    │
│           │                              │  → 反馈控制环│
│           │                              │  → Hello     │
└───────────┴──────────────────────────────┴──────────────┘
```

#### 左栏：笔记列表（~200px）

- 顶部搜索框
- 笔记列表只显示标题和日期，紧凑排列
- 当前笔记用 accent 色左边框 + 背景高亮
- 点击直接跳转到对应笔记详情页
- sticky 定位，随页面滚动保持可见

#### 中栏：笔记正文（自适应宽度）

- 顶部：标题（serif 字体）、日期、阅读时间
- 正文：MDX 渲染，支持标准 Markdown 元素
- 交互式组件：React 组件通过 `client:load` 或 `client:visible` 渲染
- 代码块：语法高亮，深色背景
- Wikilinks：`[[title]]` 渲染为可点击链接，使用 `.wikilink` 样式

#### 右栏：元信息（~180px）

- **TOC（目录）**：从正文标题自动生成，sticky 跟随滚动高亮当前章节
- **Tags**：显示当前笔记的所有标签，点击跳转到列表页对应 tag 筛选
- **相关笔记**：基于 backlinks 和共享 tags 生成，显示标题，点击跳转

#### 移动端适配

- 仅显示中栏正文
- 左栏和右栏隐藏
- TOC 可通过顶部按钮展开为浮层
- Tags 显示在文章标题下方

## 样式

### 与 blog 统一

- 使用 blog 现有的 CSS 变量体系（`--color-accent`、`--bg-*`、`--text-*`）
- 跟随 blog 的暗色/亮色主题切换
- 字体体系：标题用 Noto Serif SC，正文用系统字体
- accent 色跟随 blog 的 6 色主题切换

### Tag 颜色

使用 blog 现有的 tag 颜色映射模式。所有 tags 使用 accent 色的半透明变体（`accent/20%` 背景 + accent 文字色），保持视觉统一。

### 正文排版

- 最大宽度：无固定限制（由三栏布局的中栏自适应）
- 行高：1.8
- 段落间距：1em
- 代码块：深色背景 `#1e1e2e`，圆角，语法高亮
- 引用块：accent 色左边框

## 交互式组件

### 迁移清单

从 `../notebook/src/components/` 迁移到 `src/components/notes/`：

**interactive/ 目录（10 个组件）：**

| 组件 | 功能 | 使用页面 |
|------|------|---------|
| FeedbackLoop | 动画 SVG 反馈回路图 | cybernetics-and-ai-coding |
| ThermostatSimulator | 恒温器交互模拟（3 个滑块） | feedback-control-loop |
| PlantComplexity | 复杂系统模拟器（4 个参数） | feedback-control-loop |
| ControlStrategyLevels | 5 级控制策略浏览器 | cybernetics-and-ai-coding |
| SecondOrderCybernetics | 一阶/二阶控制论对比 | cybernetics-and-ai-coding |
| CoEvolutionLoop | 人机共演化时间线 | cybernetics-and-ai-coding |
| CodePlayground | Sandpack 代码编辑器 | code-playground-test |
| CodeComparison | 动画柱状图对比 | openharness-visual-guide |
| HarnessArchitecture | 架构层次图 | openharness-visual-guide |
| SubsystemExplorer | 子系统手风琴展开 | openharness-visual-guide |

**graph/ 目录（1 个组件）：**

| 组件 | 功能 |
|------|------|
| ForceGraph | D3 力导向知识图谱 |

### 渲染方式

交互式组件在 MDX 中通过 `client:visible` 指令延迟加载，避免影响首屏性能：

```mdx
import ThermostatSimulator from '../../components/notes/interactive/ThermostatSimulator';

<ThermostatSimulator client:visible />
```

## 搜索

使用 Pagefind 实现全文搜索（blog 项目已有 Pagefind 集成）。构建时自动索引笔记内容。搜索框在列表页顶部和详情页左栏顶部均可使用。

## 路由

| 路径 | 页面 | 说明 |
|------|------|------|
| `/notes` | 列表页 | Tag 侧边栏 + 笔记列表 |
| `/notes/[slug]` | 详情页 | 三栏：列表 + 正文 + 元信息 |
| `/notes?tag=控制论` | 列表页（筛选） | Query param 控制 tag 筛选 |
| `/notes?page=2` | 列表页（分页） | Query param 控制分页 |

## 文件结构

```
src/
├── content/
│   └── notes/                    # MDX 笔记文件
│       ├── hello-world.mdx
│       ├── bezier-curves.mdx
│       ├── cybernetics-and-ai-coding.mdx
│       ├── feedback-control-loop.mdx
│       ├── code-playground-test.mdx
│       └── openharness-visual-guide.mdx
├── components/
│   └── notes/
│       ├── interactive/          # 交互式 React 组件
│       │   ├── FeedbackLoop.tsx
│       │   ├── ThermostatSimulator.tsx
│       │   ├── PlantComplexity.tsx
│       │   ├── ControlStrategyLevels.tsx
│       │   ├── SecondOrderCybernetics.tsx
│       │   ├── CoEvolutionLoop.tsx
│       │   ├── CodePlayground.tsx
│       │   ├── CodeComparison.tsx
│       │   ├── HarnessArchitecture.tsx
│       │   └── SubsystemExplorer.tsx
│       └── graph/
│           └── ForceGraph.tsx
├── lib/
│   ├── remark-wikilinks.ts       # Remark 插件：[[wikilink]] 语法
│   ├── backlinks.ts              # 反向链接生成
│   └── graph-data.ts             # 知识图谱数据生成
├── pages/
│   └── notes/
│       ├── index.astro           # 列表页
│       └── [...slug].astro       # 详情页
└── content.config.ts             # 追加 notes collection
```

## 不做的事情

- 不做笔记的在线编辑功能
- 不做评论/点赞功能（笔记不同于 blog 和 moments）
- 不做独立的知识图谱页面（如有需要后续再加）
- 不做 RSS feed（笔记面向自己而非读者）
