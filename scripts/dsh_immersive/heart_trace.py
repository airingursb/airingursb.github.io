"""Long-form deepseek-harness source traces for Heart + LLM chapters C09–C16."""
from __future__ import annotations

import html
import re
from pathlib import Path

from _html_helpers import cmp, join, note, p, src

DSH = Path("/tmp/deepseek-harness")
PROMPT_ZH = "读取 README.md，用一句话告诉我这个项目做什么"
PROMPT_EN = "read README.md and tell me what this project does in one sentence"

# ── helpers ──────────────────────────────────────────────────────────

_KW = re.compile(
    r"\b(async|await|export|function|const|let|return|if|else|for|while|"
    r"switch|case|break|continue|type|interface|import|from|new|throw|"
    r"typeof|undefined|null|true|false|private|readonly|class)\b"
)


def _hl(code: str) -> str:
    """Lightweight TS syntax highlight; protects // comments from later passes."""
    comments: list[str] = []

    def _stash_comment(m: re.Match[str]) -> str:
        comments.append(m.group(1))
        return f"\x00C{len(comments) - 1}\x00"

    s = html.escape(code)
    s = re.sub(r"(//.*)$", _stash_comment, s)
    s = re.sub(r"(`[^`]+`)", r'<span class="src-str">\1</span>', s)
    s = re.sub(r"('[^']*'|\"[^\"]*\")", r'<span class="src-str">\1</span>', s)
    s = _KW.sub(r'<span class="src-kw">\1</span>', s)
    for i, c in enumerate(comments):
        s = s.replace(f"\x00C{i}\x00", f'<span class="src-comment">{html.escape(c)}</span>')
    return s


def _read(rel: str, start: int, end: int) -> list[tuple[int, str]]:
    path = DSH / rel
    if not path.is_file():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    out: list[tuple[int, str]] = []
    for i in range(max(0, start - 1), min(end, len(lines))):
        out.append((i + 1, lines[i]))
    return out


def _annotated_trace(
    tag: str,
    rel: str,
    start: int,
    end: int,
    annotations: dict[int, tuple[str, str]],
    *,
    highlight_lines: set[int] | None = None,
) -> str:
    """Build numbered source block; annotations: line_no → (zh, en)."""
    rows = _read(rel, start, end)
    if not rows:
        return note(
            f"源码暂不可用：<code>{rel}</code>（需本地 deepseek-harness clone）",
            f"Source unavailable: <code>{rel}</code> (deepseek-harness clone required)",
            copper=True,
        )
    hl = highlight_lines or set()
    body: list[str] = []
    for ln, code in rows:
        mark = ' <span class="src-tag">◀ trace</span>' if ln in hl else ""
        ann = annotations.get(ln)
        body.append(
            f'      <span class="src-ln">{ln:4d}</span> <span class="src-hl">{_hl(code)}</span>{mark}'
        )
        if ann:
            body.append(
                f'      <span class="src-comment">     ↳ <span class="lang-zh-only">{ann[0]}</span>'
                f'<span class="lang-en-only">{ann[1]}</span></span>'
            )
    return src(tag, rel, body)


def _trace_header(num: str, zh: str, en: str) -> str:
    return f"""    <div class="trace-walk">
      <div class="tw-head">
        <span class="tw-tag">SOURCE TRACE · C{num}</span>
        <span class="lang-zh-only">{zh}</span>
        <span class="lang-en-only">{en}</span>
      </div>"""


def _trace_close() -> str:
    return "    </div>"


def _step_table(
    title_zh: str,
    title_en: str,
    rows: list[list[str]],
) -> str:
    return (
        f'    <div class="trace-steps">'
        f'<div class="ts-label"><span class="lang-zh-only">{title_zh}</span>'
        f'<span class="lang-en-only">{title_en}</span></div>'
        + cmp(["#", "location", "主线时刻 / through-line moment"], rows)
        + "</div>"
    )


# ── C09: session log + deriveMessages ────────────────────────────────

