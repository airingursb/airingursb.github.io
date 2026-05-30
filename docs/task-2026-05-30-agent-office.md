# Agent Office — 单机踏脚石 → 云端多人办公室

**Status:** 设计 spec · **Date:** 2026-05-30
**接续:** `task-2026-05-30-byo-agent-claude-code.md`(BYO-brain / Claude Code 连接)、`task-2026-05-30-multi-client-architecture.md`(多端/Tauri)、活世界 Demo(Phaser 世界已上线)。

> 把"看不见的 AI agent 工作"可视化成办公室里的角色。**v1 单机**:可视化用户自己的 Claude Code 主 Agent + 它派生的 subAgents。**愿景 v2**:云端多人办公室——主持人开一间,别人的 agent 进来,跨人 agent 互动。

## TL;DR

- **v1 = 单机**:Claude Code 的 **hooks** 把 agent 生命周期/动作事件 POST 到一个**本地小服务** → 维护 agent 树(主 + subAgents)+ 各自状态 → 一个**办公室 Phaser 场景**(复用 nook 渲染 + Bear 角色)把它们画成坐在工位上干活的小角色,按状态出动画(打字/看书/跑/发呆/对话)。**全本地,不需要云。**
- **差异化两张牌**:① 角色**有性格**(复用 companion SOUL/记忆,不是冷冰冰的状态指示器);② **云端多人办公室**(v2,别人没做透)。
- v1 几乎零成本(换皮 nook),当**踏脚石 + 可视化验证**,不是终点。

## 0. 竞品现状(为什么单机只是踏脚石)

2026 这个赛道很热也很挤。**"Claude Code 主 agent + subagents 画成像素办公室"已被多个产品做过**:
- **Pixel Agents**(VS Code 插件,Claude Code):角色打字/看书/等待,**Task subagent spawn 成连父 agent 的独立角色**,布局编辑器。口号 "managing AI agents feels like the Sims"。
- **Claude Office**(paulrobello):boss(主)派生 employee(sub),PixiJS。
- **Agents in the Office** / **Agent Office**(自增长团队)/ **ASCII Agents**(终端)/ **DeskRPG**(多人聊天)。

**结论**:纯单机"看我的 agent 干活"是红海。**我们的牌不是再做一遍单机,而是:复用 nook 现成的世界/角色(几天出 v1)+ 角色深度 + 把它推到云端多人办公室(蓝海)。**

## 1. 产品:两步

| | v1 单机(踏脚石) | v2 云端办公室(差异化) |
|---|---|---|
| 谁在里面 | 你**一个人**的 Claude Code 主 agent + subAgents | **多人**的 agent;主持人开一间,别人 agent 进来 |
| 数据 | 本地 Claude Code hooks | 各人本地 agent 事件汇到 nook world-server |
| 后端 | 无(纯本地) | blog-api world-server(接 BYO-agent / device-flow) |
| 互动 | 你的主 agent ↔ 它的 subAgents | **跨人** agent 互相对话/协作 |
| 价值 | 验证可视化 + 复用 nook | 真差异化、别人没做透 |

## 2. v1 单机架构

```
你的机器
────────
Claude Code（你的会话）
  └─ hooks(settings.json) ──事件 JSON──► 本地小服务 :4500
        PreToolUse(Task)  = 派生 subAgent → 新角色入场
        SubagentStop      = subAgent 干完 → 角色离场
        PostToolUse(tool) = 当前动作 → 动画
        SessionStart/Stop = 主 agent 上/下班
                                    │ 维护 agent 树 + 各自状态
                                    ▼
                        办公室 Phaser 场景（本地网页）
                        复用 nook 的 Bear/角色 + 气泡 + 瓦片渲染
                        每个 agent = 工位上一个角色，按状态出动画
```

全本地:`hooks → localhost:4500 → 本地 Phaser 页面`(WS/轮询)。无云端。

## 3. 数据源:Claude Code hooks(真实,不臆造)

Claude Code 的 hooks(settings.json)在事件发生时跑 shell 命令、stdin 收到事件 JSON。配置把事件 curl 给本地服务:
```jsonc
"hooks": {
  "SessionStart":  [{ "hooks": [{ "type": "command", "command": "curl -s -X POST localhost:4500/event -H 'X-Kind: session_start' --data-binary @-" }] }],
  "PreToolUse":    [{ "matcher": "Task", "hooks": [{ "type": "command", "command": "curl -s -X POST localhost:4500/event -H 'X-Kind: subagent_spawn' --data-binary @-" }] }],
  "PostToolUse":   [{ "hooks": [{ "type": "command", "command": "curl -s -X POST localhost:4500/event -H 'X-Kind: tool' --data-binary @-" }] }],
  "SubagentStop":  [{ "hooks": [{ "type": "command", "command": "curl -s -X POST localhost:4500/event -H 'X-Kind: subagent_stop' --data-binary @-" }] }],
  "Stop":          [{ "hooks": [{ "type": "command", "command": "curl -s -X POST localhost:4500/event -H 'X-Kind: stop' --data-binary @-" }] }]
}
```
- 事件 JSON 带 `tool_name`、`session_id` 等 → 本地服务据此建 agent 树 + 算状态。
- **per-subAgent 细粒度动作**:hooks 给的是主会话视角;subAgent 自己在干嘛,可**tail 子 agent 的 transcript**(`~/.claude/projects/<proj>/…/subagents/**/agent-*.jsonl`,实时写入)补全。v1 可先只用 hooks(粗),v1.1 再加 transcript tail(细)。

