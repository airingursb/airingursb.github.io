"""Rich HTML chapter bodies for Pi Agent immersive article."""
from __future__ import annotations

from _html_helpers import (
    cmp,
    fig,
    formula,
    h3,
    h4,
    join,
    keynums,
    ladder,
    note,
    p,
    pull,
    sp,
    src,
)
from textbook_map import PRODUCTION_MAP, SEVEN_MILESTONES, TEXTBOOK_CHECKPOINTS
from visuals import (
    viz_compaction,
    viz_event_swimlane,
    viz_extension_hooks,
    viz_harness_spectrum,
    viz_message_layers,
    viz_monorepo_layers,
    viz_runloop_twin,
    viz_seven_milestones,
    viz_session_tree,
    viz_stations_flow,
    viz_textbook_map,
    viz_tui_diff,
)

PROMPT_ZH = "读取 README.md，用一句话告诉我这个项目做什么"
PROMPT_EN = "read README.md and tell me what this project does in one sentence"


def textbook_ref(cp: str) -> str:
    row = next((r for r in TEXTBOOK_CHECKPOINTS if r[0] == cp), None)
    prod = PRODUCTION_MAP.get(cp, "")
    if not row:
        return ""
    return note(
        f"📘 <strong>pi-textbook checkpoint {cp}</strong>：{row[2]}（<code>{row[3]}</code>）· 生产映射：<code>{prod}</code>",
        f"📘 <strong>pi-textbook checkpoint {cp}</strong>: {row[2]} (<code>{row[3]}</code>) · production: <code>{prod}</code>",
        copper=True,
    )


def milestones_table() -> str:
    rows = []
    for step, typ, owner, detail in SEVEN_MILESTONES:
        rows.append([step, typ, f'<span class="owner-{owner}">{owner}</span>', detail])
    return cmp(["#", "type", "owner", "detail"], rows)


def event_table(events: list[tuple[str, str, str]]) -> str:
    inner = ['<div class="event-flow">']
    for etype, zh, en in events:
        inner.append(
            f'      <div class="ef-row"><div class="ef-type">{etype}</div>'
            f'<div><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></div></div>'
        )
    inner.append("    </div>")
    return f"""    <figure>
      <div class="figbox">{chr(10).join(inner)}
      </div>
      <figcaption><span class="figid">EVT</span><span class="lang-zh-only">AgentEvent 流 · 主线 prompt</span><span class="lang-en-only">AgentEvent stream · through-line prompt</span></figcaption>
    </figure>"""


def session_tree_diagram() -> str:
    inner = """<div class="session-tree">
      <div>session <code>sess_root</code></div>
      <div class="st-node">├─ user: 「读取 README.md…」 <code>id=u1</code></div>
      <div class="st-node">├─ assistant: toolUse read <code>id=a1</code></div>
      <div class="st-node">├─ toolResult: README fixture <code>id=t1</code></div>
      <div class="st-node st-leaf">└─ assistant: stop · 最终回答 <code>id=a2</code> ← leafId</div>
      <div class="st-node" style="margin-top:12px;border-left-color:var(--copper)">fork → session <code>sess_branch</code> (parentSession=sess_root)</div>
    </div>"""
    return fig("JSONL 会话树：parentId 链 + leafId 指针 + fork 分支", "JSONL session tree: parentId chain + leafId pointer + fork branch", inner)


def build_all_chapters() -> dict[str, str]:
    return {
        "c1": chapter_c1(),
        "c2": chapter_c2(),
        "c3": chapter_c3(),
        "c4": chapter_c4(),
        "c5": chapter_c5(),
        "c6": chapter_c6(),
        "c7": chapter_c7(),
        "c8": chapter_c8(),
        "c9": chapter_c9(),
        "c10": chapter_c10(),
        "c11": chapter_c11(),
        "c12": chapter_c12(),
        "c13": chapter_c13(),
        "c14": chapter_c14(),
        "c15": chapter_c15(),
        "c16": chapter_c16(),
        "c17": chapter_c17(),
        "c18": chapter_c18(),
        "c19": chapter_c19(),
        "c20": chapter_c20(),
        "c21": chapter_c21(),
        "c22": chapter_c22(),
        "c23": chapter_c23(),
        "c24": chapter_c24(),
        "c25": chapter_c25(),
        "c26": chapter_c26(),
    }


def chapter_c1() -> str:
    return join(
        p(
            f"2025–2026 年的 coding agent 市场被两条路线撕成两半：<strong>密封产品</strong>（Claude Code、Cursor、Windsurf）和<strong>可组合 harness</strong>（Pi、OpenCode、aider 变体）。我们的主线 prompt——<code>{PROMPT_ZH}</code>——在两种架构里走的路径完全不同：产品把中间层焊死在二进制里；harness 把每一站写成可测试的 TypeScript。",
            f"The 2025–2026 coding-agent market splits into sealed products (Claude Code, Cursor, Windsurf) and composable harnesses (Pi, OpenCode, aider variants). Our through-line prompt — <code>{PROMPT_EN}</code> — takes completely different paths: products weld the middle layers into a binary; harnesses write every station as testable TypeScript.",
        ),
        sp([
            ("产品思维", "Product mindset", "用户买的是<strong>体验闭环</strong>——从安装到第一次 commit 零配置", "Users buy a <strong>closed loop</strong> — zero config from install to first commit"),
            ("Harness 思维", "Harness mindset", "开发者买的是<strong>可观测编排</strong>——每一层都有源码和测试", "Developers buy <strong>observable orchestration</strong> — every layer has source and tests"),
            ("Pi 的赌注", "Pi's bet", "终端原生 + JSONL 会话树 + TypeScript 扩展 > IDE 锁定", "Terminal-native + JSONL session tree + TS extensions > IDE lock-in"),
            ("代价", "The cost", "没有 MCP 协议层、没有子 agent、没有 Plan 模式——<em>故意不做</em>", "No MCP layer, no sub-agents, no plan mode — <em>intentionally omitted</em>"),
        ]),
        formula("架构公式", "ARCHITECTURE", [
            '<span class="term">Product</span> = UX × Integrations × Policy',
            '<span class="term-cu">Harness</span> = AgentLoop × Tools × Session × Extensions',
        ], "Pi 选择右边那条等式", "Pi chooses the right-hand equation"),
        cmp(["", "Claude Code", "Cursor", "Pi"], [
            ["定位", "密封 CLI 产品", "密封 IDE 产品", "开源 harness"],
            ["会话格式", "专有", "专有", "JSONL 树"],
            ["扩展", "MCP + 插件", "VS Code 生态", "TypeScript hooks"],
            ["可 fork", "✗", "✗", "✓ pi-mono"],
            ["主线可读", "黑盒", "黑盒", "agent-loop.ts 逐行"],
        ]),
        src("sdk", "packages/coding-agent/src/core/sdk.ts", [
            '<span class="src-comment">/** CreateAgentSessionOptions — harness entry contract */</span>',
            '<span class="src-kw">export interface</span> <span class="src-cls">CreateAgentSessionOptions</span> {',
            '  <span class="src-arg">cwd</span>?: <span class="src-cls">string</span>;',
            '  <span class="src-arg">model</span>?: <span class="src-cls">Model</span>&lt;<span class="src-cls">any</span>&gt;;',
            '  <span class="src-arg">tools</span>?: <span class="src-cls">string</span>[];',
            '  <span class="src-arg">resourceLoader</span>?: <span class="src-cls">ResourceLoader</span>;',
            '  <span class="src-arg">sessionManager</span>?: <span class="src-cls">SessionManager</span>;',
            "}",
        ]),
        h3("为什么「最小」是特性而不是缺陷", 'Why "minimal" is a feature, not a bug'),
        p(
            "密封产品的复杂度藏在黑盒里：你不知道 steering 消息如何插队、compaction 的精确阈值、tool 并行策略。Pi 把这三件事写进 <code>agent-loop.ts</code> 和 <code>agent-session.ts</code>，用单元测试锁住行为。你可以 fork pi-mono 换工具、写扩展注入 lint、用 <code>--mode rpc</code> 嵌进 CI。",
            "Sealed products hide complexity. Pi writes steering, compaction, and tool parallelism into <code>agent-loop.ts</code> and <code>agent-session.ts</code>, locked by tests. Fork pi-mono, swap tools, inject lint via extensions, embed with <code>--mode rpc</code>.",
        ),
        keynums([
            ("6", "npm 包", "npm packages", "agent-core · ai · tui · coding-agent · protocol · server", "agent-core · ai · tui · coding-agent · protocol · server"),
            ("26", "工序站", "stations", "一条用户消息穿越的完整链路", "full path of one user message"),
            ("15", "checkpoint", "checkpoints", "pi-textbook 教学里程碑", "pi-textbook teaching milestones"),
        ]),
        note("Claude Code 和 Cursor 解决<strong>普通开发者</strong>的问题；Pi 解决<strong>想理解 agent 内部机制</strong>的人的问题。", "Claude Code and Cursor serve average developers; Pi serves people who want to understand agent internals.", copper=True),
        pull("产品卖的是答案。<br>Harness 卖的是<strong>能问出下一个问题</strong>的显微镜。", "Products sell answers.<br>Harnesses sell the microscope to ask the <strong>next question</strong>."),
        textbook_ref("00"),
        viz_harness_spectrum(),
    )


