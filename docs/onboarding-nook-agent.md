# Onboarding · Nook Agent

> Copy the prompt below into a fresh Claude Code session to onboard an agent
> taking over **nook / Lounge / AI Companion** work on this repo.
>
> Last updated: 2026-05-23 (post dispatch-V8 + modal-close-fix ship).

---

你接手 ursb.me 项目里 nook（小屋 + Lounge V2.x + AI Companion）的所有工作。

## 0 · 立刻读这两个文件

1. `/Users/airing/Files/code/airingursb.github.io/CLAUDE.md` — 项目宪法。命令、CORS、CI、部署路径、Supabase 配置都在
2. `/Users/airing/.claude/projects/-Users-airing-Files-code-airingursb-github-io/memory/MEMORY.md` — auto-memory 索引。你处理任务时跟用户的偏好/反馈/项目记忆都在这

## 1 · 你的范围

✅ 你负责：
- `src/lounge/*` (Phaser 2D 游戏 + UI 模块, ~50 个 .ts)
- `src/components/LoungeGame.astro` (壳 + CSS)
- `src/pages/nook.astro` 及 nook 子路由
- `services/blog-api/lib/companion-*.js`（AI NPC: Mochi / Pip / Mio / Ren）
- `services/blog-api/lib/chat-*.js`、`lib/quests.js`、相关 Supabase 表
- `supabase/migrations/*` 涉及 lounge / companion / accounts 的迁移
- `supabase/functions/dispatch-notifications/*`
- 部署 blog-api（`./scripts/deploy-blog-api.sh`）

❌ 不要碰：
- `src/grove3d/*` — 另一个 agent 在做 3D pocket world
- `public/grove3d/*` — 同上
- `scripts/generate_*_glbs.mjs`、`recover_*.mjs`、`generate_rigged_bear.mjs` — 3D 资产生成相关

## 2 · 立刻吸收的项目状态

- **作品集美术馆**（2026-05-24 build）—— `room_gallery` 是一个 80×60 tile (1280×960 px) 的十字形美术馆。
  - `gallery-studio/` 是 Codex 出图工作区（mirror comics-studio），34 个 Saul Bass / WPA 风 sprite
  - `scripts/generate-gallery-tmj.py` 生成 `public/lounge/assets/rooms/gallery.tmj`
  - `scripts/sync-gallery-assets.sh` 把 `gallery-studio/output/` 同步到 `public/lounge/assets/gallery/`
  - 渲染模块：`gallery_exhibits.ts` / `gallery_architecture.ts` / `gallery_docent.ts` / `gallery_comics.ts` / `gallery_portal.ts`
  - 美术馆深度 palette + 立柱/雕像/红地毯/聚光灯 在 `room_decals.ts` 的 `if (roomId === 'room_gallery')` 块
  - 漫画动态加载: `/api/gallery-comics.json` 是构建时静态 endpoint（fetches 远程图片受 r2.airingdeng.com CORS 限制）
  - 入口: lobby 顶墙的 `to_gallery` portal（在 lobby.tmj），spawn 在南厅 (640, 928)
- **本期 Linear tracker**: SHU-537（mandated 2026-05-23）—— 所有 nook 工作必须挂在这个 issue 树下作为 sub-issue。读 Linear 把 SHU-537 树先过一遍
- **AI Companion**: V3.0-B-MEM-V4，4 个 NPC，prompt 4 层（SOUL + IDENTITY + USER + MEMORY + WORLD），memory 走 bge-m3 1024-dim embedding，pgvector RPC search
- **账号系统**: V3.0-A，Supabase Auth，accounts 表带 companion_user_profile JSONB
- **写批量化**: post_views / rss_reads / visitor counter 每 30s 批量 flush，避免 IO budget 烧穿（今早出过 death spiral 事故）
- **Dispatch V8**（今天刚 ship）：notification_queue 加了 retry_count，5 次封顶。RPC `release_notification` / `release_notifications_bulk` 已部署
- **Diary / Memory modal close 修复** + **Modal list scroll 修复** 今天刚 ship
- **跨域 chat 调试**：localhost:4321 → chat.ursb.me cookie 跨域，401。要本地调 chat 得本地起 blog-api 或加 dev token bypass

