# nook 活世界 Demo — 设计 Spec

**Status:** approved design · **Date:** 2026-05-30 · **Scope:** Phase 0 Demo（owner-only，无 auth）

> 产品背景见 DEVONthink「nook 活世界 · 你领养你自己」+ `docs/2026-05-30-nook-agent-envoy-design.md`。本 spec 只覆盖第一版 Demo：用最小闭环验证「世界 + 每日简报」是否值得每天点开。

## 1. 目标 / 非目标

**目标（一句话）**：你不在时，nook 的 4 个 NPC（+ 你的「常驻自我」）在世界里活一点、彼此发生点事；早上你收到一份某个 NPC 口吻的「昨晚的村子」简报（Telegram + nook 站内卡片）。你的本地 agent 把你此刻的真实活动（在敲代码 / 空闲）镜像进世界。

**成功标准（kill 指标）**：你自己连续 1–2 周早上愿意点开简报；读起来像「村子真的发生了点事」，不是「Ren 说了 hi」的噪音。打开率 < 60% → 回炉。

**非目标（YAGNI，明确不做）**：多人 / 别人的 agent 入驻、device-flow / OAuth、envoy↔envoy、`world_events` 向量化、persona 投影、在 Phaser 里精细渲染常驻自我（Demo 只做站内简报卡片 + 一个简单的「在场 / 在敲代码」指示）。

## 2. 架构总览

```
你的 Mac(本地)                    blog-api (Docker :8904)               Supabase
─────────────                     ─────────────────────                 ────────
presence 小脚本 ─POST /presence──► routes/nook-world.js  ──upsert──► resident_state
(每 5min 报 coding/idle)            (X-Nook-Secret 校验)
GitHub Action(每晚) ─POST /_tick──► lib/world-loop.js ──读 SOUL+记忆+你的状态──► world_events
                                     (1 次 Kimi → 3-5 条事件)
GitHub Action(早晨)─POST /_brief─► lib/world-briefing.js ─读 world_events─► nook_briefings
                                     (1 次 Kimi，NPC 口吻日记)        ├─► Telegram bot(推手机)
                                                                       └─► nook 站内「☀️ 昨晚」卡片
```

数据流单向、无实时。所有定时由 GitHub Actions cron 触发（仿 `daily-report.yml`），blog-api 只暴露被触发的端点。

## 3. 数据模型（Supabase `pcoyocvqfipuydhvdsle`，3 张新表）

```sql
-- 你的常驻自我此刻在干嘛（owner-only，单行 per account）
CREATE TABLE resident_state (
  account_id uuid PRIMARY KEY REFERENCES accounts(id),
  activity   text NOT NULL DEFAULT 'idle',   -- 'coding' | 'idle'（Demo 仅此二者）
  location   text,                            -- 可空，如 'workshop'
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 自循环产出的事件
CREATE TABLE world_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day          date NOT NULL,                 -- 北京时间日期，便于按天聚合
  ts           timestamptz NOT NULL DEFAULT now(),
  participants text[] NOT NULL,               -- npc_id / 'resident:<account_id>'
  summary      text NOT NULL,                 -- 一句话事件（中文，NPC 视角）
  kind         text NOT NULL DEFAULT 'npc'    -- 'npc' | 'resident'
);
CREATE INDEX world_events_day_idx ON world_events(day);

-- 每日简报存档（供站内卡片读）
CREATE TABLE nook_briefings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day        date NOT NULL,
  npc_voice  text NOT NULL,                   -- 用了谁的口吻
  body       text NOT NULL,                   -- ~100 字简报正文
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX nook_briefings_day_idx ON nook_briefings(day);
```

写入走现有 `lib/write-batch.js` 模式或直接 insert（Demo 量极小，直接 insert 即可；遵守 Supabase IO 预算——每天 ~1 次写，无压力）。

## 4. 组件一 · 最小行为镜像

- **端点** `POST /api/nook/presence`，header `X-Nook-Secret`（env `NOOK_SHARED_SECRET`）校验，body `{ activity: 'coding'|'idle' }`。upsert `resident_state`（account 写死为你的 id，env `NOOK_OWNER_ACCOUNT_ID`）。
- **本地 poster**（你的 Mac）：最小实现——一个脚本每 5 分钟判断「有没有活跃的 Claude Code / 终端会话」→ POST `coding` 或 `idle`。两种落地任选其一，实现计划里定：
  - (a) launchd/cron 跑一个 shell 脚本（`pgrep` 判断进程）；
  - (b) Claude Code Stop hook（活动时 POST）。