def chapter_c2() -> str:
    stations = [
        ("01", "CLI 解析 argv", "cli.ts parses argv"),
        ("02", "main 启动", "main.ts boot"),
        ("03", "createAgentSession", "session factory"),
        ("04", "ResourceLoader AGENTS.md", "context stack"),
        ("05", "user message 入队", "prompt queued"),
        ("06", "agent_start 事件", "agent_start event"),
        ("07", "turn_start", "turn_start"),
        ("08", "convertToLlm", "AgentMessage → Message[]"),
        ("09", "streamSimple", "pi-ai stream"),
        ("10", "text_delta", "token streaming"),
        ("11", "toolcall_delta", "tool call assembly"),
        ("12", "assistant stopReason=toolUse", "read tool requested"),
        ("13", "executeTool parallel/seq", "tool dispatch"),
        ("14", "read README.md", "filesystem I/O"),
        ("15", "tool_result 消息", "tool result message"),
        ("16", "第二次 streamSimple", "turn 2 model call"),
        ("17", "最终 assistant stop", "final answer"),
        ("18", "message_end 事件", "message_end"),
        ("19", "SessionManager.append", "JSONL write"),
        ("20", "TUI message_update", "diff render"),
        ("21", "ExtensionRunner hooks", "extension events"),
        ("22", "compaction 检查", "context check"),
    ]
    ladder_rows = [(num, z, e) for num, z, e in stations]
    parts = [
        p(
            f"按下回车之后，<code>{PROMPT_ZH}</code> 不是直接发给 LLM——它要先变成 <code>AgentMessage</code>，穿过 <code>AgentSession.prompt()</code>，触发 <code>agentLoop()</code>，在 <code>runLoop</code> 的双环里转两圈 model stream，中间插一次 <code>read</code> 工具，最后才在 TUI 里滚动、在 JSONL 里落盘。",
            f"After Enter, <code>{PROMPT_EN}</code> does not go straight to the LLM — it becomes an <code>AgentMessage</code>, passes through <code>AgentSession.prompt()</code>, triggers <code>agentLoop()</code>, spins two model streams in <code>runLoop</code>'s twin loops with a <code>read</code> tool in between, then scrolls in the TUI and lands on disk as JSONL.",
        ),
        h3("七个里程碑 · pi-textbook 序章", "Seven milestones · pi-textbook prologue"),
        p("pi-textbook 用离线 <code>ScriptedModel</code> 固定了主线 prompt 的七步 trace。生产代码 <code>agent-loop.ts</code> 产生语义等价但事件更细的事件流。", "pi-textbook fixes a seven-step trace for the through-line prompt with offline <code>ScriptedModel</code>. Production <code>agent-loop.ts</code> emits semantically equivalent but finer-grained events."),
        f'    <table class="cmp milestone-table"><thead><tr><th>#</th><th>type</th><th>owner</th><th>detail</th></tr></thead><tbody>{"".join(f"<tr><td>{s}</td><td>{t}</td><td class=\"owner-{o}\">{o}</td><td>{d}</td></tr>" for s,t,o,d in [(a,b,c,d) for a,b,c,d in [("01","user_message","user",PROMPT_ZH[:20]+"…"),("02","model_start","model","turn=1"),("03","assistant_message","model","stopReason=toolUse · call_1"),("04","tool_start","loop","read(call_1)"),("05","tool_result","tool","README fixture"),("06","model_start","model","turn=2"),("07","assistant_message","model","stopReason=stop")]])}</tbody></table>',
        viz_seven_milestones(),
        h3("22 站全景（前 22 站）", "22-station panorama (first 22)"),
        viz_stations_flow(),
        h4("逐站清单", "Station-by-station list"),
        ladder(ladder_rows),
        event_table([
            ("agent_start", "循环开始 · 订阅者收到首事件", "Loop begins · subscribers receive first event"),
            ("turn_start", "新 turn · 可能含 steering 注入", "New turn · may include steering injection"),
            ("message_start", "用户消息或 tool result 进入 transcript", "User message or tool result enters transcript"),
            ("message_update", "流式 delta · TUI 差分渲染的燃料", "Streaming delta · fuel for TUI differential render"),
            ("message_end", "消息定稿 · SessionManager 落盘", "Message finalized · SessionManager persists"),
            ("tool_execution_start", "read 开始 · cwd 相对路径解析", "read begins · cwd-relative path resolution"),
            ("tool_execution_end", "read 结束 · 结果截断策略生效", "read ends · truncation policy applied"),
            ("turn_end", "本 turn 结束 · 检查 follow-up 队列", "Turn ends · check follow-up queue"),
            ("agent_end", "循环退出 · 返回 newMessages[]", "Loop exits · returns newMessages[]"),
        ]),
        viz_event_swimlane(),
        sp([
            ("owner=user", "owner=user", "只有用户消息", "user messages only"),
            ("owner=model", "owner=model", "model_start + assistant_message", "model_start + assistant_message"),
            ("owner=loop", "owner=loop", "tool_start · 调度决策", "tool_start · dispatch decisions"),
            ("owner=tool", "owner=tool", "tool_result · 环境事实", "tool_result · environment facts"),
        ]),
        src("prologue", "pi-textbook/workshop/src/demo/prologue.ts", [
            '<span class="src-kw">const</span> <span class="src-arg">README_FIXTURE</span> = <span class="src-str">"# tiny-pi\\n用于学习 Agent 内核的 TypeScript 项目。"</span>;',
            '<span class="src-comment">// 07 assistant_message stopReason=stop → 最终回答</span>',
            '<span class="src-fn">appendTrace</span>(trace, { <span class="src-arg">owner</span>: <span class="src-str">"model"</span>, <span class="src-arg">type</span>: <span class="src-str">"assistant_message"</span>, ... });',
        ]),
        note("从 C02 到 C26，每一章解释<strong>两站之间的过渡</strong>。持住这条 22 站骨架，细节才不会丢。", "From C02 to C26, each chapter explains <strong>one transition between stations</strong>. Hold this 22-station skeleton and the details won't drift."),
        pull("七个里程碑是望远镜。<br>二十六个章节是显微镜。", "Seven milestones are the telescope.<br>Twenty-six chapters are the microscope."),
    ]
    return join(*parts)


