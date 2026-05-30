# Agent Office (v1 · single-machine)

把你本地 **Claude Code** 的主 Agent + 它派生的 subAgents,可视化成在办公室里干活的小角色。
全本地、零云端、零外部依赖(纯 Node + 一个静态页)。设计文档:`docs/task-2026-05-30-agent-office.md`。

```
Claude Code（你的会话）
   └─ hooks ──POST /event──►  本地服务 :4500  ──SSE──►  办公室页面（浏览器）
        SessionStart/Stop          agent 树 + 状态机           每个 agent = 一个角色
        PreToolUse(Task)=spawn      (lib/state.js)             按状态去对应工位/区域
        PostToolUse=动作                                        + 头顶气泡"在干嘛"
        SubagentStop=离场
```

## 跑起来(3 步)

```bash
cd tools/agent-office
npm run install-hooks      # 把 hooks 合并进 ~/.claude/settings.json（自动备份，可重复运行）
npm start                  # 启动本地服务 → http://localhost:4500
```

然后**打开 http://localhost:4500**,再**新开一个 Claude Code 会话**开始干活——你会看到:
- 会话开始 → "You"(主 Agent,金圈)在 Boss 工位坐下
- 你 Edit/Write → 角色在工位打字;Bash → 跑去机房;WebSearch → 查资料
- 主 Agent 用 Task 派活 → 走到白板"交接",一个新 worker 入场占工位
- subAgent 干完(SubagentStop)→ 去休息区、离场

卸载 hooks:`npm run install-hooks -- --remove`(或 `node install-hooks.mjs --remove`)。

## 状态目录(`lib/states.js`,~247 个状态)

每个状态 = `{ id, cat, verb, emoji, zone, anim, fiction }`。**全部状态都在 `lib/states.js`**,加/改一行即可。

| 类别 cat | 数量 | 真/假 | 例子 |
|---|---|---|---|
| code | 30 | 真 | edit_test 🧪 写测试 · edit_style 🎨 改 CSS · edit_fix 🐛 修 bug |
| read | 24 | 真 | grep_todo 📌 找 TODO · read_diff 🔍 看 diff · read_image 🖼️ 看图 |
| run | 40 | 真 | run_commit ✅ · run_deploy 🚢 部署 · run_db 🗄️ 查库 · run_test 🧪 |
| web | 8 | 真 | web_search 🔎 · web_github 🐙 |
| think | 12 | 真 | think_plan 🗺️ · think_stuck 🤔 卡住 |
| delegate | 8 | 真 | del_spawn 🤝 派活 · del_review 🧐 验收 |
| mcp | 10 | 真 | mcp_db 🗄️ Supabase · mcp_browser 🌐 · mcp_design 🎨 |
| life | 15 | 真 | life_done 🎉 · life_failed 💥 · life_break ☕ |
| blocked | 4 | 真 | blocked_perm ✋ 等你授权 |
| **idle** | **50** | **加戏** | idle_coffee ☕ 接咖啡 · idle_nap 😴 · idle_window 🪟 望窗 · idle_plant 🪴 浇花 |
| **social** | **26** | **加戏** | soc_debate ⚔️ · soc_highfive 🙌 · soc_tabs 😅 吵 tab vs 空格 |
| **react** | **20** | **加戏** | react_eureka 💡 · react_facepalm 🤦 · react_party 🥳 |

**解析**:`resolveTool(toolName, input)` 按 **文件扩展名 / Bash 关键词 / MCP server 名** 把一次工具调用映射到细状态(如 `Edit foo.test.ts → edit_test`、`Bash "git commit" → run_commit`、`Edit app.css → edit_style`)。`anim` 字段把状态桥接到 bear.ts 的 5 个动画(idle/walk/wave/sit/dance);`cat` 决定颜色;`emoji` 是气泡里的活动图标。

**形象**:每个 agent 有确定性 `species`(11 物种,匹配 bear.ts)——子 Agent **按 agent_type 取**(同一种角色永远同一张脸),无 type 时按 agent_id;主 Agent = 用户 avatar。

