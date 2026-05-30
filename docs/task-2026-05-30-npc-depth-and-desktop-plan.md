# Nook — Phase A/B 战略规划

**NPC 深度化 + 桌面端（Tauri + 本地 Agent）**

> Handoff doc。2026-05-30 写。新 session（模型升级后）从此处接续，避免上下文丢失。

---

## TL;DR — 60 秒读完

- 现在 nook 里有 4 个 AI NPC：`npc_jue` (Aaron/Airing)、`npc_pip`、`npc_mio`、`npc_ren`。**只有 Aaron 接入了 V3.0-B-MEM-V4 完整记忆系统**，其他 3 个是浅角色。
- 用户提出 2 个方向：(1) 所有 NPC 都做到 Aaron 的深度；(2) 做一个桌面应用（Tauri/Electron），把这些精灵搬到本地桌面，连接本地 Agent（Jarvis 模式）。
- **结论：顺序做，不并行。** 先 Phase A 把 4 个 NPC 都深度化（4-6 周），再 Phase B 做桌面端（2-3 个月）。
- 原因：桌面端是 nook 的"投影"。如果先做桌面端，会把基础设施铺在 3 个浅角色上，后面再补深度成本更高。
- **关键架构原则：blog-api + Supabase 是共享核心；nook web 和桌面 Shell 是两个 client。同一份记忆跨两端。**

---

## 现状（2026-05-30 收盘）

### 本仓库基本盘

- Astro 静态站，部署到 GitHub Pages + 阿里云
- 主要场景：`/nook`（Phaser 2D 多人虚拟空间）、`/world`（R3F 3D 漂浮岛屿）、`/comics`、`/gallery`（美术馆）、`/blog`
- 微服务：`services/blog-api/`（Docker on 阿里云 39.105.102.252:8904→3000），负责 AI chat、订阅、Comics bot、4 个 NPC tool-calling、auth proxy
- Supabase 单库 `pcoyocvqfipuydhvdsle`，`pgvector` 已启用
- 详细基础设施见根目录 `CLAUDE.md`

### 4 个 AI NPC 当前状态

| NPC ID | 名字 | 状态 | 备注 |
|---|---|---|---|
| `npc_jue` | Aaron / Airing | **完整 V3.0-B-MEM-V4** | SOUL + facts/episodes + bge-m3 embedding + memory_search tool。这是 reference 实现。 |
| `npc_pip` | Pip | 浅角色 | 用静态对话脚本（`src/lounge/npcs.ts`/`npc_smalltalk.ts`），无记忆 |
| `npc_mio` | Mio | 浅角色 | 同上 |
| `npc_ren` | Ren | 浅角色 | 同上 |

**核心文件：**
- SOUL: `services/blog-api/npc-souls.js`（只有 Aaron 一份手写 prompt）
- 后端 chat 入口：`services/blog-api/routes/ai-companion.js`
- 前端 UI: `src/lounge/companion_ui.ts`、`src/lounge/companion_api.ts`
- 全局设计 doc：`services/blog-api/docs/superpowers/specs/2026-05-21-mochi-memory-v4.md`（mochi 是 Aaron 的旧名）

**关键 schema（已就位、无需迁移）：**
- `companion_messages(account_id, npc_id, role, content, ...)` — 历史对话
- `companion_facts(account_id, npc_id, key, value, embedding vector(1024), ...)` — 长期事实
- `companion_episodes(account_id, npc_id, summary, embedding vector(1024), ...)` — 事件摘要
- RPC：`search_companion_facts(account_id, npc_id, query_embedding, ...)` + `search_companion_episodes(...)`

所有表已经按 `(account_id, npc_id)` 分桶——**给其他 NPC 加进来不需要改 schema**。

### 本轮 session（2026-05-30）已上线的 commits