def _pkg_table() -> str:
    return cmp(["Package", "职责 / Role", "主线 touchpoint"], [
        ["@earendil-works/pi-agent-core", "agentLoop · types · StreamFn", "C07–C13"],
        ["@earendil-works/pi-ai", "Models · providers · EventStream", "C14–C16"],
        ["@earendil-works/pi-tui", "Terminal · diff render · Editor", "C17–C18"],
        ["@earendil-works/coding-agent", "CLI · AgentSession · tools", "C06–C08"],
        ["@earendil-works/pi-protocol", "RPC JSONL 协议", "C25"],
        ["pi-server", "远程会话 CBOR", "C25"],
    ])


def chapter_c3() -> str:
    return join(
        p("pi-mono 是 Mario Zechner（Badlogic Games，libGDX 作者）在 earendil-works 组织下的 monorepo。它不是「又一个 ChatGPT 套壳」——而是一套可 fork 的 agent harness，npm 发布六个包。", "pi-mono is Mario Zechner's (Badlogic Games, libGDX author) monorepo under earendil-works. Not another ChatGPT wrapper — a forkable agent harness published as six npm packages."),
        h3("仓库拓扑", "Repository topology"),
        src("root", "pi-mono/package.json · workspaces", [
            '<span class="src-str">"workspaces"</span>: [',
            '  <span class="src-str">"packages/agent"</span>,',
            '  <span class="src-str">"packages/ai"</span>,',
            '  <span class="src-str">"packages/tui"</span>,',
            '  <span class="src-str">"packages/coding-agent"</span>,',
            '  <span class="src-str">"packages/protocol"</span>,',
            "]",
        ]),
        _pkg_table(),
        h3("与 pi-textbook 的关系", "Relationship to pi-textbook"),
        p("pi-textbook 把生产代码<strong>降维</strong>成 15 个 checkpoint 的可运行 workshop。每个 checkpoint 对应 pi-mono 里一个真实目录，但剥离了 OAuth、40+ provider、TUI 差分渲染等生产复杂度。", "pi-textbook <strong>reduces</strong> production code into 15 runnable workshop checkpoints. Each maps to a real pi-mono directory, stripped of OAuth, 40+ providers, TUI diff rendering, etc."),
        cmp(["Checkpoint", "教学焦点", "生产文件"], [[r[0], r[2], PRODUCTION_MAP.get(r[0], "—")] for r in TEXTBOOK_CHECKPOINTS[:8]]),
        keynums([("2015", "libGDX", "libGDX era", "Mario 的游戏引擎背景影响 TUI 性能偏执", "Mario's game-engine background shapes TUI perf obsession"), ("40+", "providers", "providers", "pi-ai 支持的模型提供商数量", "model providers supported by pi-ai"), ("v3", "session", "session version", "JSONL CURRENT_SESSION_VERSION", "JSONL CURRENT_SESSION_VERSION")]),
        note("读 pi-mono 时建议开两个窗口：生产仓库 + pi-textbook 对应 checkpoint 的 workshop 测试。", "When reading pi-mono, keep two windows: production repo + pi-textbook workshop test for the matching checkpoint."),
        viz_monorepo_layers(),
        viz_textbook_map(),
    )


def chapter_c4() -> str:
    layers = [
        ("L6", "coding-agent", "CLI · AgentSession · tools · extensions", "用户看见的「pi」命令"),
        ("L5", "agent-core", "agentLoop · AgentMessage · events", "编排心脏"),
        ("L4", "pi-ai", "Models · streamSimple · providers", "LLM 边界"),
        ("L3", "pi-tui", "TUI · Editor · Markdown · diff", "终端 UI"),
        ("L2", "protocol", "JSONL RPC 帧", "进程间协议"),
        ("L1", "server", "远程会话", "CBOR over HTTP"),
    ]
    ladder_html = ladder([(f"{a} · {b}", f"{a} · {b} — {c}") for a, b, c, _ in layers])
    return join(
        p(f"主线 prompt <code>{PROMPT_ZH}</code> 从 L6 进入，在 L5 循环，L4 调模型，L3 渲染，L2/L1 只在 RPC 模式参与。", f"Through-line prompt enters at L6, loops in L5, calls model at L4, renders at L3; L2/L1 only in RPC mode."),
        h3("六层蛋糕", "Six-layer cake"),
        viz_monorepo_layers(),
        ladder_html,
        formula("依赖方向", "DEPENDENCY", ['<span class="term">coding-agent</span> → agent-core → pi-ai', '<span class="term-cu">pi-tui</span> ← coding-agent (UI only)'], "上层组装下层，不反向依赖", "Upper layers compose lower; no reverse deps"),
        src("agent", "packages/agent/package.json", ['<span class="src-str">"name"</span>: <span class="src-str">"@earendil-works/pi-agent-core"</span>,', '<span class="src-str">"exports"</span>: { <span class="src-str">"."</span>: <span class="src-str">"./src/index.ts"</span> }']),
        src("ai", "packages/ai/package.json", ['<span class="src-str">"name"</span>: <span class="src-str">"@earendil-works/pi-ai"</span>,']),
        h3("边界纪律", "Boundary discipline"),
        p("<code>AgentMessage</code> 在整个 agent-core 内流通；只在 <code>streamAssistantResponse</code> 调用点通过 <code>convertToLlm</code> 变成 pi-ai 的 <code>Message[]</code>。这条边界是 pi-textbook checkpoint 03 的核心教训。", "<code>AgentMessage</code> flows through agent-core; only at <code>streamAssistantResponse</code> does <code>convertToLlm</code> produce pi-ai <code>Message[]</code>. Core lesson of textbook checkpoint 03."),
        cmp(["层", "可替换?", "例子"], [["agent-core", "✓ fork", "自定义 runLoop"], ["pi-ai", "✓", "换 provider adapter"], ["coding-agent tools", "✓", "registerTool"], ["JSONL format", "△", "version 字段演进"]]),
        textbook_ref("03"),
        textbook_ref("13"),
    )


