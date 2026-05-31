# Agent Office — 客户端必要性验证 (A) + 后续 (B/C)

**Date:** 2026-05-31 · 接 `task-2026-05-30-agent-office.md` / `task-2026-05-30-multi-client-architecture.md`

## A. https 网页能否连本地 http 服务？— **不能（实测）**

**测试**:用户真实 Chrome 打开 `https://ursb.me`,在页面里 `fetch('http://localhost:4500/state')`(本地 agent-office 服务在跑,curl 200)。

**结果**:**超时,且本地服务日志里完全没有这条请求** → 浏览器在**发送前就客户端拦截**了。`localhost` / `127.0.0.1` 都一样。给本地服务加了 `Access-Control-Allow-Private-Network: true` 也无效——因为请求根本没发出去。

**原因**:公共 **https** 页面向 **http://localhost** 发子请求 = Chrome 的「insecure private network request」,静默阻止(不是 CORS、不是 PNA 响应问题,是 mixed-content/私网安全层在发送前拦截)。

**结论(改策略)**:
- ❌ **「网页直连本地服务、看自己真实 agents」这条路走不通。**
- ✅ 网页要看真实 agents,只能走**云端中继**:本地 agent **推**状态到 nook 云端 world-server(https,同源),网页从云端读 = **v2 云端办公室**。
- ✅ **桌面客户端(C)** 原生连本地、无浏览器枷锁 —— 这是「本地真实 agents」体验的**唯一干净载体**。

**因此**:web 版 = demo/展示 + v2 云端多人;**桌面版 = 你自己的真实/细粒度/常驻 agents**。两者职责清晰分工。(localhost 直连这条已排除,不再尝试。)

## B. transcript tail — subAgent 细粒度动作

shell hooks 对 subAgent 内部工具事件覆盖不确定(agent_id 是否进 settings.json hook payload 未在真机确认)。**兜底**:本地服务直接 tail 子 agent 的 transcript jsonl(`~/.claude/projects/**/…/agent-*.jsonl`,Claude Code 实时写入),解析 `tool_use` 条目 → 按 agent_id 发细粒度 tool 事件,喂进同一个状态机。浏览器读不了本地文件,这块天然属于本地服务/客户端。详见实现。

## C. Tauri 桌面端 spike

承载 A 结论里「桌面端独有优势」:原生连本地(绕开浏览器拦截)、读 transcript、自动装 hooks、托盘常驻、原生通知、置顶小窗。spike 目标:最小 Tauri 壳加载 office 场景 + 原生 HTTP/SSE 连本地服务跑通。