| Commit | 内容 |
|---|---|
| `57bbb04` | refactor: 抽 RoomScene portal 子系统到 `scenes/scene_portals.ts`；24 房间烟雾测试 `npm run test:rooms` |
| `82bd697` | feat: 登录后续聊——guest 触发 GUEST_CAP 时 transcript 存 localStorage（30 分钟 TTL），magic-link 回来后自动恢复 |
| `38d7270` | feat: 前端 footprint 系统——`src/lounge/visit_log.ts` + lobby 返回 pill（"↩︎ 上次去了 Library · 23 分钟前"）+ 美术馆 ×N 重访计数 |
| `0cc7f73` | perf: RoomScene 音频从 Phaser preload 阶段拆出（不再 block create()），nook load 302→272ms。`scripts/perf/measure-tti.mjs` 是可复用脚本 |
| `ee7410a` | fix(mobile): `:has()` 选择器让 D-pad 在 modal 打开时隐藏；login 卡片在 375px 不再切掉"Welcome"。`tests/smoke/mobile_sweep.test.mjs` 是可复用脚本 |

新增命令：`npm run test:rooms` / `npm run test:mobile` / `npm run perf:tti`

---

## 战略方向

### 为什么 Phase A → Phase B 顺序做（不并行）

**核心论点：nook 的差异化卖点是"住在世界里的活角色"，不是"地图大、玩法多"。**

- 现在 4 个 NPC 里只有 1 个是活的，其他 3 个是道具。这意味着 nook 的"角色密度"只有 25%。
- 桌面端 = 把角色投到桌面上常驻陪伴。如果角色本身是道具，桌面常驻就是 BongoCat——可爱但没意义。
- 先做桌面端 = 把 Tauri 框架 / MCP 接入 / 桌面 sprite 渲染 等基础设施铺在 3 个浅角色上。后面补深度时要回头改交互模式，成本很高。
- 先做 NPC 深度化 = Phase A 的产出（更深的 SOUL、跨 NPC 记忆、tool-calling 调优）100% 可被桌面端复用。

**反方意见考虑过：** "并行做不行吗？" 不行。并行 = 注意力切两半 = 两边都长不深 = 最后 schema 漂移 = 整合时返工。这是个人项目，不是大公司有两组团队。

---

## Phase A · 4 个 NPC 都做到 Aaron 的深度（4-6 周）

### A.1 SOUL 写作（核心，最难，不是编程）

**Aaron 的 SOUL 是手写在 `services/blog-api/npc-souls.js` 里的一段几百字 prompt。** 它定义了：
- 这个人是谁、年龄/职业/状态
- 关心什么、害怕什么
- 说话节奏（短句？爱用比喻？）
- 回避什么话题，怎么回避
- 跟用户的关系角色（朋友？同事？前辈？）
- 底色情绪（温柔？刻薄？慵懒？）

**Pip / Mio / Ren 各需要一份完整 SOUL。** 不是把 Aaron 的 prompt 换名字。

**建议流程（每个 NPC）：**
1. **先写 500 字"性格小传"**（给自己看，不是 prompt）。这个人活在哪里、过着什么生活、为什么会出现在 nook、和你的具体关系是什么。
2. **基于性格小传写 SOUL prompt**（300-500 字）。
3. **用 SOUL 调试工作流（A.4）跑 20 条固定测试对话**，看回复是否符合性格。
4. **迭代 SOUL 3-5 轮**，直到回复"听起来像 ta"。

**最难的事：** 让 Pip / Mio / Ren 真正差异化。如果三个都是"温柔的朋友"只是名字不同，那做了等于没做。**建议事先确定每个 NPC 的"功能位"：** 比如 Pip = 工作搭档（聊代码 / 项目）、Mio = 生活记录员（聊心情 / 健身）、Ren = 文化向导（聊读书 / 电影 / 旅行）。这样他们的 SOUL 自然有边界。

### A.2 后端打开 embedding 写入

`services/blog-api/.env` 有 `EMBEDDINGS_ENABLED=true` flag。但代码里可能只对 npc_jue 走完整路径。

**待做：**
- 找到 `routes/ai-companion.js` 里写 facts/episodes 的地方
- 确认对所有 npc_id 都触发 embedding 调用
- bge-m3 通过 SiliconFlow API 跑 1024-dim 向量
- 写入 facts/episodes 表时同时写 embedding 列

**注意：** Bg-m3 embedding 单条请求很轻（<200ms），但 4 个 NPC × 30 条/天 × 用户增长，每月 SiliconFlow 调用量需要监控。

### A.3 NPC 跨角色记忆（V4 没有的能力）

**新能力：** "Mio 上周提过你想去九州"——Aaron 能引用 Mio 关于你的事实。