def chapter_c5() -> str:
    return join(
        p("Pi 的 README 明确列出<strong>故意不做</strong>的功能：No MCP · No sub-agents · No plan mode。这不是遗漏——是 harness 哲学的边界声明。", "Pi's README explicitly lists <strong>intentionally omitted</strong> features: No MCP · No sub-agents · No plan mode. Not oversights — boundary statements of harness philosophy."),
        cmp(["功能", "Claude Code", "Pi", "替代路径"], [
            ["MCP", "一等协议", "✗", "TypeScript Extension API"],
            ["Sub-agents", "内置", "✗", "fork session + RPC"],
            ["Plan mode", "专用 UI", "✗", "thinking level + 用户消息"],
            ["IDE 集成", "原生", "终端 only", "外部编辑器"],
            ["权限弹窗", "GUI", "终端确认", "tool 级别 policy"],
        ]),
        h3("为什么 No MCP", "Why no MCP"),
        p("MCP 把工具发现协议化，但 Pi 选择 <code>registerTool</code> + npm/git 扩展包——类型安全、可测试、与 agent loop 同进程。代价是生态不互通 Claude Desktop 的 MCP 市场。", "MCP protocolizes tool discovery; Pi chooses <code>registerTool</code> + npm/git extension packages — type-safe, testable, same process as agent loop. Cost: no interchange with Claude Desktop's MCP marketplace."),
        h3("为什么 No sub-agents", "Why no sub-agents"),
        p("子 agent 本质是嵌套 agentLoop + 独立 context。Pi 用 <strong>session fork</strong>（JSONL parentSession）+ <strong>RPC 模式</strong> 达到类似效果，但不隐藏嵌套层。", "Sub-agents are nested agentLoop + isolated context. Pi achieves similar via <strong>session fork</strong> (JSONL parentSession) + <strong>RPC mode</strong> without hiding the nesting."),
        note("「故意不做」= 把复杂度推给扩展作者，而不是推给终端用户。", "«Intentionally omitted» = push complexity to extension authors, not terminal users.", copper=True),
        pull("少即是多：<br>每一层省略的功能，都是一层可观测性。", "Less is more:<br>every omitted feature is a layer of observability gained."),
    )


def chapter_c6() -> str:
    return join(
        p("你在 shell 里输入 <code>pi</code> 或 <code>npx @earendil-works/coding-agent</code>，启动链从 <code>cli.ts</code> 解析 argv，到 <code>main.ts</code> 选择 interactive/print/rpc 模式，最终调用 <code>createAgentSession()</code>。", "You type <code>pi</code> or <code>npx @earendil-works/coding-agent</code>; boot chain parses argv in <code>cli.ts</code>, <code>main.ts</code> picks interactive/print/rpc mode, then <code>createAgentSession()</code>."),
        ladder([
            ("cli.ts", "argv · --model · --mode rpc"),
            ("main.ts", "mode dispatch · theme · keybindings"),
            ("createAgentSession", "AgentSession + ExtensionRunner"),
            ("interactive mode", "TUI loop · Editor"),
        ]),
        src("cli", "packages/coding-agent/src/cli.ts", [
            '<span class="src-kw">import</span> { <span class="src-fn">main</span> } <span class="src-kw">from</span> <span class="src-str">"./main.ts"</span>;',
            '<span class="src-fn">main</span>(process.argv.slice(<span class="src-num">2</span>)).catch(...);',
        ]),
        src("main", "packages/coding-agent/src/main.ts", [
            '<span class="src-kw">export async function</span> <span class="src-fn">main</span>(<span class="src-arg">args</span>: <span class="src-cls">string</span>[]) {',
            '  <span class="src-kw">const</span> mode = <span class="src-fn">parseMode</span>(args); <span class="src-comment">// interactive | print | rpc</span>',
            '  <span class="src-kw">const</span> session = <span class="src-kw">await</span> <span class="src-fn">createAgentSession</span>({ cwd, model, ... });',
            "}",
        ]),
        sp([
            ("--verbose", "--verbose", "打印 AgentEvent 到 stderr", "log AgentEvents to stderr"),
            ("--mode rpc", "--mode rpc", "JSONL  stdin/stdout 协议", "JSONL stdin/stdout protocol"),
            ("--continue", "--continue", "加载 leafId 会话", "load leafId session"),
        ]),
        h3("Case study：第一次启动", "Case study: first boot"),
        p("冷启动时 <code>ModelRegistry</code> 读取 <code>models.generated.ts</code>，<code>ResourceLoader</code> 扫描 AGENTS.md 栈，<code>SessionManager</code> 创建新 JSONL 文件。用户尚未输入主线 prompt，但 harness 已就绪。", "On cold boot <code>ModelRegistry</code> reads <code>models.generated.ts</code>, <code>ResourceLoader</code> scans AGENTS.md stack, <code>SessionManager</code> creates new JSONL. User hasn't typed the through-line prompt yet, but harness is ready."),
        textbook_ref("13"),
    )


def chapter_c7() -> str:
    return join(
        p("<code>AgentSession</code> 是 Pi 的<strong>唯一中枢调度器</strong>——所有模式（interactive、print、rpc）共享它。主线 prompt 通过 <code>prompt()</code> 进入，内部调用 <code>agentLoop()</code> 并订阅事件写 JSONL。", "<code>AgentSession</code> is Pi's <strong>single orchestration hub</strong> — all modes share it. Through-line prompt enters via <code>prompt()</code>, internally calls <code>agentLoop()</code> and subscribes to events for JSONL persistence."),
        src("session", "packages/coding-agent/src/core/agent-session.ts", [
            '<span class="src-comment">/** AgentSession - Core abstraction for agent lifecycle */</span>',
            '<span class="src-kw">export class</span> <span class="src-cls">AgentSession</span> {',
            '  <span class="src-kw">async</span> <span class="src-fn">prompt</span>(<span class="src-arg">text</span>: <span class="src-cls">string</span>): <span class="src-cls">Promise</span>&lt;<span class="src-cls">void</span>&gt; { ... }',
            '  <span class="src-kw">private async</span> <span class="src-fn">runLoop</span>(...): <span class="src-cls">Promise</span>&lt;<span class="src-cls">void</span>&gt; { ... }',
            "}",
        ]),
        event_table([
            ("session_start", "会话加载/创建 · 扩展收到 session_start", "Session load/create · extensions get session_start"),
            ("turn_start", "用户 prompt 触发新 turn", "User prompt triggers new turn"),
            ("message_update", "流式内容 · TUI 订阅", "Streaming content · TUI subscribes"),
            ("turn_end", "turn 完成 · 检查 auto-compact", "Turn complete · check auto-compact"),
        ]),
        h3("AgentSession 职责矩阵", "AgentSession responsibility matrix"),
        cmp(["职责", "类/模块", "主线时刻"], [
            ["编排 agentLoop", "agent-session.ts", "prompt() 调用时"],
            ["持久化", "SessionManager", "每个 message_end"],
            ["扩展", "ExtensionRunner", "全程 hook"],
            ["压缩", "compaction/", "token 超阈值"],
            ["模型切换", "ModelRegistry", "model_change entry"],
        ]),
        h3("与 agent-core 的分工", "Split with agent-core"),
        p("<code>AgentSession</code> 拥有 I/O 和持久化；<code>agentLoop</code> 是纯函数式循环，不知道 JSONL 和 TUI 的存在。测试 agent loop 不需要启动终端。", "<code>AgentSession</code> owns I/O and persistence; <code>agentLoop</code> is a pure loop unaware of JSONL and TUI. Testing agent loop needs no terminal."),
        textbook_ref("07"),
        textbook_ref("09"),
        note("pi-textbook checkpoint 09 Stateful Agent 讲 steer/follow-up/abort——生产代码在 AgentSession + agent-loop 的 getSteeringMessages / queueFollowUp。", "Textbook checkpoint 09 covers steer/follow-up/abort — production code in AgentSession + agent-loop getSteeringMessages / queueFollowUp."),
    )