def _trace_c09() -> str:
    parts = [
        _trace_header(
            "09",
            f"主线 prompt「{PROMPT_ZH}」进入 session log 的第一站",
            f"Through-line prompt enters the session log",
        ),
        p(
            "DSH 的心脏契约写在 architecture.md：<strong>Model-visible means logged</strong>。"
            "任何进入模型请求的内容都必须能从 session log 重建。"
            "<code>Session.append()</code> 是唯一写入点；"
            "<code>deriveMessages()</code> 是唯一投影点——把 surface 上的 "
            "<code>user/message</code> · <code>assistant/message</code> · <code>tool/result</code> "
            "折叠成 <code>Message[]</code>。",
            "DSH's heart contract in architecture.md: <strong>Model-visible means logged</strong>. "
            "Anything reaching a model request must be reconstructable from the session log. "
            "<code>Session.append()</code> is the sole write site; "
            "<code>deriveMessages()</code> is the sole projection — folding surface "
            "<code>user/message</code> · <code>assistant/message</code> · <code>tool/result</code> "
            "into <code>Message[]</code>.",
        ),
        _annotated_trace(
            "append",
            "packages/core/session/src/index.ts",
            604,
            638,
            {
                604: ("★ append 入口：type + data + surfaceOp", "★ append entry: type + data + surfaceOp"),
                629: ("seq = log.length：连续序号不变量", "seq = log.length: contiguous seq invariant"),
                634: ("surfaceManager.validateNext：surface 契约在此 enforce", "surfaceManager.validateNext: surface contract enforced here"),
            },
            highlight_lines={604, 629, 634},
        ),
        _step_table(
            "主线 prompt 写入 session log 时间线",
            "Through-line prompt session log timeline",
            [
                ["1", "inbox.insert(user)", f"user 消息排队：«{PROMPT_ZH[:16]}…»"],
                ["2", "turn/start", "turn=1 打开 durable 边界"],
                ["3", "step/start", "step=1 打开 model+tools 边界"],
                ["4", "user/message", "surfaceOp=append · 进入 model-visible surface"],
                ["5", "deriveMessages()", "→ [{role:user, content:…}] 供 buildRequest"],
                ["6", "assistant/chunk×N", "流式 chunk · 不进入 derive（replay/UI）"],
                ["7", "assistant/message", "定稿 assistant · surfaceOp=append"],
                ["8", "tool/call + tool/result", "read README · surfaceOp=append"],
            ],
        ),
        _annotated_trace(
            "derive",
            "packages/core/session/src/index.ts",
            708,
            747,
            {
                726: ("★ deriveMessages：O(new nodes) 缓存投影", "★ deriveMessages: O(new nodes) cached projection"),
                739: ("deriveEventMessage：逐 surface node 折叠", "deriveEventMessage: fold per surface node"),
                746: ("返回 fresh array · Message 对象 shared+frozen", "returns fresh array · Message objects shared+frozen"),
            },
            highlight_lines={726, 739},
        ),
        _annotated_trace(
            "surface-rule",
            "packages/core/session/src/surface.ts",
            70,
            114,
            {
                83: ("★ THE per-node projection rule", "★ THE per-node projection rule"),
                96: ("user/message → verbatim user Message", "user/message → verbatim user Message"),
                99: ("assistant/message → skip empty usage-only", "assistant/message → skip empty usage-only"),
                106: ("tool/result → tool result Message", "tool/result → tool result Message"),
            },
            highlight_lines={83, 96, 106},
        ),
        p(
            "注意 <code>assistant/chunk</code> 与 <code>turn/start</code> 不在 surface 上——它们服务 replay 与 UI fidelity，"
            "但不进入 <code>deriveMessages()</code>。这是 DSH 与 Pi「AgentMessage 全进 transcript」的最大结构差异："
            "模型历史 = surface 投影，原始 chunk 留在 log 供 fidelity。",
            "Note <code>assistant/chunk</code> and <code>turn/start</code> are not on the surface — they serve replay "
            "and UI fidelity but never enter <code>deriveMessages()</code>. Biggest structural difference from Pi's "
            "«all AgentMessage in transcript»: model history = surface projection; raw chunks stay in log for fidelity.",
        ),
        note(
            "练习：grep session log 里主线 prompt 的 <code>user/message</code>，确认 <code>surfaceOp:'append'</code> 存在；"
            "再 grep 同 turn 的 <code>assistant/chunk</code>，确认无 surfaceOp。",
            "Exercise: grep the through-line <code>user/message</code> for <code>surfaceOp:'append'</code>; "
            "then grep same-turn <code>assistant/chunk</code> and confirm no surfaceOp.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C10: ReactLoopAgent turn/start ───────────────────────────────────

def _trace_c10() -> str:
    parts = [
        _trace_header(
            "10",
            "ReactLoopAgent：turn/start · step/start 完整驱动 trace",
            "ReactLoopAgent: full turn/start · step/start driver trace",
        ),
        p(
            "Pi 的 <code>runLoop</code> 是外环 follow-up × 内环 tool batch；"
            "DSH 的 <code>ReactLoopAgent</code> 用 <strong>turn × step</strong> 建模："
            "一个 turn 可含多个 step（模型请求 + tool batch），"
            "turn 在 inbox 无 pending 时关闭。主线 prompt 通常 turn=1、step=1(read)+step=2(answer)。",
            "Pi's <code>runLoop</code> is outer follow-up × inner tool batch; "
            "DSH's <code>ReactLoopAgent</code> models <strong>turn × step</strong>: "
            "one turn may contain multiple steps (model request + tool batch); "
            "turn closes when inbox has no pending work. Through-line prompt is usually turn=1, step=1(read)+step=2(answer).",
        ),
        _annotated_trace(
            "wake",
            "packages/core/agent-loop/src/agent.ts",
            172,
            223,
            {
                172: ("wakeDriver：idle → running phase", "wakeDriver: idle → running phase"),
                192: ("withInitiator(this) → kick()", "withInitiator(this) → kick()"),
                212: ("★ kick 外环：while (await turn())", "★ kick outer: while (await turn())"),
                219: ("turn 结束 → idle · wakeRequested 可重启", "turn end → idle · wakeRequested may restart"),
            },
            highlight_lines={212, 219},
        ),
        _annotated_trace(
            "turn",
            "packages/core/agent-loop/src/agent.ts",
            246,
            330,
            {
                255: ("★ turn/start 写入 session log", "★ turn/start appended to session log"),
                266: ("preStep：claim inbox + agent/pre-step", "preStep: claim inbox + agent/pre-step"),
                279: ("★ step/start", "★ step/start"),
                283: ("user/message append · surfaceOp=append", "user/message append · surfaceOp=append"),
                287: ("★ step()：deriveMessages → llm.stream", "★ step(): deriveMessages → llm.stream"),
                292: ("step/end", "step/end"),
                296: ("agent/turn-stopping serial hook", "agent/turn-stopping serial hook"),
                319: ("turn/end + reason", "turn/end + reason"),
            },
            highlight_lines={255, 279, 287, 319},
        ),
        _step_table(
            "主线 prompt · turn/step 状态机",
            "Through-line prompt · turn/step state machine",
            [
                ["T0", "wakeDriver", "inbox 有 user prompt · phase=running"],
                ["T1", "turn/start turn=1", "durable turn 边界打开"],
                ["T2", "step=1 start", "preStep → user/message → step()"],
                ["T3", "step=1 end", "toolUse(read) · inbox next-step 有 toolResult context"],
                ["T4", "step=2 start", "deriveMessages 含 tool/result"],
                ["T5", "step=2 end", "stopReason=completed"],
                ["T6", "turn/end", "reason=completed · phase→idle"],
            ],
        ),
        p(
            "C10 止于 <code>step()</code> 入口——模型流式与 tool 调度在 step 内完成（C12/C15）。"
            "下面桥接 trace 展示 step 内第一次 <code>deriveMessages()</code> 如何喂给 <code>buildRequest</code>。",
            "C10 stops at <code>step()</code> entry — streaming and tools finish inside step (C12/C15). "
            "Bridge trace below shows first <code>deriveMessages()</code> inside step feeding <code>buildRequest</code>.",
        ),
        _annotated_trace(
            "step-entry",
            "packages/core/agent-loop/src/agent.ts",
            332,
            342,
            {
                341: ("★ deriveMessages() → boundaryMessages", "★ deriveMessages() → boundaryMessages"),
                340: ("buildRequest：agent/request waterfall", "buildRequest: agent/request waterfall"),
            },
            highlight_lines={341},
        ),
        note(
            "对照 docs/agent-lifecycle.md 序列图：turn/* 与 step/* 全是 durable session events；"
            "agent/* 是 live extension points。",
            "Cross-read docs/agent-lifecycle.md sequence: turn/* and step/* are durable session events; "
            "agent/* are live extension points.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C11: agent/pre-step waterfall ────────────────────────────────────

def _trace_c11() -> str:
    parts = [
        _trace_header(
            "11",
            "agent/pre-step 瀑布：14 个 listener 如何改写入模内容",
            "agent/pre-step waterfall: how 14 listeners reshape model input",
        ),
        p(
            "<code>preStep()</code> 在 claim inbox 之后、<code>step/start</code> 之前调用 "
            "<code>dispatch.waterfall('agent/pre-step')</code>。"
            "listener 可 <code>reject</code> 整轮（turn 仍 durable 落盘但无 step）、"
            "或 <code>enter</code> 并改写 messages——compaction、plan-mode、agent-instructions、"
            "goal-round-driver 等 14 个包在此挂钩。",
            "<code>preStep()</code> after inbox claim, before <code>step/start</code>, calls "
            "<code>dispatch.waterfall('agent/pre-step')</code>. "
            "Listeners may <code>reject</code> the turn (durable turn logged, no step), "
            "or <code>enter</code> and rewrite messages — compaction, plan-mode, agent-instructions, "
            "goal-round-driver, and 12 other packages hook here.",
        ),
        _annotated_trace(
            "pre-step",
            "packages/core/agent-loop/src/agent.ts",
            225,
            243,
            {
                229: ("inbox.claim(target, turn)：next-turn 或 next-step", "inbox.claim(target, turn): next-turn or next-step"),
                230: ("systemPrompt.assemble：section + tool schema", "systemPrompt.assemble: sections + tool schema"),
                233: ("runtimeContext.project：注入 context section", "runtimeContext.project: inject context section"),
                234: ("★ agent/pre-step waterfall", "★ agent/pre-step waterfall"),
                238: ("默认 enter：claimed + context messages", "default enter: claimed + context messages"),
            },
            highlight_lines={234, 238},
        ),
        _step_table(
            "agent/pre-step 部分 listener（event map）",
            "agent/pre-step sample listeners (event map)",
            [
                ["1", "agent-instructions", "AGENTS.md 风格 system-reminder 注入"],
                ["2", "compaction-basic", "压缩摘要替换 early messages"],
                ["3", "plan-mode", "plan 状态 gate"],
                ["4", "goal-round-driver", "goal 驱动 continue/reject"],
                ["5", "session-reference", "跨 session 引用注入"],
                ["6", "time-context", "时间戳 section"],
            ],
        ),
        _annotated_trace(
            "turn-reject",
            "packages/core/agent-loop/src/agent.ts",
            266,
            277,
            {
                267: ("decision.kind === 'reject' → turnEnds=blocked", "decision.kind === 'reject' → turnEnds=blocked"),
                274: ("首 step enter 空 messages → turn 无 model call 关闭", "first step enter empty → turn closes without model call"),
            },
            highlight_lines={267, 274},
        ),
        p(
            "主线 prompt 的第一次 pre-step 通常只做两件事：把 claimed user 消息与 runtime context section 合并；"
            "compaction 若未触发则 messages 原样进入 step。",
            "Through-line's first pre-step usually merges claimed user messages with runtime context section; "
            "if compaction hasn't fired, messages enter step unchanged.",
        ),
        note(
            "打开 docs/event-producer-consumer.md 搜索 <code>agent/pre-step</code>，"
            "对照 listener 列与 packages/ 目录。",
            "Open docs/event-producer-consumer.md, search <code>agent/pre-step</code>, "
            "cross-read listener column with packages/.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C12: tool-calls pipeline ─────────────────────────────────────────

def _trace_c12() -> str:
    parts = [
        _trace_header(
            "12",
            f"read README 工具管线 · executeToolCalls",
            f"read README tool pipeline · executeToolCalls",
        ),
        p(
            "模型返回 tool-call block 后，<code>step()</code> 调用 <code>executeToolCalls</code>。"
            "调度器按 <code>executionMode</code> 分 exclusive barrier 与 parallel pool；"
            "结果以 model order 提交，<code>tool/call</code> + <code>tool/result</code> 成对写入 session log。",
            "After model returns tool-call blocks, <code>step()</code> calls <code>executeToolCalls</code>. "
            "Scheduler splits exclusive barriers vs parallel pool by <code>executionMode</code>; "
            "results commit in model order; <code>tool/call</code> + <code>tool/result</code> pairs land in session log.",
        ),
        _annotated_trace(
            "dispatch",
            "packages/core/agent-loop/src/agent.ts",
            410,
            418,
            {
                412: ("filter tool-call blocks from assistant content", "filter tool-call blocks from assistant content"),
                414: ("★ executeToolCalls 入口", "★ executeToolCalls entry"),
                416: ("acceptContext → inbox next-step splice", "acceptContext → inbox next-step splice"),
            },
            highlight_lines={414},
        ),
        _annotated_trace(
            "exec",
            "packages/core/agent-loop/src/tool-calls.ts",
            59,
            101,
            {
                59: ("executeToolCalls 签名：ctx + turn + step", "executeToolCalls signature: ctx + turn + step"),
                88: ("executionMode：parallel vs exclusive barrier", "executionMode: parallel vs exclusive barrier"),
                90: ("runGroup：一组 call 调度", "runGroup: schedule one group of calls"),
                96: ("abort：skipped calls 合成 error result", "abort: skipped calls get synthetic error result"),
            },
            highlight_lines={59, 88, 90},
        ),
        _annotated_trace(
            "append-pair",
            "packages/core/agent-loop/src/tool-calls.ts",
            164,
            289,
            {
                167: ("appendToolCall → tool/call event", "appendToolCall → tool/call event"),
                152: ("tools/execute waterfall → dispatch", "tools/execute waterfall → dispatch"),
                155: ("★ appendToolResult → tool/result · surfaceOp=append", "★ appendToolResult → tool/result · surfaceOp=append"),
                263: ("tool/call seq 被 result 引用", "tool/call seq cited by result"),
            },
            highlight_lines={167, 155, 263},
        ),
        _step_table(
            "read(README.md) 逐步",
            "read(README.md) step by step",
            [
                ["1", "tools/pre-execute", "hook 链 · approval 可能拦截"],
                ["2", "tools/execute", "tool-fs read 执行"],
                ["3", "tool/call", "callId · name=read · arguments JSON"],
                ["4", "tools/post-execute", "spill · repeat reminder"],
                ["5", "tool/result", "README 内容 · surfaceOp=append"],
                ["6", "acceptContext", "additionalContexts → inbox next-step"],
                ["7", "step=2 deriveMessages", "user+assistant+toolResult → Message[]"],
            ],
        ),
        _annotated_trace(
            "read-tool",
            "packages/fs/tool-fs/src/read.ts",
            1,
            40,
            {
                1: ("tool-fs read：FS capability consumer", "tool-fs read: FS capability consumer"),
            },
            highlight_lines=set(),
        ),
        note(
            "abort 时 <code>appendSkippedToolCall</code> 仍写 tool/call+tool/result 合成对——"
            "replay 与 deriveMessages 保持 valid。",
            "On abort <code>appendSkippedToolCall</code> still writes synthetic tool/call+tool/result pair — "
            "replay and deriveMessages stay valid.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C13: event domains ───────────────────────────────────────────────

def _trace_c13() -> str:
    parts = [
        _trace_header(
            "13",
            "三域事件：session · agent · capability",
            "Three event domains: session · agent · capability",
        ),
        p(
            "DSH 扩展点分三域（architecture.md）："
            "<strong>Session events</strong> 是 durable facts（<code>session/event</code> 广播）；"
            "<strong>Agent events</strong>（<code>agent/*</code>）携带 live Agent handle；"
            "<strong>Capability events</strong>（<code>tools/*</code> · <code>fs/*</code> · <code>llm/stream</code>）"
            "挂策略而不 import loop。主线一轮同时触及三域。",
            "DSH extension points split three domains (architecture.md): "
            "<strong>Session events</strong> are durable facts (broadcast via <code>session/event</code>); "
            "<strong>Agent events</strong> (<code>agent/*</code>) carry live Agent handle; "
            "<strong>Capability events</strong> (<code>tools/*</code> · <code>fs/*</code> · <code>llm/stream</code>) "
            "attach policy without importing the loop. One through-line turn touches all three.",
        ),
        _step_table(
            "主线 prompt · 三域事件序列（简化）",
            "Through-line prompt · three-domain event sequence (simplified)",
            [
                ["S1", "session/event turn/start", "durable · persistence 订阅"],
                ["S2", "session/event user/message", "surface append"],
                ["A1", "agent/pre-step", "waterfall · 14 listeners"],
                ["A2", "agent/request", "waterfall · config proposal"],
                ["C1", "llm/stream", "waterfall · retry/replay"],
                ["S3", "session/event assistant/chunk×N", "UI/replay · 非 surface"],
                ["S4", "session/event assistant/message", "surface append"],
                ["C2", "tools/pre-execute → execute → post-execute", "read README"],
                ["S5", "session/event tool/call + tool/result", "surface append"],
                ["A3", "agent/turn-stopping", "serial · hooks"],
                ["S6", "session/event turn/end", "durable close"],
            ],
        ),
        _annotated_trace(
            "session-events",
            "packages/core/session/src/index.ts",
            40,
            86,
            {
                54: ("session/created emit", "session/created emit"),
                76: ("★ session/event：每次 append 广播", "★ session/event: broadcast on every append"),
                85: ("session/flush parallel：persistence 落盘", "session/flush parallel: persistence flush"),
            },
            highlight_lines={76, 85},
        ),
        _annotated_trace(
            "agent-events",
            "packages/core/agent/src/runtime-types.ts",
            170,
            280,
            {
                178: ("agent/status emit", "agent/status emit"),
                231: ("agent/pre-step waterfall 类型", "agent/pre-step waterfall type"),
                244: ("agent/request waterfall 类型", "agent/request waterfall type"),
                278: ("agent/turn-stopping serial 类型", "agent/turn-stopping serial type"),
            },
            highlight_lines={231, 244, 278},
        ),
        p(
            "读 event map 时记住 mode 语义：<code>waterfall</code> 必须 call <code>next()</code>；"
            "<code>serial</code> 无 next；<code>emit</code> 是 fire-and-forget。"
            "错误 domain = 插件挂错钩子 = 静默不生效。",
            "When reading the event map remember mode semantics: <code>waterfall</code> must call <code>next()</code>; "
            "<code>serial</code> has no next; <code>emit</code> is fire-and-forget. "
            "Wrong domain = plugin on wrong hook = silently no-op.",
        ),
        note(
            "用 <code>docs/event-producer-consumer.md</code> 查任意事件的 Dispatchers/Listeners 列；"
            "比 grep <code>ctx.on(</code> 更完整。",
            "Use <code>docs/event-producer-consumer.md</code> for any event's Dispatchers/Listeners columns; "
            "more complete than grepping <code>ctx.on(</code>.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C14: ctx.llm ─────────────────────────────────────────────────────

def _trace_c14() -> str:
    parts = [
        _trace_header(
            "14",
            "ctx.llm：prepareCall · llm/stream 如何接到 ReactLoopAgent",
            "ctx.llm: how prepareCall · llm/stream connects to ReactLoopAgent",
        ),
        p(
            "<code>ctx.llm</code>（<code>packages/llm/llm</code>）是 DSH 的 LLM 适配层。"
            "<code>prepareCall</code> 绑定 adapter registration；"
            "<code>stream()</code> 外包 <code>llm/stream</code> waterfall。"
            "ReactLoopAgent 在 <code>buildRequest</code> 里 prepare，在 <code>step()</code> 里 stream。",
            "<code>ctx.llm</code> (<code>packages/llm/llm</code>) is DSH's LLM adapter layer. "
            "<code>prepareCall</code> binds adapter registration; "
            "<code>stream()</code> wraps <code>llm/stream</code> waterfall. "
            "ReactLoopAgent prepares in <code>buildRequest</code>, streams in <code>step()</code>.",
        ),
        _annotated_trace(
            "llm-stream-event",
            "packages/llm/llm/src/index.ts",
            47,
            67,
            {
                65: ("★ llm/stream waterfall 声明", "★ llm/stream waterfall declaration"),
                57: ("LOOP-built request 携带 markAgentLoopRequest", "LOOP-built request carries markAgentLoopRequest"),
            },
            highlight_lines={65},
        ),
        _annotated_trace(
            "prepare",
            "packages/llm/llm/src/index.ts",
            824,
            868,
            {
                824: ("★ prepareCall：resolve + adapterDefaults", "★ prepareCall: resolve + adapterDefaults"),
                850: ("prepared stream 只能 dispatch 一次", "prepared stream can dispatch only once"),
                861: ("streamWithRegistration → llm/stream", "streamWithRegistration → llm/stream"),
            },
            highlight_lines={824, 850},
        ),
        _annotated_trace(
            "stream",
            "packages/llm/llm/src/index.ts",
            985,
            999,
            {
                985: ("LlmRuntime.stream 公共入口", "LlmRuntime.stream public entry"),
                993: ("★ ctx.waterfall llm/stream", "★ ctx.waterfall llm/stream"),
                997: ("default next → adapterStream", "default next → adapterStream"),
            },
            highlight_lines={985, 993},
        ),
        _step_table(
            "主线 turn-1 step-1 · ctx.llm 数据流",
            "Through-line turn-1 step-1 · ctx.llm data flow",
            [
                ["in", "deriveMessages()", "user prompt Message[]"],
                ["prep", "prepareCall(config)", "adapter registration bound"],
                ["wf1", "agent/request", "config proposal waterfall"],
                ["req", "markAgentLoopRequest", "deep-frozen GenerateOptions"],
                ["wf2", "llm/stream", "retry · replay · session-checkpoint"],
                ["http", "adapter.stream()", "DeepSeek SSE chunks"],
                ["out", "StreamChunk*", "→ BlockAssembler in step()"],
            ],
        ),
        _annotated_trace(
            "build-request",
            "packages/core/agent-loop/src/agent.ts",
            457,
            513,
            {
                457: ("agent/request waterfall：proposedConfig", "agent/request waterfall: proposedConfig"),
                468: ("★ loopCtx.llm.prepareCall", "★ loopCtx.llm.prepareCall"),
                505: ("★ markAgentLoopRequest(deepFreeze(...))", "★ markAgentLoopRequest(deepFreeze(...))"),
            },
            highlight_lines={468, 505},
        ),
        note(
            "练习：在 llm-replay 插件短路 <code>llm/stream</code>，观察 session log 是否仍收到相同形状的 assistant/chunk。",
            "Exercise: short-circuit <code>llm/stream</code> with llm-replay plugin; "
            "observe session log still gets same-shaped assistant/chunk.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C15: assistant/chunk streaming ───────────────────────────────────

def _trace_c15() -> str:
    parts = [
        _trace_header(
            "15",
            "assistant/chunk 流式：从 adapter chunk 到 assistant/message",
            "assistant/chunk streaming: adapter chunk to assistant/message",
        ),
        p(
            "<code>step()</code> 的 <code>for await (chunk of stream)</code> 循环是 UI 与 replay 的燃料："
            "每个 chunk 立即 <code>session.append('assistant/chunk')</code>（无 surfaceOp），"
            "同时 <code>BlockAssembler.push(chunk)</code> 累积；"
            "流结束后 <code>assistant/message</code> 带 <code>sourceEventSeqs: chunkSeqs</code> 定稿入 surface。",
            "<code>step()</code>'s <code>for await (chunk of stream)</code> loop fuels UI and replay: "
            "each chunk immediately <code>session.append('assistant/chunk')</code> (no surfaceOp), "
            "while <code>BlockAssembler.push(chunk)</code> accumulates; "
            "after stream, <code>assistant/message</code> with <code>sourceEventSeqs: chunkSeqs</code> finalizes onto surface.",
        ),
        _annotated_trace(
            "chunk-loop",
            "packages/core/agent-loop/src/agent.ts",
            339,
            409,
            {
                346: ("preparedCall?.stream ?? loopCtx.llm.stream", "preparedCall?.stream ?? loopCtx.llm.stream"),
                348: ("for await chunk of stream", "for await chunk of stream"),
                350: ("★ assistant/chunk append · 记录 seq", "★ assistant/chunk append · record seq"),
                351: ("BlockAssembler.push(chunk)", "BlockAssembler.push(chunk)"),
                372: ("finish error/aborted → request-error waterfall", "finish error/aborted → request-error waterfall"),
                400: ("★ assistant/message · surfaceOp=append", "★ assistant/message · surfaceOp=append"),
                408: ("sourceEventSeqs: chunkSeqs 链", "sourceEventSeqs: chunkSeqs chain"),
            },
            highlight_lines={350, 400, 408},
        ),
        _step_table(
            "主线 turn-1 · tool-call chunk 时间线",
            "Through-line turn-1 · tool-call chunk timeline",
            [
                ["1", "chunk text_delta", "可能为空 · 模型先输出 tool-call"],
                ["2", "chunk tool-call start", "read tool 块开始"],
                ["3", "chunk tool-call delta×N", "arguments JSON 增量"],
                ["4", "chunk finish tool-calls", "stopReason=tool-calls"],
                ["5", "assistant/message", "content 含 tool-call block"],
                ["6", "executeToolCalls", "→ tool/call + tool/result"],
            ],
        ),
        _annotated_trace(
            "abort-path",
            "packages/core/agent-loop/src/agent.ts",
            354,
            368,
            {
                355: ("signal.aborted：assembler.interruptedBlocks()", "signal.aborted: assembler.interruptedBlocks()"),
                358: ("interrupted assistant/message 仍落盘", "interrupted assistant/message still persisted"),
            },
            highlight_lines={358},
        ),
        p(
            "设计要点：chunk 路径与 surface 路径<strong>故意分离</strong>——"
            "Web UI 订阅 <code>session/event</code> 渲染 chunk；"
            "<code>deriveMessages()</code> 只看 assistant/message 定稿。"
            "这与 Pi 的 message_update 单通道不同。",
            "Design note: chunk path and surface path are <strong>deliberately separate</strong> — "
            "Web UI subscribes to <code>session/event</code> for chunk render; "
            "<code>deriveMessages()</code> only sees finalized assistant/message. "
            "Unlike Pi's single message_update channel.",
        ),
        note(
            "Web 客户端 replay：按 seq 顺序读 assistant/chunk 可重建流式 UI；"
            "deriveMessages 跳过 chunk 仍得到正确 model history。",
            "Web client replay: reading assistant/chunk by seq rebuilds streaming UI; "
            "deriveMessages skipping chunks still yields correct model history.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C16: deriveMessages closed loop ──────────────────────────────────

def _trace_c16() -> str:
    parts = [
        _trace_header(
            "16",
            "deriveMessages 闭环：reconstructability 不变量",
            "deriveMessages closed loop: reconstructability invariant",
        ),
        p(
            "DSH 运行时断言：<strong>发给模型的 messages 必须是 deriveMessages() 的纯函数</strong>。"
            "<code>markAgentLoopRequest</code> 标记 LOOP-built request 为 deep-frozen；"
            "<code>llm/stream</code> listener 可读不可改。"
            "step=2 的 deriveMessages 输出必须等于 step=1 结束后 log 的 surface 投影——"
            "这是主线 prompt 第二圈 model call 能「看见 README 内容」的根基。",
            "DSH runtime asserts: <strong>messages sent to the model must be a pure function of deriveMessages()</strong>. "
            "<code>markAgentLoopRequest</code> marks LOOP-built requests deep-frozen; "
            "<code>llm/stream</code> listeners read, never rewrite. "
            "Step=2 deriveMessages output must equal surface projection after step=1 — "
            "foundation for the through-line's second model call «seeing README content».",
        ),
        _annotated_trace(
            "derive-cache",
            "packages/core/session/src/index.ts",
            701,
            757,
            {
                702: ("derived cache：derivedNodes 增量", "derived cache: derivedNodes increment"),
                730: ("replaceGeneration 变化 → 全量 rebuild", "replaceGeneration change → full rebuild"),
                726: ("★ deriveMessages 公共 API", "★ deriveMessages public API"),
                755: ("deriveEventMessage 委托 surface.ts", "deriveEventMessage delegates to surface.ts"),
            },
            highlight_lines={726, 730},
        ),
        _step_table(
            "主线 prompt · deriveMessages 两次投影",
            "Through-line prompt · two deriveMessages projections",
            [
                ["P1", "step=1 开始", "[user]"],
                ["P2", "step=1 结束", "[user, assistant(tool-call)]"],
                ["P3", "tool/result 落盘", "[user, assistant, tool-result]"],
                ["P4", "step=2 开始", "deriveMessages → 同上"],
                ["P5", "step=2 结束", "[user, assistant, tool-result, assistant(answer)]"],
            ],
        ),
        _annotated_trace(
            "build-boundary",
            "packages/core/agent-loop/src/agent.ts",
            426,
            442,
            {
                431: ("boundaryMessages 参数 = deriveMessages()", "boundaryMessages param = deriveMessages()"),
                505: ("messages: boundaryMessages 进入 request", "messages: boundaryMessages enter request"),
            },
            highlight_lines={431, 505},
        ),
        _annotated_trace(
            "mark-loop",
            "packages/llm/llm/src/index.ts",
            52,
            66,
            {
                57: ("LOOP request deep-frozen · listener 不可 mutate", "LOOP request deep-frozen · listeners cannot mutate"),
            },
            highlight_lines={57},
        ),
        p(
            "Compaction 走 surface <code>replace</code> 而非删 log——"
            "<code>replaceGeneration</code> bump 后 deriveMessages 重建 cache，"
            "模型看到摘要版 history，但 JSONL 仍保留完整原始 events。",
            "Compaction uses surface <code>replace</code>, not log deletion — "
            "after <code>replaceGeneration</code> bump deriveMessages rebuilds cache; "
            "model sees summarized history while JSONL keeps full original events.",
        ),
        note(
            "实验：step=1 结束后打印 <code>session.deriveMessages().length</code>，"
            "再 append 一条无 surfaceOp 的 debug event，确认 length 不变。",
            "Experiment: after step=1 print <code>session.deriveMessages().length</code>, "
            "append a debug event without surfaceOp, confirm length unchanged.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── public API ───────────────────────────────────────────────────────

_HEART = {
    "c9": _trace_c09,
    "c10": _trace_c10,
    "c11": _trace_c11,
    "c12": _trace_c12,
    "c13": _trace_c13,
    "c14": _trace_c14,
    "c15": _trace_c15,
    "c16": _trace_c16,
}


def heart_trace_block(cid: str) -> str:
    fn = _HEART.get(cid)
    if not fn:
        return ""
    return fn()


def heart_trace_chars(cid: str) -> int:
    return len(heart_trace_block(cid))
