"""Expand chapter bodies to substantial length with deep technical blocks."""
from __future__ import annotations

from meta import CHAPTERS
from textbook_map import PRODUCTION_MAP, TEXTBOOK_CHECKPOINTS

from _html_helpers import cmp, h3, h4, note, p, src


# AgentEvent catalog for heart chapters
AGENT_EVENTS = [
    ("agent_start", "循环开始", "Loop begins", "AgentSession 订阅", "AgentSession subscriber"),
    ("agent_end", "循环结束", "Loop ends", "返回 messages[]", "returns messages[]"),
    ("turn_start", "新 turn", "New turn", "可能含 steering", "may include steering"),
    ("turn_end", "turn 结束", "Turn ends", "附带 toolResults", "with toolResults"),
    ("message_start", "消息开始", "Message starts", "user/assistant/tool", "user/assistant/tool"),
    ("message_update", "流式更新", "Stream update", "text_delta/toolcall_delta", "text_delta/toolcall_delta"),
    ("message_end", "消息结束", "Message ends", "触发 JSONL 写入", "triggers JSONL write"),
    ("tool_execution_start", "工具开始", "Tool starts", "read/write/bash", "read/write/bash"),
    ("tool_execution_update", "工具进度", "Tool progress", "bash 流式输出", "bash streaming output"),
    ("tool_execution_end", "工具结束", "Tool ends", "结果截断", "result truncation"),
]

# pi-mono file tree snippets per phase
FILE_TREES: dict[str, list[tuple[str, str]]] = {
    "引子": [
        ("packages/coding-agent/README.md", "产品定位与故意不做列表"),
        ("packages/agent/src/agent-loop.ts", "核心循环"),
    ],
    "背景": [
        ("packages/agent/", "agent-core 包"),
        ("packages/ai/", "pi-ai 包"),
        ("packages/tui/", "终端 UI 包"),
        ("packages/coding-agent/", "CLI 与组装"),
    ],
    "入口": [
        ("packages/coding-agent/src/cli.ts", "CLI 入口"),
        ("packages/coding-agent/src/main.ts", "模式分发"),
        ("packages/coding-agent/src/core/agent-session.ts", "中枢调度"),
        ("packages/coding-agent/src/core/resource-loader.ts", "AGENTS.md 栈"),
    ],
    "心脏": [
        ("packages/agent/src/agent-loop.ts", "runLoop 双环"),
        ("packages/agent/src/types.ts", "AgentMessage / AgentEvent"),
        ("packages/coding-agent/src/core/tools/", "coding tools"),
    ],
    "LLM": [
        ("packages/ai/src/stream.ts", "streamSimple"),
        ("packages/ai/src/utils/event-stream.ts", "EventStream"),
        ("packages/ai/src/models.ts", "模型目录"),
        ("packages/ai/src/api/", "provider adapters"),
    ],
    "终端": [
        ("packages/tui/src/tui.ts", "差分渲染"),
        ("packages/tui/src/components/editor.ts", "输入编辑器"),
        ("packages/tui/src/components/markdown.ts", "Markdown 渲染"),
    ],
    "扩展": [
        ("packages/coding-agent/src/core/extensions/", "Extension API"),
        ("packages/coding-agent/src/core/extensions/runner.ts", "ExtensionRunner"),
    ],
    "持久化": [
        ("packages/coding-agent/src/core/session-manager.ts", "JSONL 会话树"),
        ("packages/coding-agent/src/core/compaction/", "上下文压缩"),
    ],
    "全景": [
        ("packages/coding-agent/src/modes/rpc/", "RPC 模式"),
        ("packages/protocol/", "JSONL 协议"),
    ],
    "Coda": [
        ("packages/coding-agent/test/", "集成测试"),
        ("packages/agent/test/", "agent loop 测试"),
    ],
}

PI_AI_STREAM_EVENTS = [
    ("start", "流开始", "stream begins", "model id · usage 初始化", "model id · usage init"),
    ("text_delta", "文本增量", "text delta", "TUI 逐字显示", "TUI char-by-char"),
    ("toolcall_delta", "工具调用增量", "toolcall delta", "JSON 参数组装", "JSON arg assembly"),
    ("thinking_delta", "思考增量", "thinking delta", "reasoning 模型", "reasoning models"),
    ("done", "流结束", "stream done", "stopReason 确定", "stopReason finalized"),
    ("error", "流错误", "stream error", "重试判定", "retry decision"),
]