def chapter_c8() -> str:
    return join(
        p("在主线 prompt 到达模型之前，<code>ResourceLoader</code> 把从 <code>~/.pi/AGENTS.md</code> 到项目根目录的指令文件<strong>叠加</strong>进 system context。每一层目录的 AGENTS.md 追加规则。", "Before the through-line prompt reaches the model, <code>ResourceLoader</code> <strong>stacks</strong> instruction files from <code>~/.pi/AGENTS.md</code> to project root into system context."),
        ladder([
            ("~/.pi/AGENTS.md", "全局 harness 指令"),
            ("~/.pi/PROJECT.md", "用户级项目偏好"),
            ("./AGENTS.md", "仓库级规则"),
            ("./subdir/AGENTS.md", "子目录覆盖（若存在）"),
        ]),
        src("loader", "packages/coding-agent/src/core/resource-loader.ts", [
            '<span class="src-kw">export class</span> <span class="src-cls">ResourceLoader</span> {',
            '  <span class="src-fn">loadResources</span>(<span class="src-arg">cwd</span>): <span class="src-cls">ResourceBundle</span> { ... }',
            '  <span class="src-comment">// merges AGENTS.md chain into system prompt</span>',
            "}",
        ]),
        sp([
            ("叠加顺序", "Stack order", "从全局到局部，后加载的优先级更高", "global → local, later wins"),
            ("frontmatter", "frontmatter", "YAML 头可指定 tool 白名单", "YAML header can whitelist tools"),
            ("刷新", "Refresh", "文件变更可触发 reload（扩展 hook）", "file change can trigger reload via extension hook"),
        ]),
        h3("主线 prompt 时的 context 长什么样", "What context looks like at through-line prompt"),
        p("模型看到的不是裸的「读取 README」——而是 <code>system: [AGENTS.md 栈] + user: 读取 README.md…</code>。工具 schema 也在 system 或 tools 参数里。", "Model sees not bare «read README» but <code>system: [AGENTS.md stack] + user: read README.md…</code>. Tool schemas live in system or tools param."),
        textbook_ref("12"),
    )


def chapter_c9() -> str:
    return join(
        p("Pi 维护<strong>两层消息模型</strong>：<code>AgentMessage</code>（agent-core 内部，可含自定义 role）和 <code>Message</code>（pi-ai LLM API，严格 user/assistant/tool）。<code>convertToLlm</code> 是唯一转换点。", "Pi maintains <strong>two message layers</strong>: <code>AgentMessage</code> (agent-core, custom roles) and <code>Message</code> (pi-ai LLM API, strict user/assistant/tool). <code>convertToLlm</code> is the sole conversion point."),
        cmp(["层", "类型", "谁能看", "例子"], [
            ["Transcript", "AgentMessage[]", "agent loop · JSONL", "user · assistant · toolResult · custom"],
            ["LLM API", "Message[]", "pi-ai providers", "user · assistant · tool_result"],
            ["TUI", "RenderedMessage", "终端组件", "Markdown · tool 卡片"],
        ]),
        src("types", "packages/agent/src/types.ts", [
            '<span class="src-kw">export type</span> <span class="src-cls">AgentMessage</span> =',
            '  | <span class="src-cls">UserMessage</span> | <span class="src-cls">AssistantMessage</span>',
            '  | <span class="src-cls">ToolResultMessage</span> | <span class="src-cls">CustomMessage</span>;',
        ]),
        src("convert", "packages/coding-agent/src/core/messages.ts", [
            '<span class="src-kw">export function</span> <span class="src-fn">convertToLlm</span>(<span class="src-arg">messages</span>: <span class="src-cls">AgentMessage</span>[]): <span class="src-cls">Message</span>[]',
        ]),
        h3("三层 canonical transcript", "Three-layer canonical transcript"),
        p("pi-textbook checkpoint 03 强调：transcript 是<strong>唯一真相源</strong>；LLM 请求是投影；TUI 是另一个投影。fork 会话时只复制 AgentMessage 链。", "Textbook checkpoint 03: transcript is the <strong>single source of truth</strong>; LLM request is a projection; TUI is another. Session fork copies AgentMessage chain only."),
        formula("投影", "PROJECTION", [
            '<span class="term">AgentMessage[]</span> — canonical',
            '<span class="term-cu">convertToLlm()</span> → Message[]',
            '<span class="term">renderMessage()</span> → TUI cells',
        ], "主线 prompt 在三层各出现一次", "Through-line prompt appears once per layer"),
        viz_message_layers(),
        textbook_ref("03"),
    )


def chapter_c10() -> str:
    return join(
        p("<code>runLoop</code> 是 agent 的心脏：<strong>外环</strong>处理 follow-up 队列（用户在你以为结束时又发了一条），<strong>内环</strong>处理 tool batch 和 steering 注入。", "<code>runLoop</code> is the agent heart: <strong>outer loop</strong> handles follow-up queue; <strong>inner loop</strong> handles tool batch and steering injection."),
        src("loop", "packages/agent/src/agent-loop.ts", [
            '<span class="src-comment">// Outer loop: continues when queued follow-up messages arrive</span>',
            '<span class="src-kw">while</span> (<span class="src-num">true</span>) {',
            '  <span class="src-comment">// Inner loop: process tool calls and steering</span>',
            '  <span class="src-kw">while</span> (hasMoreToolCalls || pendingMessages.length > 0) {',
            '    <span class="src-kw">const</span> message = <span class="src-kw">await</span> <span class="src-fn">streamAssistantResponse</span>(...);',
            "  }",
            "}",
        ]),
        h3("主线 prompt 的两圈 model stream", "Two model streams for through-line prompt"),
        viz_runloop_twin(),
        ladder([
            ("Turn 1", "user → assistant(toolUse: read)"),
            ("Tool batch", "executeTool(read) → toolResult"),
            ("Turn 2", "context+result → assistant(stop)"),
        ]),
        sp([
            ("外环退出条件", "Outer exit", "无 follow-up 且内环完成", "no follow-up and inner loop done"),
            ("内环继续条件", "Inner continue", "stopReason=toolUse 或 pending steering", "stopReason=toolUse or pending steering"),
            ("streamFn 注入", "streamFn inject", "测试用 ScriptedModel 替换", "ScriptedModel for tests"),
        ]),
        event_table([
            ("turn_start", "每圈 model 前", "before each model round"),
            ("message_update", "text_delta / toolcall_delta", "streaming deltas"),
            ("turn_end", "assistant 定稿后", "after assistant finalized"),
        ]),
        textbook_ref("07"),
        pull("外环是耐心。<br>内环是纪律。", "Outer loop is patience.<br>Inner loop is discipline."),
    )