**真实 vs 加戏**:`cat` 为 idle/social/react 的 = `fiction:true`,气泡灰化斜体加 `~`。真实 Claude Code 里子 Agent 之间**不通信**(星形拓扑),所以社交编排纯属为画面热闹而编;一旦该 agent 来了真实 hook 事件,fiction 立刻清除、回归真实状态。

**加戏编排**:idle 角色每 12s 换一个 ambient 活动(浇花/接咖啡/望窗…);两个 idle 子 Agent 凑一起会走完「走向茶水间 → 你一句我一句轮替 → 散场回工位 → 冷却 30s」整套(`_socialize`)。

## 结构

| 文件 | 作用 |
|---|---|
| `lib/states.js` | **状态目录**:~247 个状态 + `resolveTool` 解析(文件/Bash/MCP 启发式) |
| `lib/state.js` | **纯状态机**:agent 树 + agent_id 归因 + 加戏编排(I/O-free,可测) |
| `lib/state.test.js` | 单测(`npm test`,14 个用例,含目录完整性校验) |
| `server.js` | 本地服务:`POST /event` 入,`GET /events` SSE 出,静态托管 |
| `hooks.example.json` | Claude Code hooks 配置片段 |
| `install-hooks.mjs` | 幂等合并/移除 hooks 到 `~/.claude/settings.json` |
| `public/index.html` | **占位渲染**(Canvas,零依赖)——验证闭环用 |

## 现在是占位渲染,接下来换皮

`public/index.html` 是**临时占位**(彩色圆点 = 角色,矩形 = 工位),用来验证"hooks→服务→画面"整条链路。
等 `office-studio/` 的美术 sprite 到位后,渲染层会换成**复用 nook 的 Phaser + `bear.ts` 角色 + `office.tmj` 房间**:
- 主 Agent = 你的 avatar 物种;subAgents = 随机物种(同 ambient residents 的做法)
- 状态 → 现有 idle/walk/sit 动画 + `showBubble` 气泡
- 房间用 `generate-office-tmj.py`(照 `office-studio/FLOOR_PLAN.md`)生成

**协议保持不变**:换渲染层时 `server.js` / `lib/state.js` / hooks 都不用动,新前端照样连 `GET /events` 的 SSE 即可。

## 已查证的 Claude Code 语义(v1.1 据此修正)

- 派生工具是 **`Agent`**(v2.1.63 起从 `Task` 改名,旧名兼容);其 `tool_input` 是 **`prompt`**(自由文本)+ 可选 `agent_type`——**没有** `description` 字段。
- 子 Agent 内部的工具事件**会**触发 PostToolUse,且 payload 带 **`agent_id` + `agent_type`**(主 Agent 事件则没有)→ 可**精确归因**到具体子 Agent,不用猜。
- `SubagentStop` 带 `agent_id` + `exit_reason`(completed/failed/cancelled)→ 精确知道哪个子 Agent 结束、成败。
- 拓扑是**星形**:子 Agent 之间不通信、也不能再派生子 Agent(`Agent` 工具对子 Agent 不可用)。

## 仍是边界(诚实标注)

- **子 Agent 的最终产出文本不在任何 hook 里** → 要拿结果得 tail `transcript_path`(子 Agent 的 jsonl)。这是 v1.1 没做、留给 v1.2 的。
- **agent_id 是否真的进 settings.json shell-hook payload**:文档说 SDK hooks 一定有,shell hooks「部分事件有」。代码做了**双保险**——有 `agent_id` 就精确归因,没有就退回「最早入场者离场」的旧行为。**需在你机器上真跑一次多子 Agent 会话来确认**(看 office 里子 Agent 是否各自独立、不串台)。
- spawn 瞬间还没有真实 agent_id → 先放一个 provisional 角色,等该子 Agent 第一个事件到了再绑定真身(避免重复角色)。
- 并发子 Agent 按入场顺序占 12 个工位槽。