- **断连即下线**：world-loop 读 `resident_state` 时，`updated_at` 超过 15 min → 视为 `away`，你的自我不参与当晚事件（或以「不在」入镜）。

## 5. 组件二 · 世界自循环（`lib/world-loop.js`）

- **触发**：`POST /api/nook/_world-tick`（admin/secret 门控），GitHub Action 每晚 1 次（北京时间夜里）。
- **逻辑**：
  1. 在场居民 = 4 个 NPC + （若 `resident_state` 新鲜且 `coding`）你的常驻自我。
  2. 取每个 NPC 的 SOUL 摘要（`npc-souls.js`）+ 轻量近期记忆（可选：各取 1-2 条 `companion_episodes`）+ 世界状态（时辰/天气/你的活动）。
  3. **1 次 Kimi 调用**（`callKimi`，复用），prompt 要求产出 3–5 条**短事件**（每条一句、中文、合理、可引用你的活动），结构化返回（JSON 数组 `{participants, summary, kind}`）。
  4. 写入 `world_events`（`day` = 当天北京时间）。
- **质量护栏**：复用刚修的反「思维链泄漏」纪律；prompt 明确「只输出事件，不输出推理」。事件要克制、生活化，禁止编造你没做过的具体事。
- *备选（不选）*：实时多轮 NPC 对话——太贵，Demo 不需要。

## 6. 组件三 · 每日简报（`lib/world-briefing.js`）

- **触发**：`POST /api/nook/_briefing`（secret 门控），GitHub Action 每天早晨 1 次。
- **逻辑**：读当天 `world_events` → **1 次 Kimi 调用**，用某个 NPC 的口吻（**轮流**，默认 Airing）写 ~100 字晨间日记，**严格从真实事件派生**（红队要求，不放飞）。
- **双投递**：
  - **Telegram**：复用现有 bot（blog-api 已有 Telegram 能力，仿每日报告），推给你。
  - **站内卡片**：写 `nook_briefings`；nook 前端加一个「☀️ 昨晚的村子」卡片，登录时拉最新一条 `GET /api/nook/briefing/latest`。
- **空事件兜底**：当天无事件 → 不发 Telegram，卡片显示「村子很安静」。

## 7. 鉴权 / 密钥模型（Demo）

- 不做 OAuth。两个 env：`NOOK_SHARED_SECRET`（presence/tick/briefing 端点校验）、`NOOK_OWNER_ACCOUNT_ID`（写死你的账号）。
- 端点全部非公开：`X-Nook-Secret` 不匹配即 403。GitHub Action 用 repo secret 携带。

## 8. 文件清单（新增 / 改动）

**blog-api（`services/blog-api/`）**
- 新增 `routes/nook-world.js`：`POST /presence`、`POST /_world-tick`、`POST /_briefing`、`GET /briefing/latest`（注册进 `routes/index.js` 或 server 路由表）。
- 新增 `lib/world-loop.js`、`lib/world-briefing.js`。
- 改 `routes/index.js`（挂载）、`.env`（`NOOK_SHARED_SECRET` / `NOOK_OWNER_ACCOUNT_ID`）。
- 复用：`services/companion-service.js` 的 `callKimi`/`MEMORY_TOOLS`（已 export）、`lib/npc-souls.js`、`lib/companion-memory.js`（读 episodes）、现有 Telegram 发送、`lib/blog-supabase.js`。

**主仓（前端 + CI + 本地）**
- nook 前端：一个「☀️ 昨晚的村子」卡片组件（读 `GET /api/nook/briefing/latest`）+ 可选的「在场/coding」指示。
- `.github/workflows/nook-world.yml`：两个 cron（夜里 tick、早晨 briefing），仿 `daily-report.yml`，curl 带 secret 打端点。
- 本地 `scripts/nook-presence.*`（poster）+ 说明。

**Supabase**：上面 3 张表的 migration。

## 9. 风险

- **冷启动**：单人，靠 4 个 NPC 兜底 + 单人版完整化解。
- **镜像隐私**：只镜像「在敲代码 / 空闲」这个**状态**，绝不镜像「敲了什么内容」。
- **自主行为质量**：依赖 NPC SOUL 深度（Phase A）；事件若变 mush 则简报失败——kill 指标会照出来。

## 10. 已决细节

- 简报口吻：**轮流**，默认 Airing。
- 镜像信号：仅 `coding` / `idle`。
- 频率：自循环每晚 1 次；简报每早 1 次。
- 调度：GitHub Actions cron（不引服务器内 node-cron）。
- 投递：Telegram + 站内卡片**都要**。