def chapter_c11() -> str:
    return join(
        p("<strong>Steering</strong>：运行中用户插入新消息（内环下一轮前注入）。<strong>Follow-up</strong>：agent 即将停止时队列里的后续消息（外环重启）。", "<strong>Steering</strong>: user inserts mid-run (injected before next inner round). <strong>Follow-up</strong>: queued messages when agent would stop (outer loop restarts)."),
        src("steer", "packages/agent/src/agent-loop.ts", [
            '<span class="src-kw">let</span> pendingMessages = (<span class="src-kw">await</span> config.<span class="src-fn">getSteeringMessages</span>?.()) || [];',
            '<span class="src-kw">if</span> (pendingMessages.length > 0) {',
            '  <span class="src-kw">for</span> (<span class="src-kw">const</span> message <span class="src-kw">of</span> pendingMessages) { ... }',
            "}",
        ]),
        cmp(["机制", "触发时机", "典型场景"], [
            ["Steering", "内环每轮前", "「别读 README 了，先 ls」"],
            ["Follow-up", "外环 would-stop", "批量任务第二条命令"],
            ["Abort", "AbortSignal", "Ctrl+C · 扩展取消"],
        ]),
        h3("Case study：read 中途改主意", "Case study: change mind mid-read"),
        p("用户发出主线 prompt 后，模型开始 toolUse read；用户在 TUI 里输入 steering「先列出目录」。内环在 executeTool 前收到 pendingMessages，注入 user 消息，可能改变 tool 选择。", "After through-line prompt, model starts toolUse read; user steers «list directory first». Inner loop receives pendingMessages before executeTool, may change tool choice."),
        textbook_ref("09"),
    )


def chapter_c12() -> str:
    return join(
        p("模型返回 toolUse 后，<code>executeTools</code> 按 <code>parallel</code> 或 <code>sequential</code> 策略调度。read/write/edit/bash 各有 executor；结果超长时 <code>truncateToolResult</code> 截断。", "After model returns toolUse, <code>executeTools</code> dispatches per <code>parallel</code> or <code>sequential</code> policy. read/write/edit/bash have executors; oversized results hit <code>truncateToolResult</code>."),
        src("tools", "packages/coding-agent/src/core/tools/index.ts", [
            '<span class="src-kw">export const</span> <span class="src-arg">CODING_TOOLS</span> = [readTool, writeTool, editTool, bashTool, ...];',
        ]),
        src("exec", "packages/agent/src/agent-loop.ts", [
            '<span class="src-kw">async function</span> <span class="src-fn">executeToolCalls</span>(...)',
            '  <span class="src-comment">// validateToolArguments → execute → normalize images</span>',
        ]),
        cmp(["Tool", "并行安全?", "主线用例"], [
            ["read", "✓", "README.md"],
            ["bash", "△", "需确认"],
            ["write/edit", "✗ sequential", "—"],
        ]),
        h3("read README 的完整路径", "Full path of read README"),
        ladder([
            ("validateToolArguments", '{ "path": "README.md" }'),
            ("resolvePath(cwd)", "绝对路径"),
            ("readFileSync", "UTF-8 内容"),
            ("truncate if needed", "默认 max length"),
            ("toolResult AgentMessage", "toolCallId=call_1"),
        ]),
        textbook_ref("06"),
        textbook_ref("08"),
    )


def chapter_c13() -> str:
    events = [
        "agent_start", "turn_start", "message_start", "message_update", "message_end",
        "tool_execution_start", "tool_execution_update", "tool_execution_end",
        "turn_end", "agent_end",
    ]
    rows = [[e, "AgentSession 订阅者", "TUI / JSONL / Extension"] for e in events]
    return join(
        p("agent-core 通过 <code>AgentEvent</code> tagged union 广播状态变化。<code>message_update</code> 携带 <code>text_delta</code> 或 <code>toolcall_delta</code>——TUI 差分渲染的唯一输入。", "agent-core broadcasts state via <code>AgentEvent</code> tagged union. <code>message_update</code> carries <code>text_delta</code> or <code>toolcall_delta</code> — sole input for TUI differential render."),
        cmp(["事件", "订阅者", "副作用"], rows),
        src("events", "packages/agent/src/types.ts", [
            '<span class="src-kw">export type</span> <span class="src-cls">AgentEvent</span> =',
            '  | { <span class="src-arg">type</span>: <span class="src-str">"message_update"</span>; <span class="src-arg">message</span>: ...; <span class="src-arg">delta</span>: ... }',
            '  | { <span class="src-arg">type</span>: <span class="src-str">"tool_execution_start"</span>; ... };',
        ]),
        h3("主线一轮的事件顺序", "Event order for one through-line turn"),
        p("简化版：agent_start → turn_start → message_start(user) → message_end(user) → message_update×N → message_end(assistant) → tool_execution_* → message_update×M → message_end(assistant) → turn_end → agent_end。", "Simplified: agent_start → turn_start → message_start(user) → … → agent_end."),
        viz_event_swimlane(),
        textbook_ref("01"),
        textbook_ref("02"),
    )


def chapter_c14() -> str:
    return join(
        p("<code>pi-ai</code> 抽象 40+ provider：<code>Models</code> 目录 · <code>createProvider</code> 工厂 · <code>streamSimple</code> 统一流式入口。agent-loop 只依赖 <code>StreamFn</code> 签名。", "<code>pi-ai</code> abstracts 40+ providers: <code>Models</code> catalog · <code>createProvider</code> factory · <code>streamSimple</code> unified streaming entry. agent-loop depends only on <code>StreamFn</code> signature."),
        src("stream", "packages/ai/src/stream.ts", [
            '<span class="src-kw">export async function</span> <span class="src-fn">streamSimple</span>(<span class="src-arg">model</span>, <span class="src-arg">context</span>, <span class="src-arg">options</span>)',
        ]),
        src("models", "packages/ai/src/models.ts", [
            '<span class="src-kw">export const</span> <span class="src-arg">Models</span> = { ... }; <span class="src-comment">// models.generated.ts</span>',
        ]),
        cmp(["Provider 族", "认证", "流式协议"], [
            ["OpenAI-compatible", "API key", "SSE"],
            ["Anthropic", "API key", "SSE events"],
            ["OAuth (Kimi etc.)", "OAuth token", "provider-specific"],
        ]),
        textbook_ref("05"),
    )


def chapter_c15() -> str:
    return join(
        p("<code>EventStream&lt;T&gt;</code> 同时交付<strong>过程项</strong>（delta）和<strong>终态</strong>（done）。TUI 订阅过程项；agent-loop 等待终态 AssistantMessage。", "<code>EventStream&lt;T&gt;</code> delivers both <strong>progress items</strong> (deltas) and <strong>terminal state</strong> (done). TUI subscribes to progress; agent-loop awaits terminal AssistantMessage."),
        src("es", "packages/ai/src/utils/event-stream.ts", [
            '<span class="src-kw">export class</span> <span class="src-cls">EventStream</span>&lt;TEvent, TResult&gt; {',
            '  <span class="src-fn">push</span>(event: TEvent): <span class="src-cls">void</span>;',
            '  <span class="src-fn">end</span>(result: TResult): <span class="src-cls">void</span>;',
            "}",
        ]),
        cmp(["事件", "消费者", "主线时刻"], [
            ["text_delta", "TUI Markdown", "最终回答流式显示"],
            ["toolcall_delta", "TUI tool 卡片", "read 参数组装"],
            ["done", "agent-loop", "stopReason 判定"],
        ]),
        textbook_ref("02"),
    )