## 3 · 决不能做的事

- **NEVER `git add .` 或 `git add -A`** —— 仓库根有大量未跟踪私密文件（comics/、AGENTS.md、services/、_archive/、_unpack/、player/）。一定按文件名 stage
- **NEVER commit GLB / 大二进制** —— `public/grove3d/models/*.glb`、`_archive/`、`_unpack/`、`player/` 已经 gitignored。别加白名单
- **NEVER 跳 git hooks**（`--no-verify`）/ amend / push --force / 用 git -i
- **NEVER 修改 `.env`** 除非用户明说。`MESHY_API_KEY` / `ADMIN_TOKEN` / `ALIYUN_PASSWORD` / `BLOG_SUPABASE_SERVICE_KEY` 高敏
- **NEVER 在服务器上手动改 `/opt/blog-api/`** —— 走 `./scripts/deploy-blog-api.sh`（封装了 rsync + docker rebuild + /health 校验 + 失败提示回滚）

## 4 · 必做的事

- **UI/样式变更 commit 前必须 browser-test**：`npm run build` → `npx astro preview --port 4321` → Playwright 或 browse skill 截图验证 → 对照 `tests/checklist.md` 新增条目。这是 CLAUDE.md 写死的规矩
- **第三方动态 DOM**（Pagefind、Cal.com 等）要用 `<style is:global>` 覆盖样式——scoped CSS 命不中
- **Supabase 频繁写入** 一律走 blog-api 的 write-batcher（`lib/write-batch.js`），不要前端直 INSERT，会烧 free tier IO budget
- **每个 PR/commit 落 SHU-537 子 issue** + Linear status 更新

## 5 · 开发工作流

```bash
# 本地起站
npm install
npm run dev              # dev mode，热重载
# 或
npm run build && npx astro preview --port 4321

# 本地起 blog-api（聊天调试用）
cd services/blog-api && docker compose up

# 部署 blog-api
./scripts/deploy-blog-api.sh

# Supabase MCP 可用，但 free tier IO budget 容易烧
# 当 MCP execute_sql timeout，fallback 到
# https://supabase.com/dashboard/project/pcoyocvqfipuydhvdsle/sql/new
```

## 6 · 工具偏好（用户已确认）

- **Have opinions, decide** —— 别给 A/B 菜单。挑一个，简短解释，干
- **Execute, don't ask** —— 计划具体 + ROI 清晰就直接做，"开搞?" 是 friction
- **不要无 git log 就说"老代码"** —— repo 只有 2 个月，没什么"老的"
- **简洁回复**，没需要别 summary

## 7 · 还没做的（可以从这些里挑）

读 Linear SHU-537 子树看完整 backlog。当前已知未完成：
- SHU-590: pg_net queue monitor + Telegram 报警
- SHU-734: `src/pages/moments.astro` build-time Supabase 调用导致 build hang 90s/page（high priority）
- SHU-727 子树: SHU-730 slow-chat alert / SHU-731 daily Kimi budget cap
- SHU-611: nook 移动端适配，Playwright 测
- SHU-588 已 done（今天）

第一步建议跟用户对齐"你想我先做哪个"——nook 工作多到一周做不完。

## 8 · 联系协调

3D agent 在做 `src/grove3d/*`，资产用 Quaternius CC0 + Meshy 兜底。如果 3D agent 改了 `src/lounge/grove_portal.ts` 或 `src/pages/nook.astro` 里 3D 桥接代码（pointerdown → iframe 入口那段），会通知你/留 comment。其他你不会被打扰。

开干前先跟用户对一句"我是新 agent，准备从 X 开始"。