**怎么做：**
- `search_companion_facts` RPC 加一个可选 `include_other_npcs: boolean` 参数
- 默认 false（保持现有行为）。某些 SOUL 里允许调用 cross-NPC search
- 增加权限层：哪些 npc 可以看哪些 npc 的事实。可能不是全开（隐私感）；可能是"Aaron 能看 Mio 的，但 Pip 不能看 Aaron 的"——根据"关系亲密度"配置。

**这一步可选，但能让 4 个 NPC 之间感觉到"他们认识彼此"，世界感强一个量级。**

### A.4 SOUL 调试工作流

**痛点：** 现在调 SOUL 要进 nook、点 NPC、聊天、看回复。慢，且回复每次都新发起对话（无法对比"同一句话换 SOUL 后怎么变"）。

**建议：** 一个本地脚本，`services/blog-api/scripts/soul-eval.js`：
- 输入：NPC id + 一段 SOUL prompt + 20 条固定测试 user message（如"今天好累" / "你昨天说要给我推荐书呢？" / "你怎么看 LLM 取代程序员"）
- 输出：每条 user message 的回复 + token 数 + 哪些工具被调用
- 加 `--diff` 模式：跑两份 SOUL 对比同一组 prompt 的回复

这个脚本一旦写好，写 SOUL 的迭代速度提升 10 倍。

### A.5 数据膨胀策略

**问题：** 4 NPC × 30 条/天 × 增长用户 × 1024-dim float embeddings —— Supabase free tier 8GB 上限会很快撞上。

**两个策略，分阶段：**
- 短期：embeddings 列加 `gist` 索引；删除 30 天没访问过的 episode embeddings（保留 fact embeddings，因为 fact 是长期）
- 中期：每周后台 job 把"低 importance 的 episodes"合并成摘要，原始 episodes 删除
- 长期：用户对话超过 1000 条后，给老 episodes 做 LLM 摘要，删除原始

**这不阻塞 Phase A 启动**，但 SOUL 调试启动时要把 embeddings 默认带上摘要写入，否则会快速爆。

---

## Phase B · Tauri 桌面端 + 本地 Agent（A 完成后，2-3 个月）

### B.1 核心设计原则：投影而非重写

```
┌─ 共享核心（已有，blog-api + Supabase）─────────┐
│  • companion_messages / facts / episodes      │
│  • 4 个 NPC SOUL + 工具调用                   │
│  • Supabase Auth                              │
└────────────────────────────────────────────────┘
        ▲                              ▲
        │                              │
   nook web                       桌面 Shell（Tauri）
   • Phaser 渲染                  • 同一份 Phaser 场景，跑在透明无边框窗
   • 浏览器 sandbox               • 暴露 MCP / 文件系统 / shell 给 NPC
   • 公共/社交向                  • 个人/工作向
```

**桌面端的"新东西" = Tauri shell + MCP 接入。其他都从 nook 抄。**

### B.2 Tauri 选型（不是 Electron）

- Tauri：Rust shell + 系统 WebView，包体积 ~10MB
- Electron：Chromium + Node，包体积 ~100MB+，RAM 占用对常驻应用不友好

**Phaser 在 Tauri 的 WebView 里能跑** —— 已验证可行的常规栈。

**桌面 sprite 行为开放问题（B.6 详述）：**
- 是 borderless 全屏透明覆盖整个桌面？
- 还是一个固定大小的"宠物窗口"（像 BongoCat）？
- 还是 toggle："工作模式" = 小窗，"陪伴模式" = 全屏？

### B.3 MCP-as-NPC-capability

**核心想法：每个 NPC 持有一组它能调用的 MCP server。**

- Aaron：mcp-git、mcp-linear、mcp-claude-code（他懂代码、懂项目管理）
- Mio：mcp-calendar、mcp-health（她管你的日程和健康）
- Pip：mcp-raindrop、mcp-readwise（她管你读的东西）
- Ren：mcp-shell-readonly、mcp-file-search（他能查你的文件）

**为什么这个设计好：**
1. 每个 NPC 的"能力边界"本身就是角色化的一部分
2. MCP 生态已经成熟，不用自己造工具
3. 可以让用户配置"哪些 NPC 能调哪些 MCP"——隐私 / 权限自然落地
4. 新 MCP 出现时，只需要分配给某个 NPC，不需要改桌面 shell