def chapter_c16() -> str:
    return join(
        p("<code>models.generated.ts</code> 由脚本从模型目录生成；OAuth 流程把 token 存 agent dir。无 key 时 <code>formatNoApiKeyFoundMessage</code> 给可操作的引导。", "<code>models.generated.ts</code> is script-generated from model catalog; OAuth stores tokens in agent dir. Without keys, <code>formatNoApiKeyFoundMessage</code> gives actionable guidance."),
        src("auth", "packages/coding-agent/src/core/auth-guidance.ts", [
            '<span class="src-kw">export function</span> <span class="src-fn">formatNoApiKeyFoundMessage</span>(...)',
        ]),
        sp([
            ("ModelRegistry", "ModelRegistry", "解析 model id → Model 对象", "resolve model id → Model object"),
            ("thinking level", "thinking level", "clamped per model capability", "clamped per model capability"),
            ("retry", "retry", "isRetryableAssistantError + backoff", "isRetryableAssistantError + backoff"),
        ]),
    )


def chapter_c17() -> str:
    return join(
        p("Pi TUI 用 <strong>CSI 2026</strong> 差分更新：<code>firstChanged</code> 到 <code>lastChanged</code> 行重绘，而非全屏刷新。流式 token 因此不闪烁。", "Pi TUI uses <strong>CSI 2026</strong> differential updates: redraw <code>firstChanged</code> to <code>lastChanged</code> lines, not full screen. Streaming tokens don't flicker."),
        src("tui", "packages/tui/src/tui.ts", [
            '<span class="src-comment">// SGR 2026 — synchronized output / damage tracking</span>',
            '<span class="src-fn">render</span>(<span class="src-arg">firstChanged</span>, <span class="src-arg">lastChanged</span>): <span class="src-cls">void</span>',
        ]),
        cmp(["策略", "全屏刷新", "差分渲染"], [
            ["带宽", "O(screen)", "O(changed lines)"],
            ["闪烁", "明显", "minimal"],
            ["实现复杂度", "低", "需 damage tracking"],
        ]),
        h3("message_update → 像素", "message_update → pixels"),
        p("AgentSession 把 message_update 交给 interactive mode → TUI 组件树 → Markdown 增量解析 → 终端 write。", "AgentSession hands message_update to interactive mode → TUI component tree → incremental Markdown → terminal write."),
        viz_tui_diff(),
    )


def chapter_c18() -> str:
    return join(
        p("Interactive mode 组合 <code>Editor</code>（输入）、<code>Markdown</code>（输出）、<code>tool renderers</code>（read 结果预览）。主线 prompt 在 Editor 提交，最终结果在 Markdown 区滚动。", "Interactive mode composes <code>Editor</code> (input), <code>Markdown</code> (output), <code>tool renderers</code> (read preview). Through-line prompt submits from Editor; final answer scrolls in Markdown area."),
        src("editor", "packages/tui/src/components/editor.ts", [
            '<span class="src-kw">export class</span> <span class="src-cls">Editor</span> <span class="src-kw">extends</span> <span class="src-cls">Component</span> { ... }',
        ]),
        sp([
            ("Alt-screen", "Alt-screen", "全屏 TUI 不污染 scrollback", "fullscreen TUI preserves scrollback"),
            ("keybindings", "keybindings", "可配置 · 与 readline 不同", "configurable · unlike readline"),
            ("tool 卡片", "tool cards", "read 显示路径+行数", "read shows path + line count"),
        ]),
    )


def chapter_c19() -> str:
    return join(
        p("扩展通过 <code>registerTool</code> · <code>registerCommand</code> · 事件 hook 注入能力——无需 MCP，同进程 TypeScript。", "Extensions inject via <code>registerTool</code> · <code>registerCommand</code> · event hooks — no MCP, same-process TypeScript."),
        src("ext", "packages/coding-agent/src/core/extensions/types.ts", [
            '<span class="src-kw">export interface</span> <span class="src-cls">ExtensionAPI</span> {',
            '  <span class="src-fn">registerTool</span>(def: <span class="src-cls">ToolDefinition</span>): <span class="src-cls">void</span>;',
            '  <span class="src-fn">on</span>(<span class="src-arg">event</span>, <span class="src-arg">handler</span>): <span class="src-cls">void</span>;',
            "}",
        ]),
        cmp(["Hook", "时机", "用例"], [
            ["session_start", "会话加载", "恢复扩展状态"],
            ["before_compact", "压缩前", "保留 artifact 索引"],
            ["tool_execution_end", "工具后", "自动 lint"],
        ]),
        viz_extension_hooks(),
        textbook_ref("12"),
    )


def chapter_c20() -> str:
    return join(
        p("<code>ExtensionRunner</code> 用 <code>jiti</code> 动态加载扩展 TS，合并事件处理器，在 agent 生命周期关键点注入 hook。", "<code>ExtensionRunner</code> uses <code>jiti</code> to load extension TS, merges event handlers, injects hooks at agent lifecycle points."),
        src("runner", "packages/coding-agent/src/core/extensions/runner.ts", [
            '<span class="src-kw">export class</span> <span class="src-cls">ExtensionRunner</span> {',
            '  <span class="src-kw">async</span> <span class="src-fn">loadExtensions</span>(paths: <span class="src-cls">string</span>[]): <span class="src-cls">Promise</span>&lt;<span class="src-cls">void</span>&gt;',
            "}",
        ]),
        h3("事件合并语义", "Event merge semantics"),
        p("多个扩展可订阅同一事件；Runner 按加载顺序调用；<code>before_compact</code> 可返回修改后的 summary。", "Multiple extensions can subscribe; Runner calls in load order; <code>before_compact</code> can return modified summary."),
        textbook_ref("13"),
    )


def chapter_c21() -> str:
    return join(
        p("<code>pi package</code> 命令管理可分享的 harness 能力包——npm 或 git 依赖，把工具+扩展+资源打包分发。", "<code>pi package</code> manages shareable harness capability bundles — npm or git deps packaging tools+extensions+resources."),
        cmp(["分发", "格式", "消费者"], [
            ["npm", "package.json + pi manifest", "pi install"],
            ["git", "repo URL + ref", "pi package add"],
            ["local", "path", "开发调试"],
        ]),
        note("扩展生态替代 MCP 市场——类型安全，但门槛是写 TypeScript。", "Extension ecosystem replaces MCP marketplace — type-safe, but requires writing TypeScript."),
    )


