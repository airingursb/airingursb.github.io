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
| Task(派生) | talking | 白板 | delegating: <desc> |
| 空闲 >45s | idle | Boss/茶水 | idle |
| SubagentStop | leaving | 休息区 | wrapping up |

(映射表在 `lib/state.js` 的 `TOOL_MAP`,改这一处即可。)

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

## 已知边界(v1 = 粗粒度,符合设计)

- hooks 是**主会话视角**:subAgent 内部每一步动作 hooks 给不全 → v1 里 sub 入场后是"working",到 SubagentStop 离场。**v1.1** 再 tail 子 agent transcript 补细粒度动作。
- `SubagentStop` 不告诉我们是哪个 sub 结束 → 取最早入场那个离场(粗略,体感无碍)。
- 多个 subAgent 并发时按入场顺序占 12 个工位槽。