**这就是"Jarvis 模式"的本质：不是一个全能助手，是一组各有所长的角色。**

### B.4 认证延续 magic-link

桌面端打开 → 浏览器跳 `ursb.me/auth?desktop=1` → 登录回调 → 把 access token 写入 OS keychain（macOS Keychain / Windows Credential Manager / linux secret-service）。

**不要做独立账号体系。** 桌面端是 web 用户的延伸。

### B.5 同一份记忆跨 web/桌面

桌面对话和 web 对话写入同一张 `companion_messages` 表，按 `(account_id, npc_id)` 分桶。

早上和 web 上的 Pip 聊过"今天有点焦虑"，晚上桌面 Pip 接得住："今天后来好点了吗？"

**这就是为什么要先做完 Phase A：** 记忆系统是两端共享的，必须先稳。

### B.6 桌面 sprite 行为设计开放问题

以下需要用户决定，不要假设：

| 问题 | 选项 |
|---|---|
| 视觉范围 | (a) 整桌面透明覆盖 (b) 单个宠物窗 (c) 双模式 toggle |
| 默认行为 | (a) NPC 主动开口（多久一次？） (b) 用户喊才回应 |
| 多 NPC 同屏 | (a) 4 个一起在桌面 (b) 一次只显示一个 |
| 系统集成 | 全局快捷键召唤？菜单栏图标？托盘？ |
| 断网降级 | 离线时 NPC 还能说话吗（用本地 LLM？）？ |
| 桌面"房间" | 桌面上有虚拟办公室布局？还是只有角色没有场景？ |

---

## 现在就该做的解耦工作（即使还没开始 Phase B）

### C.1 ChatRenderer 接口抽出

`src/lounge/companion_ui.ts` 现在直接操作 DOM。这部分要抽成一个接口：

```ts
interface ChatRenderer {
  appendBubble(role: 'user' | 'assistant', text: string, speaker?: string): void
  clear(): void
  scrollToBottom(): void
  show(): void
  hide(): void
}
```

- Web 实现：`DomChatRenderer`，操作现有 DOM
- 桌面实现（未来）：`TauriChatRenderer`，调 Tauri 窗口 API

**这个抽象现在就值得做**——即使只有一个实现，也能让以后桌面 client 集成时不需要重写 companion_ui 的对话逻辑。

### C.2 视口假设清单

Web 端有些代码假设浏览器 viewport：
- `src/lounge/lobby_returning_pill.ts` —— camera.width / camera.height 算位置
- `src/lounge/companion_ui.ts` —— fixed-position overlay
- 各种 modal —— 假设有 backdrop click

**桌面端这些假设都不成立。** 现在不用改，但要 doc 起来：开始 Phase B 时知道哪些文件要重新审视。

建议在 `docs/` 下新开一个 `desktop-coupling-points.md`，每发现一个就追加。

---

## 关键决策点（等用户拍板）

按优先级：

1. **Phase A 第一个动哪个 NPC？** Pip / Mio / Ren 三选一。建议 Pip（如果定位是"工作搭档"，跟用户日常代码工作最相关，反馈最快）。
2. **3 个 NPC 的"功能位"怎么分？** 见 A.1 的初步建议。这是设计性决策，影响 SOUL 写作方向。
3. **跨 NPC 记忆 (A.3) 第一版做不做？** 简单：先不做，等 4 个 SOUL 都跑通了再加。
4. **桌面端用 Tauri 还是 Electron？** 强烈建议 Tauri，理由见 B.2。
5. **桌面 sprite 视觉模式（B.6 第一行）？** 这是产品决策，影响开发优先级。
6. **MCP 服务器分配（B.3）？** 每个 NPC 应该有哪些工具？这本身是角色设计。

---

## 第一周可执行清单（NPC Pip，假设它先做）

按时间顺序：