def chapter_c22() -> str:
    return join(
        p("每个会话是 JSONL 文件：<code>parentId</code> 链构成树，<code>leafId</code> 指向当前叶节点，<code>fork</code> 创建 <code>parentSession</code> 子会话。", "Each session is a JSONL file: <code>parentId</code> chain forms tree, <code>leafId</code> points to current leaf, <code>fork</code> creates child with <code>parentSession</code>."),
        viz_session_tree(),
        src("sm", "packages/coding-agent/src/core/session-manager.ts", [
            '<span class="src-kw">export const</span> <span class="src-arg">CURRENT_SESSION_VERSION</span> = <span class="src-num">3</span>;',
            '<span class="src-kw">export interface</span> <span class="src-cls">SessionMessageEntry</span> {',
            '  <span class="src-arg">type</span>: <span class="src-str">"message"</span>; <span class="src-arg">parentId</span>: <span class="src-cls">string</span> | <span class="src-kw">null</span>;',
            "}",
        ]),
        h3("主线 prompt 落盘后的 JSONL 行", "JSONL lines after through-line prompt"),
        src("jsonl", "~/.pi/sessions/*.jsonl", [
            '{"type":"session","id":"...","cwd":"/path/to/project"}',
            '{"type":"message","parentId":null,"message":{"role":"user","content":"读取 README.md..."}}',
            '{"type":"message","parentId":"...","message":{"role":"assistant","stopReason":"toolUse",...}}',
        ]),
        cmp(["Entry type", "用途", "LLM 可见?"], [
            ["message", "user/assistant/tool", "✓"],
            ["compaction", "压缩摘要", "✓（替换早期）"],
            ["branch_summary", "fork 摘要", "△"],
            ["model_change", "审计", "✗"],
        ]),
        textbook_ref("10"),
    )


def chapter_c23() -> str:
    return join(
        p("<strong>Compaction</strong>：上下文超阈值时，历史消息<strong>不动</strong>（JSONL 完整保留），但<strong>重建</strong>发给模型的 context——用 LLM 生成摘要替换早期消息。", "<strong>Compaction</strong>: when context exceeds threshold, history <strong>stays</strong> in JSONL but <strong>rebuilt</strong> context for model — LLM summary replaces early messages."),
        src("compact", "packages/coding-agent/src/core/compaction/index.ts", [
            '<span class="src-kw">export async function</span> <span class="src-fn">compact</span>(...): <span class="src-cls">Promise</span>&lt;<span class="src-cls">CompactionResult</span>&gt;',
            '<span class="src-kw">export function</span> <span class="src-fn">shouldCompact</span>(tokens: <span class="src-cls">number</span>): <span class="src-cls">boolean</span>',
        ]),
        sp([
            ("历史", "History", "JSONL 永不删", "JSONL never deleted"),
            ("上下文", "Context", "压缩后变短", "shorter after compact"),
            ("SQLite lanes", "SQLite lanes", "扩展可存 artifact 索引", "extensions store artifact index"),
        ]),
        h3(".harness 与 compaction 分工", "Harness vs compaction roles"),
        p("agent-loop 不管 token 数；AgentSession 在 turn_end 检查 shouldCompact；扩展可在 before_compact 注入结构化摘要。", "agent-loop ignores token count; AgentSession checks shouldCompact at turn_end; extensions inject structured summary in before_compact."),
        viz_compaction(),
        textbook_ref("11"),
    )


def chapter_c24() -> str:
    return join(
        p("对比三条路线：Claude Code（密封 CLI + MCP）、Cursor（密封 IDE + 全生态）、Pi（开源 harness + 终端 + JSONL）。", "Three routes: Claude Code (sealed CLI + MCP), Cursor (sealed IDE + ecosystem), Pi (open harness + terminal + JSONL)."),
        cmp(["维度", "Claude Code", "Cursor", "Pi"], [
            ["目标用户", "开箱即用", "IDE 用户", "想读源码的人"],
            ["会话", "专有云", "专有", "本地 JSONL 树"],
            ["扩展", "MCP", "VS Code", "TS Extension API"],
            ["可观测", "低", "低", "高（每事件可 log）"],
            ["主线 prompt 可 trace", "✗", "✗", "✓ --verbose"],
        ]),
        h3("设计取舍表", "Design trade-off table"),
        p("Pi 牺牲：一键 MCP 市场、GUI 权限、IDE 集成。Pi 获得：fork 会话、RPC 嵌入、完整事件日志、教学友好的代码体积。", "Pi sacrifices: one-click MCP, GUI permissions, IDE integration. Pi gains: fork sessions, RPC embed, full event log, teachable code size."),
        note("不是「哪个更好」——是「你要闭包体验还是开卷考试」。", "Not «which is better» — «do you want closed-loop UX or open-book exam».", copper=True),
    )


def chapter_c25() -> str:
    return join(
        p("<code>--mode rpc</code> 把 AgentSession 变成 JSONL 帧协议：stdin 收命令，stdout 吐事件。远程场景用 pi-server + CBOR。", "<code>--mode rpc</code> turns AgentSession into JSONL frame protocol: stdin commands, stdout events. Remote uses pi-server + CBOR."),
        src("rpc", "packages/coding-agent/src/modes/rpc/", [
            '<span class="src-comment">// {"type":"prompt","text":"读取 README.md..."}</span>',
            '<span class="src-comment">// → AgentEvent stream on stdout</span>',
        ]),
        cmp(["模式", "传输", "用例"], [
            ["rpc", "JSONL stdin/out", "CI · 脚本"],
            ["pi-server", "HTTP + CBOR", "远程 harness"],
            ["interactive", "TUI", "日常开发"],
        ]),
    )


def chapter_c26() -> str:
    return join(
        p("自己 trace 主线 prompt 的三件套：<code>pi --verbose</code> 看 AgentEvent、打开 JSONL 会话文件、对照 pi-textbook workshop 测试。", "Trace the through-line yourself: <code>pi --verbose</code> for AgentEvents, open JSONL session file, compare pi-textbook workshop tests."),
        ladder([
            ("pi --verbose", "stderr 打印完整事件流"),
            ("~/.pi/sessions/", "找到最新 .jsonl"),
            ("agent-loop.test.ts", "对照单元测试"),
            ("workshop/test/agent-loop.test.ts", "pi-textbook 离线复现"),
        ]),
        src("verbose", "terminal", [
            '$ pi --verbose',
            '$ <span class="src-str">读取 README.md，用一句话告诉我这个项目做什么</span>',
            '<span class="src-comment">// agent_start → turn_start → message_update → ...</span>',
        ]),
        h3("推荐阅读顺序", "Suggested reading order"),
        p("1. pi-textbook checkpoint 00 七里程碑 → 2. pi-mono agent-loop.ts runLoop → 3. agent-session.ts prompt() → 4. 本文 C02 22 站地图。", "1. pi-textbook cp 00 seven milestones → 2. pi-mono agent-loop.ts runLoop → 3. agent-session.ts prompt() → 4. this article C02 22-station map."),
        pull(
            "读完之后，用一句话回答：<br>「读取 README.md，用一句话告诉我这个项目做什么」——<br>在 Pi 里，这句话究竟触发了什么？",
            "After reading, answer in one sentence:<br>«read README.md and tell me what this project does in one sentence» —<br>what exactly does that line trigger in Pi?",
        ),
        note("答案应该能指出：AgentSession.prompt → agentLoop → 两次 streamSimple → read tool → JSONL append → TUI message_update。", "Answer should cite: AgentSession.prompt → agentLoop → two streamSimple → read tool → JSONL append → TUI message_update."),
    )