## 4. 状态 → 动画映射

| Claude Code 动作 | 角色动画 |
|---|---|
| `Edit` / `Write` / `NotebookEdit` | 工位打字(写码) |
| `Read` / `Grep` / `Glob` | 翻书 / 查资料 |
| `Bash` | 跑东西(终端/机器旁) |
| `WebSearch` / `WebFetch` | 上网查 |
| `Task`(派生) | 转身把活交给一个新来的 sub 角色 |
| 等待用户 / 空闲 | 发呆 / 去茶水间 / 串门聊天 |
| `SubagentStop` | sub 角色交活、离场 |

## 5. 渲染(复用 nook,这是省成本的关键)

- 新增一个**办公室房间**(工位、显示器、白板、茶水间)——`gallery.tmj` / `lobby.tmj` 那套 tmj + 渲染管线照搬。
- 每个 agent = 一个 `Bear`/角色(`bear.ts`)坐工位;主 agent = "boss"工位;subAgent = 工位上的 worker。
- 状态 → 现有动画(idle/walk/sit) + 气泡(`showBubble`)显示一句"我在干嘛"(如"editing bear.ts""searching web")。
- 角色之间近距离 = 对话动画(transit/companion 那套)。

## 6. 差异化(别只做单机)

1. **角色有性格**:复用 **companion SOUL/记忆系统**——boss 是 Airing 那种调性、worker 各有怪癖,**不是状态指示器,是活角色**。这是 nook 的 charm 护城河,竞品没有。
2. **云端多人办公室(v2,真差异化)**:主持人开一间办公室(一个 room),别人的 Claude Code agent **进到同一间**,**跨人 agent 互相对话/协作**——这一档竞品没做透。直接接上我们已经设计的 **BYO-agent(Claude Code 当脑子,烧用户订阅)+ device-flow + world-server**。

## 7. v2 云端架构(接已有设计)

```
用户 A 机器: Claude Code hooks ─► A 本地 bridge ─┐
用户 B 机器: Claude Code hooks ─► B 本地 bridge ─┼─► nook world-server(blog-api)
                                                 │     · 办公室 room 状态
                                                 │     · 跨人 agent 事件广播
                                                 ▼
                          所有人看到同一间办公室(各自 Phaser 或 web/Tauri 查看器)
```
- agent 的**脑子仍在各自 Claude Code(订阅)**,nook 只做世界/广播——成本不随人数涨(同 BYO-agent 结论)。
- 主持人开 room、邀请、跨人 agent 用 `nook_say/observe` 在同一空间互动。

## 8. 建什么 vs 复用

- **复用**:Phaser 场景 + tmj 渲染、`bear.ts` 角色 + 气泡/标签、companion 性格系统、(v2)BYO-agent / world-MCP / presence。
- **新建(v1)**:① Claude Code hooks 配置(发 agent 事件);② **本地事件服务**(agent 树 + 状态机);③ **办公室房间**(tmj + 美术)+ 状态→动画映射;④ 本地办公室 Phaser 页面;⑤(v1.1)transcript tail。
- **新建(v2)**:云端 office room、主持人/邀请、跨人 agent 广播(接 world-server)。

## 9. 路线图

- **v1**(单机,踏脚石,~几天):hooks → 本地服务 → 办公室场景。主 agent + subAgents 真实出现/干活/离场。验证可视化 + 复用 nook。
- **v1.1**:transcript tail(细粒度 per-sub 动作)+ 角色性格(companion SOUL)+ 气泡讲"在干嘛"。
- **v2**:云端多人办公室(接 BYO-agent / world-server)——**差异化主战场**。

## 10. 风险 / 对策

- **红海**:单机已被做烂 → 我们靠**复用现成世界(快)+ 角色深度 + 云端多人**突围,别停在单机。
- **hook 覆盖**:subAgent 细粒度动作 hooks 可能不全 → transcript tail 兜底。
- **性能**:agent 多时角色多 → 复用 nook 现有的 reduced-motion / 房间分区。
- **v2 订阅条款**:同 BYO-agent 的结论(活跃会话即在场、事件驱动)。

## 11. 待定

1. v1 主 agent 用什么形象?(用户 avatar / Airing / 自选物种)
2. 办公室美术:沿用 nook 暖色像素,还是另起一套"极简白"(像 Marvis 截图那种)?
3. v1 本地服务用 Node(和 `@nook/mcp` 同栈)还是直接塞进现有 dev server?
4. **先做哪步**:建议 v1 最小——hooks(SessionStart + Task + SubagentStop + Stop)→ 本地服务 → 办公室场景画"主 + sub 出现/离场 + 粗动作"。跑通再加细。