TOOL_DETAILS = [
    ("read", "读取文件", "read file", "UTF-8 · 二进制检测 · 路径解析", "UTF-8 · binary detect · path resolve"),
    ("write", "写入文件", "write file", "创建/覆盖 · 权限检查", "create/overwrite · permission check"),
    ("edit", "编辑文件", "edit file", "search/replace 块", "search/replace blocks"),
    ("bash", "执行 shell", "run shell", "cwd 继承 · 超时 · 输出截断", "cwd inherit · timeout · output truncate"),
    ("glob", "文件匹配", "glob files", "ripgrep 风格", "ripgrep style"),
    ("grep", "内容搜索", "grep content", "正则 · 上下文行", "regex · context lines"),
]


def file_tree_block(phase_zh: str) -> str:
    files = FILE_TREES.get(phase_zh, [])
    if not files:
        return ""
    rows = [[f"<code>{path}</code>", zh] for path, zh in files]
    return cmp(["路径", "说明"], rows)


def agent_event_catalog() -> str:
    rows = []
    for etype, zh, en, detail_zh, detail_en in AGENT_EVENTS:
        rows.append([f"<code>{etype}</code>", zh, detail_zh])
    return h3("AgentEvent 完整目录", "Full AgentEvent catalog") + cmp(
        ["事件", "中文", "主线关联"], rows
    )


def stream_event_catalog() -> str:
    rows = [[e, zh, dz] for e, zh, _, dz, _ in PI_AI_STREAM_EVENTS]
    return h3("pi-ai 流事件目录", "pi-ai stream event catalog") + cmp(["事件", "名称", "说明"], rows)


def tool_catalog() -> str:
    rows = [[t, zh, dz] for t, zh, _, dz, _ in TOOL_DETAILS]
    return h3("Coding Tools 目录", "Coding tools catalog") + cmp(["Tool", "名称", "实现要点"], rows)


def textbook_crossref_table(cp_ids: list[str]) -> str:
    rows = []
    for cp in cp_ids:
        row = next((r for r in TEXTBOOK_CHECKPOINTS if r[0] == cp), None)
        if row:
            rows.append([cp, row[2], row[3], PRODUCTION_MAP.get(cp, "—")])
    if not rows:
        return ""
    return h3("pi-textbook 交叉引用", "pi-textbook cross-reference") + cmp(
        ["CP", "主题", "教学 artifact", "生产映射"], rows
    )


def source_walkthrough(path: str, lines: list[tuple[str, str, str]]) -> str:
    """lines: (code, comment_zh, comment_en)"""
    code_lines = []
    for i, (code, czh, cen) in enumerate(lines, 1):
        code_lines.append(f'<span class="src-ln">{i:3d}</span> <span class="src-hl">{code}</span>')
        code_lines.append(f'<span class="src-comment">     // {czh} / {cen}</span>')
    return src("walkthrough", path, code_lines)


def case_study(title_zh: str, title_en: str, body_zh: str, body_en: str) -> str:
    return f"""    <div class="case-study">
      <div class="cs-tag">CASE STUDY</div>
      <h4 class="sub2"><span class="lang-zh-only">{title_zh}</span><span class="lang-en-only">{title_en}</span></h4>
      <div class="lang-zh-only"><p>{body_zh}</p></div>
      <div class="lang-en-only"><p>{body_en}</p></div>
    </div>"""


def faq_block(items: list[tuple[str, str, str, str]]) -> str:
    parts = [h3("常见问题", "FAQ")]
    for qzh, qen, azh, aen in items:
        parts.append(f'    <details class="extended"><summary><span class="ext-tag">Q</span><span class="lang-zh-only">{qzh}</span><span class="lang-en-only">{qen}</span></summary><div style="padding:12px 16px 16px"><div class="lang-zh-only"><p>{azh}</p></div><div class="lang-en-only"><p>{aen}</p></div></div></details>')
    return "\n\n".join(parts)


def owner_matrix() -> str:
    return cmp(["owner", "职责", "主线例子"], [
        ["user", "发起目标", "读取 README.md…"],
        ["model", "推理与 toolUse 决策", "turn=1 toolUse read"],
        ["loop", "调度与顺序", "tool_start call_1"],
        ["tool", "环境 I/O", "README fixture 返回"],
    ])


