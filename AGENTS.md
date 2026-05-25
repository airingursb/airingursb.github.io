# Blog Homepage - AGENTS.md

> This file is gitignored. Do NOT commit it.

## Project Overview

Astro 静态站点，个人主页 https://ursb.me，聚合博客、音乐、阅读、聊天等模块。

- Repo: `airingursb/airingursb.github.io`
- Primary branch: `master`
- Framework: Astro
- Node version: 22

## Deployment

### GitHub Pages
- `peaceiris/actions-gh-pages` 推送构建产物到 `gh-pages` 分支
- Pages Source: `gh-pages` / `/ (root)`
- URL: https://airingursb.github.io/

### Aliyun Server
- IP: `39.105.102.252`
- User: `root`
- Password: see `.env` → `ALIYUN_PASSWORD`
- SSH 连接: `sshpass -p $ALIYUN_PASSWORD ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@39.105.102.252`
- Deploy path (静态站): `/var/www/ursb.me/`
- Deploy path (blog-api): `/opt/blog-api/` (Docker 容器 `blog-api`, node:20-alpine, port 8904→3000)
- **Blog API 部署**: 用 `./scripts/deploy-blog-api.sh`（封装 rsync → docker rebuild → /health 校验 → 失败提示回滚）
  - 仅同步 SQL/system-prompt 不重建：`./scripts/deploy-blog-api.sh --config`
  - 部署后查看日志：`./scripts/deploy-blog-api.sh --logs`
  - 回滚到上次镜像：`./scripts/deploy-blog-api.sh --rollback`
  - 不要在服务器上手动改 `/opt/blog-api/`，会被下次 deploy 覆盖
  - 容器通过 `COPY` 构建（代码不是 volume 挂载），仅 `docker restart` 不会更新代码——所以一定走脚本
- CI 方式: rsync over SSH (key stored in GitHub Secret `ALIYUN_SSH_KEY`)

### CI/CD
- **Deploy workflow** (`.github/workflows/deploy.yml`): push to master / daily 00:00 UTC / manual
- **Daily Report workflow** (`.github/workflows/daily-report.yml`): daily 01:03 UTC (09:03 北京时间), 发送 Telegram 统计报告

## Supabase Database

**Single project for all ursb.me data:** `pcoyocvqfipuydhvdsle`

- URL: `https://pcoyocvqfipuydhvdsle.supabase.co`
- Service key: `.env` → `BLOG_SUPABASE_SERVICE_KEY` (also in `services/blog-api/.env`)
- Publishable key: `.env` → `BLOG_SUPABASE_PUBLISHABLE_KEY`

### Tables (current)

| Group | Tables |
|---|---|
| Visitors / subs | `visitors`, `subscribers`, `rss_subscribers`, `rss_reads` |
| Blog posts | `post_views`, `post_likes`, `post_comments`, `comment_likes`, `inline_comments`, `post_view_baselines`, `post_like_baselines` |
| Moments | `moments`, `moment_likes`, `moment_reactions`, `moment_comments`, `moment_views` |
| Newsletter | `newsletter_sends`, `email_logs`, `notification_queue`, `daily_metrics` |
| Guestbook | `guestbook` |
| Comics | `comics` |
| Chat (AI) | `chat_visitors`, `chat_messages` — merged from old `hsogymavkezhyesbkvnf` project on 2026-05-17 |
| Lounge V2.x+ | `lounge_visitors`, `lounge_inventory`, `lounge_friendships`, `lounge_gifts`, `lounge_dms`, `lounge_home_decorations` |

历史上 chat 曾住在另一个 project (`hsogymavkezhyesbkvnf` = MoneyWalk 财务 app)，2026-05-17 迁回主库统一。
旧表已迁完，等观察期结束（48h）后 drop。

## External API Integrations

| Service | Purpose | Key Location |
|---------|---------|-------------|
| Kimi (Moonshot) | AI 聊天 (kimi-k2.5) | `services/blog-api/.env` → `KIMI_API_KEY` |
| Last.fm | 音乐收听统计 | `.env` → `LASTFM_API_KEY` |
| Readwise | 阅读高亮 | `.env` → `READWISE_TOKEN` |
| Raindrop | 书签收藏 (collection: 38311816) | `.env` → `RAINDROP_TOKEN` |
| GitHub API | 用户信息 (airingursb) | Public API, no key needed |
| Telegram Bot | 每日报告 & 频道抓取 | GitHub Secret `TELEGRAM_BOT_TOKEN` |
| Douban | 读书/电影 (user: 82387673) | Scraping, no key |
| IP-API | 访客地理位置 | Public API |
| Umami | 网站分析 | Hardcoded in HTML |

## Microservices (Docker Compose)

### OpenClaw Gateway
- Image: `ghcr.io/openclaw/openclaw:latest`
- Port: `18790 → 18789`
- Config: `services/openclaw/config/`

### Blog API
- Build: `services/blog-api/Dockerfile` (node:20-alpine)
- Port: `8904 → 3000`
- Features: AI chat, comments, subscriptions, RSS tracking, post likes, **Comics bot**
- Rate limit: 10/hour, 30/day, ban after 5 violations (24h)

### Comics (四格)
- Page: `/comics` (zh) + `/en/comics`
- Source: Supabase table `comics` (Blog DB)
- Storage: COS `strip/{N}/v{a}/panel-{1..4}.png`
- Creation: Telegram bot DM → blog-api `/api/webhook/telegram` → Codex script → Gemini 2.5 Flash Image (nano-banana) → COS → bot reply → ✅ → `repository_dispatch` → deploy
- Refs (immutable after Phase 0): `services/blog-api/refs/{panda,moflow-ink}.png` + `services/blog-api/refs/style-prompt.md`
- See `docs/superpowers/specs/2026-05-16-comics-design.md` for the full design

## CORS Allowed Origins
```
https://ursb.me
https://www.ursb.me
https://airingursb.github.io
http://localhost:8111
http://localhost:4321-4323
```

## Data Pipeline

### CI 自动更新 (每日)
`scripts/update_feed.py` → 聚合 blog feed, Telegram, Readwise, Last.fm, GitHub, Raindrop → 输出 `src/data/` + 注入 `index.html`

### 本地 Cron
`scripts/collect_local_data.py` → Apple Health, Codex usage (ccusage), Daylio mood → `data/local_data.json`
`scripts/fetch_douban.py` → 豆瓣读书/电影 → `data/douban.json`

## Development Rules

### Commit 前浏览器自测（强制）
涉及 UI/样式/页面变更时，commit 前必须：
1. `npm run build` 构建
2. `npx astro preview --port 4321` 启动 preview
3. 用 Playwright browser MCP 打开相关页面截图验证
4. 对照 `tests/checklist.md` 检查新增功能的测试条目

新增功能时，同步在 `tests/checklist.md` 新增对应测试条目。

### 第三方 DOM 样式注意
Pagefind、Cal.com 等第三方库动态注入的 DOM 不带 Astro 的 `data-astro-cid` 属性，scoped `<style>` 无法命中。对这些元素的样式覆盖必须使用 `<style is:global>`。

## Key Directories
- `src/` - Astro 源码
- `src/data/` - 聚合数据 (CI 生成)
- `data/` - 本地数据
- `scripts/` - 数据收集脚本
- `services/` - Docker 微服务 (gitignored)
- `.github/workflows/` - CI/CD