- [ ] **Day 1-2（周末写作）：** 写 Pip 的 500 字性格小传 → 第一版 SOUL prompt（300-500 字）
- [ ] **Day 3：** 写 `services/blog-api/scripts/soul-eval.js` 调试脚本 + 20 条固定 user messages 测试集
- [ ] **Day 4：** 跑 eval，看 Pip 的回复，迭代 SOUL 2-3 轮
- [ ] **Day 5：** 后端打开 npc_pip 的 embedding 写入（A.2）
- [ ] **Day 6：** 在 nook 里实际 chat 测试，验证 facts/episodes 在 supabase 落了 + memory_search 能调到
- [ ] **Day 7：** 总结一周经验，把 Mio/Ren 的"性格定位"也定下来；同时另开一个 doc `docs/desktop-coupling-points.md` 开始记录

---

## 重要文件 / 路径索引

新 session 进来要快速找到东西：

**后端（blog-api 微服务，submodule）：**
- `services/blog-api/npc-souls.js` —— SOUL prompts（只有 Aaron）
- `services/blog-api/routes/ai-companion.js` —— chat 入口、tool-calling 循环
- `services/blog-api/lib/embeddings.js` —— bge-m3 调用
- `services/blog-api/.env` —— `EMBEDDINGS_ENABLED`、`SILICONFLOW_API_KEY`、`KIMI_API_KEY`
- `services/blog-api/docs/superpowers/specs/2026-05-21-mochi-memory-v4.md` —— 完整设计文档

**前端（nook 主仓）：**
- `src/lounge/companion_ui.ts` —— chat overlay UI（含本轮 session 加的 sticky-chat 重连）
- `src/lounge/companion_api.ts` —— 调后端的 fetch 封装
- `src/lounge/scenes/RoomScene.ts` —— 主场景（已部分拆分，见 scenes/scene_portals.ts）
- `src/lounge/sticky_chat.ts`、`src/lounge/visit_log.ts`、`src/lounge/lobby_returning_pill.ts` —— 本轮 session 新加
- `src/components/LoungeGame.astro` —— 页面入口 + 全局 CSS

**测试 / 工具：**
- `tests/lounge/*.test.mjs` —— 单元测试（npm test）
- `tests/smoke/lounge_rooms.test.mjs` —— 23 房间烟雾测试（npm run test:rooms）
- `tests/smoke/mobile_sweep.test.mjs` —— 移动端 screenshot 测试（npm run test:mobile）
- `scripts/perf/measure-tti.mjs` —— Playwright TTI 测量（npm run perf:tti）

**Supabase：**
- Project: `pcoyocvqfipuydhvdsle.supabase.co`
- Studio SQL editor: https://supabase.com/dashboard/project/pcoyocvqfipuydhvdsle/sql/new
- 关键表见上面"现状"段

**Deploy：**
- 网页：push 到 master → GitHub Actions → gh-pages
- blog-api：`./scripts/deploy-blog-api.sh`（必须用这个脚本，不要手改服务器）
- 阿里云：39.105.102.252，ssh 凭据见 `.env`

---

## 给新 session 的引导词

复制下面这段到新 session：

```
我在做 nook 项目（airingursb.github.io，Astro + Phaser 2D 多人虚拟空间）。
上一个 session 我们做了战略规划，要分两个 phase 推进：
  Phase A: 把 4 个 AI NPC 都做到 Aaron 的深度（4-6 周）
  Phase B: 做 Tauri 桌面端 + MCP 本地 Agent（之后 2-3 个月）

完整计划在 docs/task-2026-05-30-npc-depth-and-desktop-plan.md，请先读这份 doc。

我现在想从 Phase A 的第一个任务开始：给 NPC Pip 写第一版 SOUL prompt。
（或者：根据你看完 doc 之后的判断，告诉我从哪一步开始最合理。）
```

或者更直接的版本（如果想立刻开始写代码）：

```
读 docs/task-2026-05-30-npc-depth-and-desktop-plan.md。
开始 Phase A · Day 3 的 soul-eval.js 脚本（先把调试工具做出来，再写 SOUL 迭代更快）。
具体规格在 doc 的 A.4 节。
```

---

## 元信息

- 本 doc 写于 2026-05-30，model 升级换 session 前
- 上一个 session 完成了 6 项游戏优化（见"本轮 session"段），都已 push 到 master
- 工作区还有 3 个未 commit 的 `src/world/` 文件改动（IslandWidget / CliffWaterfalls / zones），与本规划无关
- Linear 主跟踪 issue：SHU-537（所有 Nook 工作都挂这下面）