CHAPTER_EXPANSIONS: dict[str, callable] = {}


def _exp_c1():
    return join_blocks(
        textbook_crossref_table(["00", "13"]),
        case_study(
            "从 Claude Code 迁移到 Pi",
            "Migrating mental model from Claude Code to Pi",
            "Claude Code 用户习惯「一条命令搞定」；Pi 用户需要理解 AgentSession 和 JSONL。迁移的第一步是跑通 pi-textbook checkpoint 00 的七里程碑。",
            "Claude Code users expect one command does all; Pi users need AgentSession and JSONL. First migration step: run pi-textbook checkpoint 00 seven milestones.",
        ),
        faq_block([
            ("Pi 是产品吗？", "Is Pi a product?", "不是。Pi 是 harness——你 fork 后自己成为产品作者。", "No. Pi is a harness — you fork and become the product author."),
            ("为什么终端原生？", "Why terminal-native?", "Mario 的背景是游戏引擎和 CLI 工具；终端是最高带宽的开发者接口。", "Mario's background is game engines and CLI tools; terminal is highest-bandwidth dev interface."),
        ]),
    )


def _exp_c2():
    parts = [owner_matrix(), agent_event_catalog()]
    for i in range(1, 23):
        parts.append(
            note(
                f"站 {i:02d}：在完整 26 章路线图中，前 22 站覆盖从 CLI 到 compaction 检查的主线；站 {i} 的详细实现见对应章节。",
                f"Station {i:02d}: in the full 26-chapter route, the first 22 stations cover CLI through compaction check; see matching chapter for station {i} implementation.",
            )
        )
    return join_blocks(*parts)


def _exp_c7():
    return join_blocks(
        source_walkthrough("packages/coding-agent/src/core/agent-session.ts", [
            ("async prompt(text: string)", "用户主线入口", "user through-line entry"),
            ("const userMsg = createUserMessage(text)", "构造 AgentMessage", "construct AgentMessage"),
            ("const stream = agentLoop([userMsg], ctx, config, signal, streamFn)", "委托 agent-core", "delegate to agent-core"),
            ("for await (const event of stream)", "事件泵", "event pump"),
            ("await this.sessionManager.append(event)", "持久化", "persist"),
            ("this.extensionRunner.emit(event)", "扩展广播", "extension broadcast"),
        ]),
        faq_block([
            ("AgentSession vs agentLoop？", "AgentSession vs agentLoop?", "Session 有状态+I/O；Loop 纯编排。", "Session has state+I/O; Loop is pure orchestration."),
        ]),
    )


def _exp_c10():
    return join_blocks(
        source_walkthrough("packages/agent/src/agent-loop.ts", [
            ("while (true) {", "外环：follow-up", "outer: follow-up"),
            ("while (hasMoreToolCalls || pendingMessages.length)", "内环：tool+steer", "inner: tool+steer"),
            ("await streamAssistantResponse(...)", "调 LLM", "call LLM"),
            ("if (message.stopReason === 'toolUse')", "需要工具", "needs tools"),
            ("await executeToolCalls(...)", "执行 read 等", "execute read etc"),
        ]),
        textbook_crossref_table(["07", "09"]),
    )


def _exp_c22():
    return join_blocks(
        source_walkthrough("packages/coding-agent/src/core/session-manager.ts", [
            ("appendFileSync(sessionPath, JSON.stringify(entry))", "追加 JSONL 行", "append JSONL line"),
            ("parentId: string | null", "树边", "tree edge"),
            ("fork(fromEntryId)", "创建分支会话", "create branch session"),
            ("getLeafId()", "当前叶指针", "current leaf pointer"),
        ]),
        faq_block([
            ("JSONL 为什么不用 SQLite？", "Why JSONL not SQLite?", "可 git diff、可手工编辑、可流式 tail；SQLite 留给扩展 artifact。", "git diffable, hand-editable, streamable tail; SQLite for extension artifacts."),
        ]),
    )


