# Moment 功能设计文档

## 概述

在博客导航栏新增 MOMENT 入口（`BLOG | ARCHIVE | MOMENT | FRIENDS`），独立页面 `/moment`，展示从 Telegram 频道同步的碎碎念内容，支持点赞、评论和 Emoji 反应。

## 数据源

Telegram 频道 `@airingchannel` → 离线脚本（定时抓取）→ Supabase（Homepage DB）→ blog-api 代理 → 前端页面。

离线脚本需从 Telegram 公开页面 `https://t.me/s/airingchannel` 解析：
- 完整文本内容（不截断）
- 图片 URL（从 `tgme_widget_message_photo_wrap` 的 `background-image` 中提取）
- 发布时间
- Telegram post ID（用于去重）

脚本以 cron 方式运行，可集成到现有 CI daily workflow 或本地 cron。

## 页面设计

### 入口

导航栏顺序：`BLOG | ARCHIVE | MOMENT | FRIENDS`

### 布局

独立页面 `/moment`，复用 `BaseLayout`：
- 桌面端：左侧 Timeline 列表（max-width ~640px）+ 右侧 Author Sidebar（复用 blog 侧边栏）
- 移动端：Sidebar 隐藏，Timeline 全宽

### UI 风格：Timeline 时间线

- 左侧绿色时间轴线（2px，`#21262d`）+ 节点圆点（accent 色）
- 每条 Moment 为一张卡片（`#161b22` 背景，`#21262d` 边框，12px 圆角）

### Moment 卡片 - 收起态（默认）

- 头像（32px 圆形）+ 昵称 "Airing" + 相对时间
- 完整文本内容
- 图片展示：单图全宽圆角，多图 2×2 网格
- 底部操作栏：❤️ 点赞数 | 💬 评论数 | Emoji 反应气泡

### Moment 卡片 - 展开态（点击后）

- 卡片边框高亮为 accent 色
- Emoji 反应选择器（点击 + 按钮弹出 emoji picker）
- 评论列表：嵌套回复，Gravatar 头像，回复按钮
- 评论输入框：昵称 + 邮箱 + 内容 + 发送按钮

### 加载方式

无限滚动，每次加载 20 条。

## 数据架构

### Supabase 表设计（Homepage DB: pcoyocvqfipuydhvdsle）

```sql
-- Moment 内容
CREATE TABLE moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_post_id TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 点赞
CREATE TABLE moment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES moments(id),
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(moment_id, visitor_id)
);

-- Emoji 反应
CREATE TABLE moment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES moments(id),
  emoji TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(moment_id, emoji, visitor_id)
);

-- 评论
CREATE TABLE moment_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES moments(id),
  parent_id UUID REFERENCES moment_comments(id),
  nickname TEXT NOT NULL,
  email TEXT NOT NULL,
  content TEXT NOT NULL,
  notify BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### blog-api 代理接口

```
GET  /api/moments?page=1&limit=20       — 分页列表（含聚合的点赞数、评论数、反应统计）
GET  /api/moments/:id/comments           — 评论列表（含嵌套回复）
POST /api/moments/:id/like               — 点赞/取消点赞
POST /api/moments/:id/react              — 添加/移除 Emoji 反应
POST /api/moments/:id/comments           — 发表评论
```

Rate limit 复用现有策略：10/hour, 30/day。

### 前端数据流

- 页面加载时请求 `GET /api/moments?page=1&limit=20`
- 滚动触底时加载下一页
- 点赞/反应状态存 `localStorage`（key: `moment_likes`, `moment_reactions`）
- 展开卡片时按需加载评论 `GET /api/moments/:id/comments`

## 离线同步脚本

新建 `scripts/sync_moments.py`：
1. 请求 `https://t.me/s/airingchannel` HTML
2. 解析所有消息：文本、图片 URL、时间、post ID
3. 对比 Supabase 已有数据，upsert 新消息
4. 图片保持 Telegram CDN 原始 URL（不下载到本地）

集成到 `.github/workflows/deploy.yml` 的 daily cron 中。

## 技术要点

- 前端为纯 HTML/CSS/JS，不引入框架，与现有 blog 风格一致
- CSS 使用 scoped style + CSS variables，支持 6 种主题色 + 明暗模式
- Emoji picker 可用轻量库或自建简单面板（6-8 个常用 emoji）
- 评论邮件通知复用现有 blog-api 的通知机制
