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

## 状态 → 区域/动画映射

| Claude Code 工具 | 状态 | 区域 | 气泡 |
|---|---|---|---|
| Edit / Write / MultiEdit | typing | 工位 | editing <file> |
| Read / Grep / Glob | reading | 工位 | reading <file> |
| Bash | running | 机房 | <command desc> |
| WebSearch / WebFetch | searching | 工位 | searching "<q>" |
| TodoWrite | thinking | 工位 | planning |
| Agent / Task(派生) | talking | 白板 | delegating <agent_type>: <prompt> |
| Notification(permission_prompt) | blocked | 原地 | waiting for your approval |
| 空闲 >45s | idle | Boss/茶水 | idle |
| SubagentStop | leaving | 休息区 | done ✓ / failed ✗ / cancelled |
| 子 Agent 闲置 >8s | chatting | 茶水/白板 | ~ chatting ☕（**加戏，fiction:true**） |

(映射表在 `lib/state.js` 的 `TOOL_MAP`,改这一处即可。)

**真实 vs 加戏**:气泡带 `~` 且变灰斜体的 = **虚构**(`fiction:true`)。真实 Claude Code 里子 Agent 之间**不通信**(星形拓扑),所以「子 Agent 社交」纯属为画面热闹而编;一旦该子 Agent 来了真实 hook 事件,fiction 立刻清除、回归真实状态。

## 结构

| 文件 | 作用 |
|---|---|
| `lib/state.js` | **纯状态机**:agent 树 + 工具→状态/区域映射(I/O-free,可测) |
| `lib/state.test.js` | 单测(`npm test`,8 个用例) |
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