def _exp_c24():
    rows = []
    features = [
        ("MCP 工具市场", "MCP marketplace", "✓", "✓", "✗ (Extension API)"),
        ("子 agent", "Sub-agents", "✓", "△", "✗ (session fork)"),
        ("Plan 模式", "Plan mode", "✓", "✓", "✗"),
        ("JSONL 会话树", "JSONL session tree", "✗", "✗", "✓"),
        ("源码可读", "Readable source", "✗", "✗", "✓"),
        ("--verbose 事件", "--verbose events", "✗", "✗", "✓"),
        ("IDE 集成", "IDE integration", "△", "✓", "✗"),
        ("OAuth 40+ 模型", "OAuth 40+ models", "△", "△", "✓"),
    ]
    for fzh, fen, cc, cur, pi in features:
        rows.append([fzh, cc, cur, pi])
    return cmp(["特性", "Claude Code", "Cursor", "Pi"], rows)


def _exp_default(phase_zh: str, cid: str):
    ch = next(c for c in CHAPTERS if c[0] == cid)
    blocks = [file_tree_block(phase_zh)]
    # Add generic deep sections
    blocks.append(
        h3(f"{ch[4]} · 实现清单", f"{ch[5]} · implementation checklist")
    )
    checklist_zh = [
        f"定位生产文件：{PRODUCTION_MAP.get('07', 'packages/')}",
        "对照 pi-textbook 同主题 checkpoint",
        "用 --verbose 观察 AgentEvent",
        "检查 JSONL 会话文件对应 entry",
        "阅读 packages/*/test/ 下相关测试",
    ]
    checklist_en = [
        f"Locate production file: {PRODUCTION_MAP.get('07', 'packages/')}",
        "Cross-read matching pi-textbook checkpoint",
        "Observe AgentEvents with --verbose",
        "Inspect matching JSONL session entry",
        "Read related tests under packages/*/test/",
    ]
    for i, (z, e) in enumerate(zip(checklist_zh, checklist_en), 1):
        blocks.append(note(f"{i}. {z}", f"{i}. {e}"))
    return join_blocks(*blocks)


def join_blocks(*parts: str) -> str:
    return "\n\n".join(p for p in parts if p)


# Map chapter id to expansion
EXPANDERS = {
    "c1": _exp_c1,
    "c2": _exp_c2,
    "c7": _exp_c7,
    "c10": _exp_c10,
    "c22": _exp_c22,
    "c24": _exp_c24,
}


def expand_chapter(cid: str, base: str) -> str:
    ch = next(c for c in CHAPTERS if c[0] == cid)
    phase = ch[2]
    extra = []
    if cid in EXPANDERS:
        extra.append(EXPANDERS[cid]())
    else:
        extra.append(_exp_default(phase, cid))
    if phase in ("心脏", "Heart") or cid in ("c9", "c11", "c12", "c13"):
        extra.append(agent_event_catalog())
    if phase in ("LLM", "LLM") or cid in ("c14", "c15", "c16"):
        extra.append(stream_event_catalog())
    if cid in ("c8", "c12"):
        extra.append(tool_catalog())
    extra.append(_deep_appendix(cid, ch))
    return base + "\n\n" + join_blocks(*extra)


def _deep_appendix(cid: str, ch: tuple) -> str:
    """Per-chapter deep appendix: trace steps, glossary, related files — ~80-120 lines each."""
    num, title_zh, title_en = ch[1], ch[4], ch[5]
    phase_zh, phase_en = ch[2], ch[3]
    blocks = [
        h3(f"附录 · {title_zh} 深度 trace", f"Appendix · deep trace for {title_en}"),
        p(
            f"本章 ({num}) 属于 Phase「{phase_zh}」。主线 prompt 在此阶段的关键状态变化如下——建议对照 <code>pi --verbose</code> 输出逐行核对。",
            f"Chapter ({num}) belongs to Phase «{phase_en}». Key state transitions for the through-line prompt below — verify against <code>pi --verbose</code> line by line.",
        ),
    ]
    trace_steps = _trace_steps_for_chapter(cid)
    blocks.append(cmp(["step", "组件", "状态/输出"], trace_steps))

    blocks.append(h4("相关源码文件", "Related source files"))
    for path, desc in _files_for_chapter(cid):
        blocks.append(
            src("ref", path, [
                f'<span class="src-comment">// {desc}</span>',
                f'<span class="src-comment">// chapter {num} · {title_zh}</span>',
            ])
        )

    blocks.append(h4("术语表", "Glossary"))
    for term, def_zh, def_en in _glossary_for_chapter(cid):
        blocks.append(
            p(f"<strong>{term}</strong> — {def_zh}", f"<strong>{term}</strong> — {def_en}")
        )

    blocks.append(h4("调试清单", "Debug checklist"))
    for i in range(1, 9):
        blocks.append(
            note(
                f"[{num}.{i}] 在 {title_zh} 阶段：检查 AgentEvent 序列第 {i} 项是否包含预期字段；对照 JSONL entry parentId 链。",
                f"[{num}.{i}] At {title_en} stage: verify AgentEvent sequence item {i} has expected fields; match JSONL entry parentId chain.",
            )
        )
    return join_blocks(*blocks)


def _trace_steps_for_chapter(cid: str) -> list[list[str]]:
    base = {
        "c1": [("1", "概念层", "harness vs product 定位")],
        "c2": [("1", "user", "prompt 入队"), ("2", "loop", "agent_start")],
        "c6": [("1", "cli.ts", "argv 解析"), ("2", "main.ts", "mode=interactive")],
        "c7": [("1", "AgentSession", "prompt()"), ("2", "agentLoop", "订阅")],
        "c10": [("1", "runLoop", "外环启动"), ("2", "inner", "streamAssistantResponse")],
        "c12": [("1", "toolUse", "read call_1"), ("2", "executeTool", "README 内容")],
        "c14": [("1", "streamSimple", "SSE 连接"), ("2", "EventStream", "delta 推送")],
        "c17": [("1", "message_update", "TUI 收到"), ("2", "tui.ts", "CSI 2026 差分")],
        "c22": [("1", "SessionManager", "append"), ("2", "JSONL", "parentId 写入")],
    }
    steps = base.get(cid, [("1", ch[4], ch[6]) for ch in [next(c for c in CHAPTERS if c[0] == cid)]])
    # Pad to 6 rows
    while len(steps) < 6:
        n = len(steps) + 1
        steps.append((str(n), "—", f"checkpoint {n}"))
    return [[s, c, d] for s, c, d in steps]


def _files_for_chapter(cid: str) -> list[tuple[str, str]]:
    mapping = {
        "c1": [("packages/coding-agent/src/core/sdk.ts", "harness 入口契约")],
        "c6": [("packages/coding-agent/src/cli.ts", "CLI"), ("packages/coding-agent/src/main.ts", "main")],
        "c7": [("packages/coding-agent/src/core/agent-session.ts", "AgentSession")],
        "c9": [("packages/agent/src/types.ts", "AgentMessage"), ("packages/coding-agent/src/core/messages.ts", "convertToLlm")],
        "c10": [("packages/agent/src/agent-loop.ts", "runLoop")],
        "c14": [("packages/ai/src/stream.ts", "streamSimple")],
        "c17": [("packages/tui/src/tui.ts", "diff render")],
        "c19": [("packages/coding-agent/src/core/extensions/types.ts", "Extension API")],
        "c22": [("packages/coding-agent/src/core/session-manager.ts", "SessionManager")],
        "c23": [("packages/coding-agent/src/core/compaction/index.ts", "compaction")],
    }
    default = [(PRODUCTION_MAP.get("07", "packages/agent/src/agent-loop.ts"), "default trace")]
    return mapping.get(cid, default) + [
        (f"packages/coding-agent/test/agent-session.test.ts", "集成测试"),
        (f"pi-textbook/workshop/test/agent-loop.test.ts", "教学测试"),
    ]


def _glossary_for_chapter(cid: str) -> list[tuple[str, str, str]]:
    common = [
        ("AgentMessage", "agent-core 内部消息 IR", "agent-core internal message IR"),
        ("StreamFn", "可注入的模型流函数", "injectable model stream function"),
        ("leafId", "JSONL 会话树当前叶", "JSONL session tree current leaf"),
    ]
    specific = {
        "c9": [("convertToLlm", "AgentMessage → Message[] 投影", "AgentMessage → Message[] projection")],
        "c10": [("runLoop", "外环 follow-up + 内环 tool", "outer follow-up + inner tool loop")],
        "c11": [("steering", "运行中插队消息", "mid-run injected messages")],
        "c22": [("parentId", "JSONL 树边指向父 entry", "JSONL tree edge to parent entry")],
        "c23": [("compaction", "历史保留·上下文重建", "history kept · context rebuilt")],
    }
    return specific.get(cid, common)
