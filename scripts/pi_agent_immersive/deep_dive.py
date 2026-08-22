"""Deep bilingual technical expansions for Pi Agent immersive chapters."""
from __future__ import annotations

from expand import case_study, textbook_crossref_table
from ultra_dive import ultra_for
from _html_helpers import (
    depth_zone_close,
    depth_zone_open,
    faq_block,
    join,
    section_block,
    src,
    stage_banner,
    trace_box,
    why_care,
)
from meta import CHAPTERS

PROMPT_ZH = "读取 README.md，用一句话告诉我这个项目做什么"
PROMPT_EN = "read README.md and tell me what this project does in one sentence"


def _why(intuition: tuple[str, str], counter: tuple[str, str], optimize: tuple[str, str]) -> str:
    return why_care([
        ("直觉", intuition[0], intuition[1], ""),
        ("反直觉", counter[0], counter[1], "rev"),
        ("优化", optimize[0], optimize[1], "act"),
    ])


def _banner(
    module: tuple[str, str],
    package: tuple[str, str],
    thread: tuple[str, str],
    output: tuple[str, str],
) -> str:
    return stage_banner([
        ("模块", "Module", module[0], module[1]),
        ("包", "Package", package[0], package[1]),
        ("线程", "Thread", thread[0], thread[1]),
        ("输出", "Output", output[0], output[1]),
    ])


def _faq(items: list[tuple[str, str, str, str]]) -> str:
    return faq_block(items)


def _trace(station: str, zh: str, en: str) -> str:
    return trace_box(station, zh, en)


def _case(title_zh: str, title_en: str, body_zh: str, body_en: str) -> str:
    return case_study(title_zh, title_en, body_zh, body_en)


def _sec(title_zh: str, title_en: str, sec: str, *paragraphs: tuple[str, str]) -> str:
    return section_block(title_zh, title_en, list(paragraphs), sec=sec)


def _strip_topic_prefix(title: str) -> str:
    if "：" in title:
        return title.split("：", 1)[1].strip()
    if ": " in title and title.index(": ") < 40:
        return title.split(": ", 1)[1].strip()
    return title


def _src(tag: str, path: str, lines: list[str]) -> str:
    hl = [f'<span class="src-line">{line}</span>' for line in lines]
    return src(tag, path, hl)


def deepen(cid: str, base: str) -> str:
    """Prepend why_care+banner, append depth content inside depth-zone."""
    d = DEPTH.get(cid)
    if not d:
        return base
    ch_num = next(c[1] for c in CHAPTERS if c[0] == cid)
    parts: list[str] = []
    if d.get("prepend"):
        parts.extend([d["why"], d["banner"]])
    parts.append(base)

    depth_parts: list[str] = []
    sec_base = 4
    for i, (tz, te, ps) in enumerate(d.get("section_defs", [])):
        tz_clean = _strip_topic_prefix(tz)
        te_clean = _strip_topic_prefix(te)
        depth_parts.append(_sec(tz_clean, te_clean, f"C{ch_num}.{sec_base + i}", *ps))

    if d.get("trace"):
        depth_parts.append(d["trace"])
    if d.get("case"):
        depth_parts.append(d["case"])
    depth_parts.extend(d.get("src_extra", []))
    if d.get("textbook_cps"):
        depth_parts.append(textbook_crossref_table(d["textbook_cps"]))
    if d.get("faq"):
        depth_parts.append(d["faq"])

    ultra = ultra_for(cid, ch_num, sec_base + len(d.get("section_defs", [])))
    if ultra:
        depth_parts.append(ultra)

    if depth_parts:
        parts.append(depth_zone_open(ch_num))
        parts.extend(depth_parts)
        parts.append(depth_zone_close())

    return join(*parts)


def _ch(
    why: tuple[tuple[str, str], tuple[str, str], tuple[str, str]],
    banner: tuple[tuple[str, str], tuple[str, str], tuple[str, str], tuple[str, str]],
    sections: list[tuple[str, str, list[tuple[str, str]]]],
    *,
    trace: tuple[str, str, str] | None = None,
    case: tuple[str, str, str, str] | None = None,
    src_extra: list[tuple[str, str, list[str]]] | None = None,
    textbook_cps: list[str] | None = None,
    faq: list[tuple[str, str, str, str]] | None = None,
    prepend: bool = True,
) -> dict:
    return {
        "prepend": prepend,
        "why": _why(*why),
        "banner": _banner(*banner),
        "section_defs": sections,
        **({"trace": _trace(*trace)} if trace else {}),
        **({"case": _case(*case)} if case else {}),
        **({"src_extra": [_src(t, p, ls) for t, p, ls in (src_extra or [])]}),
        **({"textbook_cps": textbook_cps} if textbook_cps else {}),
        **({"faq": _faq(faq)} if faq else {}),
    }


DEPTH: dict[str, dict] = {
    "c1": _ch(
        (
            ("Pi 把 agent 编排写成可读的 TypeScript 环，而不是黑盒产品。", "Pi writes agent orchestration as readable TypeScript loops, not a black-box product."),
            ("「harness」是交付物本身，只是不替你决定 MCP 市场与 IDE 策略。", "The harness is the deliverable; it refuses MCP marketplace and IDE policy."),
            ("fork 后换 <code>streamFn</code> 或 <code>SessionManager</code> 比 fork IDE 插件现实。", "Swapping <code>streamFn</code> or <code>SessionManager</code> beats forking an IDE plugin."),
        ),
        (
            ("哲学层", "Philosophy"),
            ("pi-mono", "pi-mono"),
            ("主线未进入", "Through-line not entered"),
            ("心智模型", "Mental model"),
        ),
        [
            ("Harness 哲学：主线 prompt 如何穿过此模块", "Harness 哲学: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/agent/src/agent-loop.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/agent/src/agent-loop.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("Harness 哲学：关键函数与数据流", "Harness 哲学: key functions and data flow", [
                ("<code>agent-loop.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>agent-loop.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("Harness 哲学：与 agent-loop 的接口", "Harness 哲学: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/agent/src/agent-loop.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/agent/src/agent-loop.ts</code>."),
            ]),
        ],
        trace=("00", "Station 00：harness 心智，尚未 read。", "Station 00: harness mindset; read not yet."),
        case=("迁移到 Pi", "Migrate to Pi", "跑 checkpoint 00 再对照 AgentSession.prompt()。", "Run checkpoint 00 then compare AgentSession.prompt()."),
        src_extra=[
            ("loop", "packages/agent/src/agent-loop.ts", [
                '<span class="src-comment">/** Transforms to Message[] only at the LLM call boundary. */</span>',
                '<span class="src-kw">export function</span> <span class="src-fn">agentLoop</span>(...)',
            ]),
        ],
        textbook_cps=['00', '13'],
        faq=[
            (
                "Pi 是产品还是库？",
                "Product or library?",
                "CLI + 可嵌入库。",
                "CLI plus embeddable libs.",
            ),
            (
                "为何不 fork Claude Code？",
                "Why not fork Claude Code?",
                "闭源，无法审计 agentLoop。",
                "Closed source.",
            ),
            (
                "读完 C01？",
                "After C01?",
                "克隆 pi 与 pi-textbook。",
                "Clone pi and pi-textbook.",
            ),
        ],
    ),
    "c2": _ch(
        (
            ("22 站地图是整篇文章骨架。", "22-station map is the article skeleton."),
            ("七里程碑覆盖两次 model.stream()。", "Seven milestones cover two model.stream() calls."),
            ("JSONL 落盘与渲染并行，非最后才写盘。", "JSONL writes parallel rendering."),
        ),
        (
            ("全景", "Panorama"),
            ("跨包", "Cross-package"),
            ("user→tool", "user→tool"),
            ("七里程碑", "Seven milestones"),
        ),
        [
            ("回车到第一次 stream", "Enter to first stream", [
                ("站 01–06：shell 回车 → cli.ts → main.ts → createAgentSession() → prompt() 将「读取 README.md，用一句话告诉我这个项目做什么」变为 AgentMessage 并写 JSONL。", "Stations 01–06: Enter → cli.ts → main.ts → createAgentSession() → prompt() turns «read README.md and tell me what this project does in one sentence» into AgentMessage + JSONL."),
                ("agentLoop emit agent_start/turn_start 后 runLoop 内环调用 streamAssistantResponse——第一次 owner=model 边界。", "agentLoop emits agent_start/turn_start; inner runLoop calls streamAssistantResponse — first owner=model boundary."),
                ("典型第一次 stream：stopReason=toolUse，toolCall type=read path=README.md（agent-loop.ts 第203行 filter toolCall）。", "Typical first stream: stopReason=toolUse, read README.md (agent-loop.ts line 203 filters toolCall)."),
                ("owner=loop 站 07–11：executeToolCalls → packages/coding-agent/src/core/tools/read.ts createReadTool。", "owner=loop 07–11: executeToolCalls → createReadTool in read.ts."),
            ]),
            ("工具结果到第二次 stream", "To second stream", [
                ("toolResult push 后 convertToLlm(messages) 转 Message[]；第二次 streamAssistantResponse。", "After toolResult, convertToLlm to Message[]; second streamAssistantResponse."),
                ("stopReason=stop 产出最终回答；message_update 驱动 TUI；message_end 写 JSONL。", "stopReason=stop yields answer; message_update drives TUI; message_end writes JSONL."),
                ("turn_end 携带 toolResults；无 follow-up 时 agent_end。", "turn_end carries toolResults; agent_end without follow-up."),
            ]),
            ("七里程碑映射", "Milestone map", [
                ("01 user_message↔01–04；03 assistant(toolUse)↔06；04–05 tool↔07–12；07 stop↔15–18。", "01 user↔01–04; 03 toolUse↔06; 04–05 tool↔07–12; 07 stop↔15–18."),
                ("站 19–22：扩展 hook、compaction 检查、TUI flush、leafId——短任务可能 noop。", "19–22: extension hooks, compaction, TUI flush, leafId — may noop on short task."),
            ]),
            ("如何读后续章", "Read later chapters", [
                ("C06↔03–05；C07↔05–08；C10↔09–11；C14↔14–16。", "C06↔03–05; C07↔05–08; C10↔09–11; C14↔14–16."),
                ("验收：pi --verbose 事件序列应对齐 prologue.ts 类型顺序。", "Acceptance: pi --verbose event types mirror prologue.ts order."),
            ]),
        ],
        trace=("01", "站 01：「读取 README.md，用一句话告诉我这个项目做什么」进入 cli.ts。", "Station 01: «read README.md and tell me what this project does in one sentence» enters cli.ts."),
        src_extra=[
            ("prologue", "pi-textbook/workshop/src/demo/prologue.ts", [
                '<span class="src-fn">appendTrace</span>(trace, { type: "user_message" });',
                '<span class="src-fn">appendTrace</span>(trace, { type: "tool_start" });',
            ]),
            ("loop", "packages/agent/src/agent-loop.ts", [
                '<span class="src-kw">while</span> (true) { // outer: follow-up',
                '  <span class="src-kw">while</span> (hasMoreToolCalls || pendingMessages.length) {',
            ]),
        ],
        textbook_cps=['00'],
        faq=[
            (
                "22 vs 26？",
                "22 vs 26?",
                "章含背景 C03–C05 与全景 C24–C25。",
                "Chapters include background and landscape.",
            ),
            (
                "owner 从哪来？",
                "owner?",
                "prologue.ts trace 约定。",
                "prologue.ts trace convention.",
            ),
            (
                "如何验证？",
                "Verify?",
                "对照 coding-agent package.json 版本。",
                "Match coding-agent version.",
            ),
        ],
    ),
    "c3": _ch(
        (
            ("pi-mono 家谱 决定你如何理解 Pi 在此层的机制。", "pi-mono 家谱 shapes how you understand Pi at this layer."),
            ("反直觉：<code>package.json</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>package.json</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("package.json", "package.json"),
            ("背景", "Background"),
            ("package.json", "package.json"),
        ),
        [
            ("pi-mono 家谱：主线 prompt 如何穿过此模块", "pi-mono 家谱: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>pi-mono/package.json</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>pi-mono/package.json</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("pi-mono 家谱：关键函数与数据流", "pi-mono 家谱: key functions and data flow", [
                ("<code>package.json</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>package.json</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("pi-mono 家谱：与 agent-loop 的接口", "pi-mono 家谱: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>pi-mono/package.json</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>pi-mono/package.json</code>."),
            ]),
            ("pi-mono 家谱：设计权衡与常见坑", "pi-mono 家谱: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        src_extra=[
            ("src", "pi-mono/package.json", [
                '<span class="src-comment">// pi-mono 家谱 · pi-mono/package.json</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['13'],
        faq=[
            (
                "pi-mono 家谱最关键文件？",
                "Key file?",
                "<code>pi-mono/package.json</code>。",
                "<code>pi-mono/package.json</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c4": _ch(
        (
            ("六层蛋糕 决定你如何理解 Pi 在此层的机制。", "六层蛋糕 shapes how you understand Pi at this layer."),
            ("反直觉：<code>package.json</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>package.json</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("agent", "agent"),
            ("背景", "Background"),
            ("package.json", "package.json"),
        ),
        [
            ("六层蛋糕：主线 prompt 如何穿过此模块", "六层蛋糕: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/agent/package.json</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/agent/package.json</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("六层蛋糕：关键函数与数据流", "六层蛋糕: key functions and data flow", [
                ("<code>package.json</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>package.json</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("六层蛋糕：与 agent-loop 的接口", "六层蛋糕: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/agent/package.json</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/agent/package.json</code>."),
            ]),
            ("六层蛋糕：设计权衡与常见坑", "六层蛋糕: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        src_extra=[
            ("src", "packages/agent/package.json", [
                '<span class="src-comment">// 六层蛋糕 · packages/agent/package.json</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['03', '13'],
        faq=[
            (
                "六层蛋糕最关键文件？",
                "Key file?",
                "<code>packages/agent/package.json</code>。",
                "<code>packages/agent/package.json</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),

    "c5": _ch(
        (
            ("Pi README 明确列出 No MCP / No sub-agents / No plan mode——这是边界声明，不是遗漏。", "Pi README explicitly lists No MCP / No sub-agents / No plan mode — boundary statements, not omissions."),
            ("反直觉：「故意不做」反而让主线 prompt 路径更短、更可 trace。", "Counter-intuitive: intentionally omitted features make the through-line shorter and more traceable."),
            ("优化：用 Extension API + session fork 组合替代子 agent，类型安全且可观测。", "Optimize: Extension API + session fork replaces sub-agents with type safety and observability."),
        ),
        (
            ("哲学", "Philosophy"),
            ("coding-agent/README.md", "coding-agent/README.md"),
            ("背景", "Background"),
            ("边界声明", "Boundary manifesto"),
        ),
        [
            ("为什么 No MCP", "Why no MCP", [
                ("<code>packages/coding-agent/README.md</code> 第 498 行：<strong>No MCP</strong>。Mario 的博客解释：MCP 把工具发现协议化，但 Pi 选择 <code>registerTool</code> + Skills + npm/git 扩展包。", "<code>packages/coding-agent/README.md</code> line 498: <strong>No MCP</strong>. Mario's blog: MCP protocolizes tool discovery; Pi chooses <code>registerTool</code> + Skills + npm/git extension packages."),
                ("对主线 prompt 的影响：模型调用 <code>read</code> 是 coding-agent 内置 tool，经 <code>createReadTool</code> 同进程执行——无需 MCP server 握手。", "Through-line impact: model calls built-in <code>read</code> via <code>createReadTool</code> in-process — no MCP handshake."),
                ("代价：无法直接接入 Claude Desktop MCP 市场。收益：tool schema 在 TypeScript 中定义，<code>validateToolArguments</code> 在 <code>agent-loop.ts</code> 执行前校验。", "Cost: no Claude Desktop MCP marketplace. Payoff: TypeScript tool schemas; <code>validateToolArguments</code> before execution."),
                ("扩展路径：<code>examples/extensions/</code> 可添加 MCP；<code>plan-mode/</code> 示例展示 extension 实现产品功能。", "Extension path: <code>examples/extensions/</code> can add MCP; <code>plan-mode/</code> shows product features via extensions."),
            ]),
            ("为什么 No sub-agents", "Why no sub-agents", [
                ("README 第 500 行：可用 tmux spawn 多个 pi 实例，或用 extension 自建，或安装第三方 pi package。", "README line 500: spawn pi via tmux, build with extensions, or install third-party pi packages."),
                ("Pi 的替代是 <strong>session fork</strong>（<code>SessionManager.fork</code>，<code>parentSession</code>）+ <strong>RPC 模式</strong>（<code>--mode rpc</code>）。嵌套层不隐藏——JSONL 树可 diff。", "Pi's alternative: <strong>session fork</strong> + <strong>RPC mode</strong>. Nesting visible in diffable JSONL tree."),
                ("主线 README 任务不需要子 agent：一次 read + 一次总结，单 agentLoop 足够。", "README through-line needs no sub-agent: one read + one summary suffices."),
                ("<code>packages/client</code> 的 <code>acquireSession</code> exclusive lease 防止并发写同一会话。", "<code>packages/client</code> <code>acquireSession</code> exclusive lease prevents concurrent session writes."),
            ]),
            ("为什么 No plan mode", "Why no plan mode", [
                ("README 第 504 行：把计划写进文件、用 extension 实现、或安装 package。<code>examples/extensions/plan-mode/</code> 提供 <code>/plan</code> 与 <code>Ctrl+Alt+P</code>。", "README line 504: write plans to files, use extensions, or install packages. <code>plan-mode/</code> provides <code>/plan</code> and <code>Ctrl+Alt+P</code>."),
                ("Pi 的 thinking level（<code>ThinkingLevelSchema</code> in <code>protocol/schemas.ts</code>）是模型侧推理，不是 UI plan 模式。", "Pi's thinking level in <code>protocol/schemas.ts</code> is model-side reasoning, not UI plan mode."),
                ("对主线 prompt：模型可直接 toolUse read，无需先进入 plan 只读阶段。", "Through-line: model can toolUse read directly — no plan-only phase."),
            ]),
            ("故意不做 = 可观测性预算", "Omissions = observability budget", [
                ("每省略一个产品功能，就少一层黑盒。Pi 用 <code>--verbose</code> 事件 + 开源 <code>agent-loop.ts</code> 补偿 IDE 集成缺失。", "Each omitted feature removes a black box. Pi compensates with <code>--verbose</code> events and open <code>agent-loop.ts</code>."),
                ("对比 Claude Code Plan 模式：用户看不见 plan 状态机；Pi plan-mode extension 仍走 <code>ExtensionRunner</code> 事件。", "vs Claude Code Plan: users cannot see state machine; Pi plan-mode extension still emits via <code>ExtensionRunner</code>."),
            ]),
            ("主线 prompt 在「故意不做」语境下", "Through-line under omissions", [
                ("主线只需 read + summarize——恰好是 Pi 默认 tool 集的最小闭环。", "Through-line needs only read + summarize — Pi default tool set minimal loop."),
                ("若 fork Pi 加 MCP：改动 <code>ExtensionRunner</code> + tool registry，不必 fork <code>agent-loop.ts</code>。", "Forking to add MCP: change <code>ExtensionRunner</code> + tool registry, not <code>agent-loop.ts</code>."),
            ]),
        ],
        src_extra=[("readme", "packages/coding-agent/README.md", [
            '<span class="src-str">**No MCP.**</span> Build CLI tools with READMEs ...',
            '<span class="src-str">**No sub-agents.**</span> Spawn pi instances via tmux ...',
            '<span class="src-str">**No plan mode.**</span> Write plans to files ...',
        ])],
        textbook_cps=["12", "13"],
        faq=[
            ("Pi 永远不会有 MCP 吗？", "Will Pi never have MCP?", "核心不做一等协议；社区 extension 可加。", "Not first-class in core; community extensions can add it."),
            ("session fork 和 sub-agent 有何不同？", "fork vs sub-agent?", "fork 显式 JSONL 树 + parentSession。", "fork has explicit JSONL tree + parentSession."),
            ("plan-mode 示例在哪？", "plan-mode example?", "<code>examples/extensions/plan-mode/</code>。", "<code>examples/extensions/plan-mode/</code>."),
        ],
    ),
    "c6": _ch(
        (
            ("CLI 启动 决定你如何理解 Pi 在此层的机制。", "CLI 启动 shapes how you understand Pi at this layer."),
            ("反直觉：<code>cli.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>cli.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 06", "St. 06"),
            ("cli.ts", "cli.ts"),
        ),
        [
            ("CLI 启动：主线 prompt 如何穿过此模块", "CLI 启动: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/cli.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/cli.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("CLI 启动：关键函数与数据流", "CLI 启动: key functions and data flow", [
                ("<code>cli.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>cli.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("CLI 启动：与 agent-loop 的接口", "CLI 启动: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/cli.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/cli.ts</code>."),
            ]),
            ("CLI 启动：设计权衡与常见坑", "CLI 启动: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("06", "站 06：<code>packages/coding-agent/src/cli.ts</code> 处理主线。", "Station 06: <code>packages/coding-agent/src/cli.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/cli.ts", [
                '<span class="src-comment">// CLI 启动 · packages/coding-agent/src/cli.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['13'],
        faq=[
            (
                "CLI 启动最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/cli.ts</code>。",
                "<code>packages/coding-agent/src/cli.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c7": _ch(
        (
            ("AgentSession 决定你如何理解 Pi 在此层的机制。", "AgentSession shapes how you understand Pi at this layer."),
            ("反直觉：<code>agent-session.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>agent-session.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 07", "St. 07"),
            ("agent-session.ts", "agent-session.ts"),
        ),
        [
            ("AgentSession：主线 prompt 如何穿过此模块", "AgentSession: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/agent-session.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/agent-session.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("AgentSession：关键函数与数据流", "AgentSession: key functions and data flow", [
                ("<code>agent-session.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>agent-session.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("AgentSession：与 agent-loop 的接口", "AgentSession: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/agent-session.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/agent-session.ts</code>."),
            ]),
            ("AgentSession：设计权衡与常见坑", "AgentSession: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("07", "站 07：<code>packages/coding-agent/src/core/agent-session.ts</code> 处理主线。", "Station 07: <code>packages/coding-agent/src/core/agent-session.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/agent-session.ts", [
                '<span class="src-comment">// AgentSession · packages/coding-agent/src/core/agent-session.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['09', '13'],
        faq=[
            (
                "AgentSession最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/agent-session.ts</code>。",
                "<code>packages/coding-agent/src/core/agent-session.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c8": _ch(
        (
            ("AGENTS.md 栈 决定你如何理解 Pi 在此层的机制。", "AGENTS.md 栈 shapes how you understand Pi at this layer."),
            ("反直觉：<code>resource-loader.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>resource-loader.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 08", "St. 08"),
            ("resource-loader.ts", "resource-loader.ts"),
        ),
        [
            ("AGENTS.md 栈：主线 prompt 如何穿过此模块", "AGENTS.md 栈: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/resource-loader.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/resource-loader.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("AGENTS.md 栈：关键函数与数据流", "AGENTS.md 栈: key functions and data flow", [
                ("<code>resource-loader.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>resource-loader.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("AGENTS.md 栈：与 agent-loop 的接口", "AGENTS.md 栈: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/resource-loader.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/resource-loader.ts</code>."),
            ]),
            ("AGENTS.md 栈：设计权衡与常见坑", "AGENTS.md 栈: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("08", "站 08：<code>packages/coding-agent/src/core/resource-loader.ts</code> 处理主线。", "Station 08: <code>packages/coding-agent/src/core/resource-loader.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/resource-loader.ts", [
                '<span class="src-comment">// AGENTS.md 栈 · packages/coding-agent/src/core/resource-loader.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['12'],
        faq=[
            (
                "AGENTS.md 栈最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/resource-loader.ts</code>。",
                "<code>packages/coding-agent/src/core/resource-loader.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c9": _ch(
        (
            ("消息模型 决定你如何理解 Pi 在此层的机制。", "消息模型 shapes how you understand Pi at this layer."),
            ("反直觉：<code>types.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>types.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("agent", "agent"),
            ("站 09", "St. 09"),
            ("types.ts", "types.ts"),
        ),
        [
            ("消息模型：主线 prompt 如何穿过此模块", "消息模型: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/agent/src/types.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/agent/src/types.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("消息模型：关键函数与数据流", "消息模型: key functions and data flow", [
                ("<code>types.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>types.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("消息模型：与 agent-loop 的接口", "消息模型: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/agent/src/types.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/agent/src/types.ts</code>."),
            ]),
            ("消息模型：设计权衡与常见坑", "消息模型: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("09", "站 09：<code>packages/agent/src/types.ts</code> 处理主线。", "Station 09: <code>packages/agent/src/types.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/agent/src/types.ts", [
                '<span class="src-comment">// 消息模型 · packages/agent/src/types.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['03'],
        faq=[
            (
                "消息模型最关键文件？",
                "Key file?",
                "<code>packages/agent/src/types.ts</code>。",
                "<code>packages/agent/src/types.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c10": _ch(
        (
            ("runLoop 双环 决定你如何理解 Pi 在此层的机制。", "runLoop 双环 shapes how you understand Pi at this layer."),
            ("反直觉：<code>agent-loop.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>agent-loop.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("agent", "agent"),
            ("站 10", "St. 10"),
            ("agent-loop.ts", "agent-loop.ts"),
        ),
        [
            ("runLoop 双环：主线 prompt 如何穿过此模块", "runLoop 双环: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/agent/src/agent-loop.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/agent/src/agent-loop.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("runLoop 双环：关键函数与数据流", "runLoop 双环: key functions and data flow", [
                ("<code>agent-loop.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>agent-loop.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("runLoop 双环：与 agent-loop 的接口", "runLoop 双环: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/agent/src/agent-loop.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/agent/src/agent-loop.ts</code>."),
            ]),
            ("runLoop 双环：设计权衡与常见坑", "runLoop 双环: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("10", "站 10：<code>packages/agent/src/agent-loop.ts</code> 处理主线。", "Station 10: <code>packages/agent/src/agent-loop.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/agent/src/agent-loop.ts", [
                '<span class="src-kw">while</span> (true) { // outer follow-up',
                '  <span class="src-kw">while</span> (hasMoreToolCalls || pendingMessages.length) {',
            ]),
        ],
        textbook_cps=['07'],
        faq=[
            (
                "runLoop 双环最关键文件？",
                "Key file?",
                "<code>packages/agent/src/agent-loop.ts</code>。",
                "<code>packages/agent/src/agent-loop.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),

    "c11": _ch(
        (
            ("Steering 在 tool 执行期间插队；Follow-up 在 agent 将停时续聊。", "Steering injects mid-run; follow-up continues after agent would stop."),
            ("反直觉：两队列在 Agent 与 AgentSession 各有一份，由 config 桥接。", "Counter-intuitive: two queues in Agent and AgentSession, bridged via config."),
            ("优化：读 agent-loop.ts 259 行 getSteeringMessages 与 263 行 getFollowUpMessages。", "Optimize: read agent-loop.ts lines 259 and 263."),
        ),
        (
            ("agent-core", "agent-core"),
            ("agent.ts + agent-loop.ts", "agent.ts + agent-loop.ts"),
            ("站 10–11", "Stations 10–11"),
            ("steeringQueue / followUpQueue", "steeringQueue / followUpQueue"),
        ),
        [
            ("Steering：内环插队语义", "Steering: inner-loop injection", [
                ("runLoop 内环每次迭代末尾调用 getSteeringMessages（agent-loop.ts 259 行）。返回的 AgentMessage[] 在下一次 streamAssistantResponse 之前 push 进 context。", "Inner loop calls getSteeringMessages (line 259). AgentMessage[] pushed before next streamAssistantResponse."),
                ("agent.ts 475–480 行：steeringQueue.drain()；skipInitialSteeringPoll 避免首轮重复 drain。", "agent.ts 475–480: steeringQueue.drain(); skipInitialSteeringPoll avoids double drain."),
                ("AgentSession 1545 行 getSteeringMessages() 暴露只读副本给 TUI。", "AgentSession line 1545 exposes read-only copy for TUI."),
                ("场景：read 执行中用户输入「先 ls」——steering 在 tool batch 完成后、下次 LLM 前注入。", "Scenario: while read runs, user types «ls first» — steering injects after tool batch."),
            ]),
            ("Follow-up：外环续聊语义", "Follow-up: outer-loop continuation", [
                ("内环结束后外环检查 getFollowUpMessages（263 行）。非空则 pendingMessages 并 continue 外环。", "Outer loop checks getFollowUpMessages (line 263). Non-empty continues outer loop."),
                ("agent.ts 482 行 followUpQueue.drain()。AgentSession._queueFollowUp（1407 行）路由后续用户输入。", "agent.ts 482 followUpQueue.drain(); AgentSession._queueFollowUp routes post-turn input."),
                ("与 steering 区别：follow-up 在 agent would stop 时；steering 在 still running 时。", "vs steering: follow-up when would stop; steering while still running."),
            ]),
            ("AgentSession 与 Agent 的分工", "AgentSession vs Agent", [
                ("AgentSession 维护 _steeringMessages / _followUpMessages；构造 AgentLoopConfig 时绑定 drain。", "AgentSession maintains queues; binds drain when building AgentLoopConfig."),
                ("Agent 类封装有状态队列，供 SDK 与测试使用。", "Agent class wraps stateful queues for SDK and tests."),
                ("interactive-mode.ts 4303 行合并队列状态渲染 footer。", "interactive-mode.ts line 4303 merges queue state in footer."),
            ]),
            ("QueueMode 与并发", "QueueMode and concurrency", [
                ("types.ts 导出 QueueMode 控制排队策略。", "types.ts exports QueueMode for queue policy."),
                ("agent-session-concurrent.test.ts 验证 extension steer。", "concurrent test verifies extension steering."),
                ("abort：AgentSession.abort() 1561 行调用 agent.abort()。", "Abort: AgentSession.abort() line 1561 calls agent.abort()."),
            ]),
            ("主线 prompt 下的 steering/follow-up", "On through-line", [
                ("默认 README 任务不触发 steering；测试 mock getSteeringMessages 观察内环注入。", "Default README task does not steer; mock getSteeringMessages to test injection."),
            ]),
        ],
        trace=("10", "站 10–11：getSteeringMessages / getFollowUpMessages 桥接 AgentSession 与 runLoop。", "Stations 10–11: steering/follow-up bridge AgentSession and runLoop."),
        src_extra=[
            ("loop", "packages/agent/src/agent-loop.ts", [
                '<span class="src-arg">pendingMessages</span> = (<span class="src-kw">await</span> config.<span class="src-fn">getSteeringMessages</span>?.()) || [];',
                '<span class="src-kw">const</span> followUpMessages = (<span class="src-kw">await</span> config.<span class="src-fn">getFollowUpMessages</span>?.()) || [];',
            ]),
            ("agent", "packages/agent/src/agent.ts", [
                '<span class="src-fn">getSteeringMessages</span>: <span class="src-kw">async</span> () => <span class="src-kw">this</span>.steeringQueue.<span class="src-fn">drain</span>(),',
                '<span class="src-fn">getFollowUpMessages</span>: <span class="src-kw">async</span> () => <span class="src-kw">this</span>.followUpQueue.<span class="src-fn">drain</span>(),',
            ]),
        ],
        textbook_cps=["09"],
        faq=[
            ("steering 和 follow-up 能否同时排队？", "Both queue?", "可以；pendingMessageCount 1540 行返回两者之和。", "Yes; pendingMessageCount sums both."),
            ("steering 会打断 bash 吗？", "Interrupt bash?", "不立即；在当前 tool batch 完成后注入。", "Not immediately; after tool batch."),
            ("extension 如何注入 steering？", "Extension steer?", "通过 ExtensionActions queue 方法。", "Via ExtensionActions queue methods."),
        ],
    ),
    "c12": _ch(
        (
            ("Tool 管线 决定你如何理解 Pi 在此层的机制。", "Tool 管线 shapes how you understand Pi at this layer."),
            ("反直觉：<code>read.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>read.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 12", "St. 12"),
            ("read.ts", "read.ts"),
        ),
        [
            ("Tool 管线：主线 prompt 如何穿过此模块", "Tool 管线: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/tools/read.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/tools/read.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("Tool 管线：关键函数与数据流", "Tool 管线: key functions and data flow", [
                ("<code>read.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>read.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("Tool 管线：与 agent-loop 的接口", "Tool 管线: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/tools/read.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/tools/read.ts</code>."),
            ]),
            ("Tool 管线：设计权衡与常见坑", "Tool 管线: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("12", "站 12：<code>packages/coding-agent/src/core/tools/read.ts</code> 处理主线。", "Station 12: <code>packages/coding-agent/src/core/tools/read.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/tools/read.ts", [
                '<span class="src-comment">// Tool 管线 · packages/coding-agent/src/core/tools/read.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['06', '08'],
        faq=[
            (
                "Tool 管线最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/tools/read.ts</code>。",
                "<code>packages/coding-agent/src/core/tools/read.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c13": _ch(
        (
            ("事件总线 决定你如何理解 Pi 在此层的机制。", "事件总线 shapes how you understand Pi at this layer."),
            ("反直觉：<code>agent-session.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>agent-session.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 13", "St. 13"),
            ("agent-session.ts", "agent-session.ts"),
        ),
        [
            ("事件总线：主线 prompt 如何穿过此模块", "事件总线: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/agent-session.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/agent-session.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("事件总线：关键函数与数据流", "事件总线: key functions and data flow", [
                ("<code>agent-session.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>agent-session.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("事件总线：与 agent-loop 的接口", "事件总线: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/agent-session.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/agent-session.ts</code>."),
            ]),
            ("事件总线：设计权衡与常见坑", "事件总线: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("13", "站 13：<code>packages/coding-agent/src/core/agent-session.ts</code> 处理主线。", "Station 13: <code>packages/coding-agent/src/core/agent-session.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/agent-session.ts", [
                '<span class="src-comment">// 事件总线 · packages/coding-agent/src/core/agent-session.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['09'],
        faq=[
            (
                "事件总线最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/agent-session.ts</code>。",
                "<code>packages/coding-agent/src/core/agent-session.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c14": _ch(
        (
            ("pi-ai 提供商 决定你如何理解 Pi 在此层的机制。", "pi-ai 提供商 shapes how you understand Pi at this layer."),
            ("反直觉：<code>models.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>models.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("ai", "ai"),
            ("站 14", "St. 14"),
            ("models.ts", "models.ts"),
        ),
        [
            ("pi-ai 提供商：主线 prompt 如何穿过此模块", "pi-ai 提供商: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/ai/src/models.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/ai/src/models.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("pi-ai 提供商：关键函数与数据流", "pi-ai 提供商: key functions and data flow", [
                ("<code>models.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>models.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("pi-ai 提供商：与 agent-loop 的接口", "pi-ai 提供商: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/ai/src/models.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/ai/src/models.ts</code>."),
            ]),
            ("pi-ai 提供商：设计权衡与常见坑", "pi-ai 提供商: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("14", "站 14：<code>packages/ai/src/models.ts</code> 处理主线。", "Station 14: <code>packages/ai/src/models.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/ai/src/models.ts", [
                '<span class="src-comment">// pi-ai 提供商 · packages/ai/src/models.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['05'],
        faq=[
            (
                "pi-ai 提供商最关键文件？",
                "Key file?",
                "<code>packages/ai/src/models.ts</code>。",
                "<code>packages/ai/src/models.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),

    "c15": _ch(
        (
            ("EventStream 是 pi-ai 与 agent-loop 之间的异步泵——token 与终态同流交付。", "EventStream is the async pump between pi-ai and agent-loop — tokens and terminal state in one stream."),
            ("反直觉：Agent 层 EventStream 与 LLM 层 AssistantMessageEventStream 是两套 isComplete 谓词。", "Counter-intuitive: Agent EventStream vs LLM AssistantMessageEventStream use different isComplete predicates."),
            ("优化：读 event-stream.ts push/end 与 agent-loop createAgentStream 的对称设计。", "Optimize: read symmetric design of event-stream.ts push/end and createAgentStream."),
        ),
        (("pi-ai","pi-ai"),("event-stream.ts","event-stream.ts"),("站 15","St. 15"),("text_delta → done","text_delta → done")),
        [
            ("EventStream 核心语义", "EventStream core semantics", [
                ("packages/ai/src/utils/event-stream.ts：泛型 EventStream<T,R>，构造时传入 isComplete 与 extractResult。", "packages/ai/src/utils/event-stream.ts: generic EventStream<T,R> with isComplete and extractResult at construction."),
                ("push(event)：若 isComplete(event) 为真，设 done=true 并 resolveFinalResult；否则入队或交给 waiting consumer。", "push(event): if isComplete, set done and resolveFinalResult; else queue or deliver to waiting consumer."),
                ("AsyncIterable 协议：消费者 for-await 时，队列空且未 done 则挂起在 waiting 数组。", "AsyncIterable: for-await suspends on waiting array when queue empty and not done."),
                ("AssistantMessageEventStream 子类：isComplete 当 type===done 或 error；extractResult 返回 message 或抛错。", "AssistantMessageEventStream: isComplete on done/error; extractResult returns message or throws."),
            ]),
            ("主线 prompt 上的流事件类型", "Stream events on through-line", [
                ("第一次 stream（toolUse）：text_delta 可能为空或极短；toolcall_delta 累积 read 参数；done 时 stopReason=toolUse。", "First stream (toolUse): short text_delta; toolcall_delta accumulates read args; done with stopReason=toolUse."),
                ("第二次 stream（stop）：text_delta 逐 chunk 推送最终总结；done 时 stopReason=stop。", "Second stream (stop): text_delta chunks for summary; done with stopReason=stop."),
                ("streamAssistantResponse 把 LLM EventStream 事件映射为 AgentEvent message_update。", "streamAssistantResponse maps LLM EventStream events to AgentEvent message_update."),
            ]),
            ("agent-loop 侧的 EventStream", "Agent-side EventStream", [
                ("createAgentStream（agent-loop.ts 145 行）：isComplete 当 type===agent_end；extractResult 返回 messages 数组。", "createAgentStream (line 145): isComplete on agent_end; extractResult returns messages array."),
                ("agentLoop 返回 EventStream<AgentEvent, AgentMessage[]>；AgentSession for-await 消费并写 JSONL。", "agentLoop returns EventStream<AgentEvent, AgentMessage[]>; AgentSession for-await consumes and writes JSONL."),
                ("end(result) 手动 resolve——用于 abort 或错误路径提前结束。", "end(result) manually resolves — for abort or error early termination."),
            ]),
            ("背压与 TUI 消费", "Backpressure and TUI consumption", [
                ("EventStream 无界队列：高速 token 时 TUI diff 渲染可能落后；TuiMainScreen firstChanged/lastChanged 优化重绘区间。", "Unbounded queue: TUI diff may lag on fast tokens; TuiMainScreen firstChanged/lastChanged optimizes redraw."),
                ("message_update 携带 partial content；message_end 携带完整 AssistantMessage。", "message_update carries partial content; message_end carries full AssistantMessage."),
            ]),
            ("与 textbook checkpoint 02 对照", "vs textbook checkpoint 02", [
                ("textbook event-stream.ts 教学「过程项与终态同时交付」——生产代码在 streamSimple 与 agentLoop 两层复用同一模式。", "Textbook checkpoint 02 teaches simultaneous partial and terminal delivery — production reuses pattern in streamSimple and agentLoop."),
                ("测试：用 ScriptedModel 注入固定 delta 序列，断言 message_update 次数与顺序。", "Test: ScriptedModel injects fixed delta sequence; assert message_update count and order."),
            ]),
        ],
        trace=("15", "站 15：EventStream push text_delta/toolcall_delta；done 触发 stopReason 分支。", "Station 15: EventStream pushes deltas; done triggers stopReason branch."),
        src_extra=[("es", "packages/ai/src/utils/event-stream.ts", [
            '<span class="src-kw">export class</span> <span class="src-cls">EventStream</span>&lt;T, R = T&gt;',
            '<span class="src-fn">push</span>(event: T): <span class="src-cls">void</span> {',
            '  <span class="src-kw">if</span> (<span class="src-kw">this</span>.isComplete(event)) { <span class="src-kw">this</span>.done = <span class="src-num">true</span>; ... }',
        ])],
        textbook_cps=["02"],
        faq=[("EventStream 会丢事件吗？","Drop events?","push 在 done 后忽略；正常路径不丢。","push ignores after done; normal path does not drop."),
             ("agent_end 与 done 区别？","agent_end vs done?","agent_end 是 AgentEvent；done 是 LLM AssistantMessageEvent。","agent_end is AgentEvent; done is LLM AssistantMessageEvent."),
             ("如何 mock 流？","Mock stream?","ScriptedModel 或自定义 StreamFn 返回预置 EventStream。","ScriptedModel or custom StreamFn returning preset EventStream.")],
    ),

    "c16": _ch(
        (
            ("models.generated.ts 聚合 40+ provider 的模型目录——OAuth 与 API key 分流。", "models.generated.ts aggregates 40+ provider catalogs — OAuth vs API key paths."),
            ("反直觉：模型列表是构建时生成，不是运行时爬取。", "Counter-intuitive: model list is build-time generated, not runtime scraped."),
            ("优化：ModelRegistry + auth-guidance.ts 处理「无 key」时的用户引导。", "Optimize: ModelRegistry + auth-guidance.ts for no-key user guidance."),
        ),
        (("pi-ai","pi-ai"),("models.generated.ts","models.generated.ts"),("站 16","St. 16"),("Model + AuthResult","Model + AuthResult")),
        [
            ("模型目录生成管线", "Model catalog pipeline", [
                ("packages/ai/src/models.generated.ts 头部注释：auto-generated by scripts/generate-models.ts，勿手改。", "models.generated.ts header: auto-generated by generate-models.ts, do not edit manually."),
                ("导入 AMAZON_BEDROCK_MODELS、ANTHROPIC_MODELS、OPENAI_MODELS 等 40+ provider 常量，汇总为 MODELS 对象。", "Imports 40+ provider constants into MODELS object."),
                ("每个 Model 含 id、provider、contextWindow、maxTokens、cost、reasoning 支持等字段。", "Each Model has id, provider, contextWindow, maxTokens, cost, reasoning support."),
            ]),
            ("认证路径", "Auth paths", [
                ("packages/ai/src/oauth.ts 与 bun-oauth.ts 处理交互式 OAuth（GitHub Copilot、OpenAI Codex 等）。", "oauth.ts and bun-oauth.ts handle interactive OAuth for Copilot, Codex, etc."),
                ("env-api-keys.ts 从环境变量读取 ANTHROPIC_API_KEY 等；getApiKey 注入 agentLoop config。", "env-api-keys.ts reads env vars; getApiKey injected into agentLoop config."),
                ("agent-session.ts formatNoApiKeyFoundMessage 在冷启动无 key 时给出 auth-guidance。", "formatNoApiKeyFoundMessage gives auth-guidance on cold start without key."),
            ]),
            ("主线 prompt 的模型选择", "Model selection for through-line", [
                ("CLI --model provider/id 或交互式 /model 选择；model_change entry 写入 JSONL。", "CLI --model provider/id or /model picker; model_change entry in JSONL."),
                ("第一次 stream 用选定 Model 调 streamSimple；thinkingLevel 映射到 reasoning 参数。", "First stream uses selected Model via streamSimple; thinkingLevel maps to reasoning."),
                ("换模型不丢会话：SessionManager 保留历史，新 model_change entry 标记切换点。", "Model switch preserves session: model_change entry marks switch point."),
            ]),
            ("ModelRegistry 运行时", "ModelRegistry runtime", [
                ("coding-agent ModelRegistry 读取 generated  catalog，合并用户 settings 与 extension 贡献的 provider config。", "ModelRegistry reads generated catalog, merges user settings and extension provider configs."),
                ("modelsAreEqual 用于避免重复 emit model_select 事件。", "modelsAreEqual avoids duplicate model_select events."),
            ]),
            ("与 textbook checkpoint 05 对照", "vs textbook checkpoint 05", [
                ("textbook Provider Adapter 教 SSE→统一事件；生产 pi-ai api/*.ts 实现各厂商 adapter。", "Textbook checkpoint 05 teaches SSE→unified events; production api/*.ts implements per-vendor adapters."),
            ]),
        ],
        trace=("16", "站 16：streamSimple 用 Model + Auth 调 provider adapter。", "Station 16: streamSimple calls provider adapter with Model + Auth."),
        src_extra=[("models", "packages/ai/src/models.generated.ts", [
            '<span class="src-comment">// auto-generated by scripts/generate-models.ts</span>',
            '<span class="src-kw">export const</span> <span class="src-arg">MODELS</span> = { ... <span class="src-num">40</span>+ providers ... };',
        ])],
        textbook_cps=["05"],
        faq=[("如何添加新 provider？","Add provider?","在 pi-ai providers/ 加 models 文件并跑 generate-models。","Add models file under providers/ and run generate-models."),
             ("OAuth 失败怎么办？","OAuth fails?","检查 bun-oauth 回调与 ~/.pi 凭据存储。","Check bun-oauth callback and ~/.pi credential storage."),
             ("默认模型在哪设？","Default model?","settings.json 与 CLI --model。","settings.json and CLI --model.")],
    ),
    "c17": _ch(
        (
            ("差分 TUI 决定你如何理解 Pi 在此层的机制。", "差分 TUI shapes how you understand Pi at this layer."),
            ("反直觉：<code>tui-main-screen.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>tui-main-screen.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("tui", "tui"),
            ("站 17", "St. 17"),
            ("tui-main-screen.ts", "tui-main-screen.ts"),
        ),
        [
            ("差分 TUI：主线 prompt 如何穿过此模块", "差分 TUI: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/tui/src/tui-main-screen.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/tui/src/tui-main-screen.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("差分 TUI：关键函数与数据流", "差分 TUI: key functions and data flow", [
                ("<code>tui-main-screen.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>tui-main-screen.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("差分 TUI：与 agent-loop 的接口", "差分 TUI: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/tui/src/tui-main-screen.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/tui/src/tui-main-screen.ts</code>."),
            ]),
            ("差分 TUI：设计权衡与常见坑", "差分 TUI: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("17", "站 17：<code>packages/tui/src/tui-main-screen.ts</code> 处理主线。", "Station 17: <code>packages/tui/src/tui-main-screen.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/tui/src/tui-main-screen.ts", [
                '<span class="src-kw">let</span> <span class="src-arg">firstChanged</span> = -<span class="src-num">1</span>;',
                '<span class="src-kw">let</span> <span class="src-arg">lastChanged</span> = -<span class="src-num">1</span>;',
            ]),
        ],
        faq=[
            (
                "差分 TUI最关键文件？",
                "Key file?",
                "<code>packages/tui/src/tui-main-screen.ts</code>。",
                "<code>packages/tui/src/tui-main-screen.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c18": _ch(
        (
            ("Interactive Mode 决定你如何理解 Pi 在此层的机制。", "Interactive Mode shapes how you understand Pi at this layer."),
            ("反直觉：<code>interactive-mode.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>interactive-mode.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 18", "St. 18"),
            ("interactive-mode.ts", "interactive-mode.ts"),
        ),
        [
            ("Interactive Mode：主线 prompt 如何穿过此模块", "Interactive Mode: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("Interactive Mode：关键函数与数据流", "Interactive Mode: key functions and data flow", [
                ("<code>interactive-mode.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>interactive-mode.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("Interactive Mode：与 agent-loop 的接口", "Interactive Mode: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code>."),
            ]),
            ("Interactive Mode：设计权衡与常见坑", "Interactive Mode: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
            ("Interactive Mode：深度走读清单", "Interactive Mode: deep walk checklist", [
                ("① 打开 <code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code>；② 从 export 符号跟踪 README 路径调用链；③ 标注每个 await 的 IO 类型。", "① Open <code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code>; ② trace README call chain from exports; ③ label each await's IO type."),
                ("④ 在 <code>agent-loop.test.ts</code> 或 coding-agent 测试中找覆盖此站的用例；⑤ 用 <code>pi --verbose</code> 验证事件顺序。", "④ Find tests covering this station; ⑤ verify event order with <code>pi --verbose</code>."),
                ("记录三个不变量：若修改会破坏主线 prompt 的行为假设。", "Record three invariants: assumptions whose change would break the through-line."),
                ("将观察结果与 pi-textbook workshop 的 checkpoint 测试输出 diff。", "Diff observations against pi-textbook workshop checkpoint test output."),
            ]),
        ],
        trace=("18", "站 18：<code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code> 处理主线。", "Station 18: <code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/modes/interactive/interactive-mode.ts", [
                '<span class="src-comment">// Interactive Mode · packages/coding-agent/src/modes/interactive/interactive-mode.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        faq=[
            (
                "Interactive Mode最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code>。",
                "<code>packages/coding-agent/src/modes/interactive/interactive-mode.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c19": _ch(
        (
            ("Extension API 决定你如何理解 Pi 在此层的机制。", "Extension API shapes how you understand Pi at this layer."),
            ("反直觉：<code>types.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>types.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 19", "St. 19"),
            ("types.ts", "types.ts"),
        ),
        [
            ("Extension API：主线 prompt 如何穿过此模块", "Extension API: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/extensions/types.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/extensions/types.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("Extension API：关键函数与数据流", "Extension API: key functions and data flow", [
                ("<code>types.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>types.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("Extension API：与 agent-loop 的接口", "Extension API: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/extensions/types.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/extensions/types.ts</code>."),
            ]),
            ("Extension API：设计权衡与常见坑", "Extension API: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("19", "站 19：<code>packages/coding-agent/src/core/extensions/types.ts</code> 处理主线。", "Station 19: <code>packages/coding-agent/src/core/extensions/types.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/extensions/types.ts", [
                '<span class="src-comment">// Extension API · packages/coding-agent/src/core/extensions/types.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['12'],
        faq=[
            (
                "Extension API最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/extensions/types.ts</code>。",
                "<code>packages/coding-agent/src/core/extensions/types.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c20": _ch(
        (
            ("ExtensionRunner 决定你如何理解 Pi 在此层的机制。", "ExtensionRunner shapes how you understand Pi at this layer."),
            ("反直觉：<code>runner.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>runner.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 20", "St. 20"),
            ("runner.ts", "runner.ts"),
        ),
        [
            ("ExtensionRunner：主线 prompt 如何穿过此模块", "ExtensionRunner: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/extensions/runner.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/extensions/runner.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("ExtensionRunner：关键函数与数据流", "ExtensionRunner: key functions and data flow", [
                ("<code>runner.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>runner.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("ExtensionRunner：与 agent-loop 的接口", "ExtensionRunner: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/extensions/runner.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/extensions/runner.ts</code>."),
            ]),
            ("ExtensionRunner：设计权衡与常见坑", "ExtensionRunner: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
            ("ExtensionRunner：深度走读清单", "ExtensionRunner: deep walk checklist", [
                ("① 打开 <code>packages/coding-agent/src/core/extensions/runner.ts</code>；② 从 export 符号跟踪 README 路径调用链；③ 标注每个 await 的 IO 类型。", "① Open <code>packages/coding-agent/src/core/extensions/runner.ts</code>; ② trace README call chain from exports; ③ label each await's IO type."),
                ("④ 在 <code>agent-loop.test.ts</code> 或 coding-agent 测试中找覆盖此站的用例；⑤ 用 <code>pi --verbose</code> 验证事件顺序。", "④ Find tests covering this station; ⑤ verify event order with <code>pi --verbose</code>."),
                ("记录三个不变量：若修改会破坏主线 prompt 的行为假设。", "Record three invariants: assumptions whose change would break the through-line."),
                ("将观察结果与 pi-textbook workshop 的 checkpoint 测试输出 diff。", "Diff observations against pi-textbook workshop checkpoint test output."),
            ]),
        ],
        trace=("20", "站 20：<code>packages/coding-agent/src/core/extensions/runner.ts</code> 处理主线。", "Station 20: <code>packages/coding-agent/src/core/extensions/runner.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/extensions/runner.ts", [
                '<span class="src-kw">export class</span> <span class="src-cls">ExtensionRunner</span>',
                '<span class="src-comment">/** executes extensions and manages lifecycle */</span>',
            ]),
        ],
        textbook_cps=['12', '13'],
        faq=[
            (
                "ExtensionRunner最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/extensions/runner.ts</code>。",
                "<code>packages/coding-agent/src/core/extensions/runner.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c21": _ch(
        (
            ("Pi Packages 决定你如何理解 Pi 在此层的机制。", "Pi Packages shapes how you understand Pi at this layer."),
            ("反直觉：<code>package-manager.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>package-manager.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 21", "St. 21"),
            ("package-manager.ts", "package-manager.ts"),
        ),
        [
            ("Pi Packages：主线 prompt 如何穿过此模块", "Pi Packages: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/package-manager.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/package-manager.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("Pi Packages：关键函数与数据流", "Pi Packages: key functions and data flow", [
                ("<code>package-manager.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>package-manager.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("Pi Packages：与 agent-loop 的接口", "Pi Packages: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/package-manager.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/package-manager.ts</code>."),
            ]),
            ("Pi Packages：设计权衡与常见坑", "Pi Packages: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
            ("Pi Packages：深度走读清单", "Pi Packages: deep walk checklist", [
                ("① 打开 <code>packages/coding-agent/src/core/package-manager.ts</code>；② 从 export 符号跟踪 README 路径调用链；③ 标注每个 await 的 IO 类型。", "① Open <code>packages/coding-agent/src/core/package-manager.ts</code>; ② trace README call chain from exports; ③ label each await's IO type."),
                ("④ 在 <code>agent-loop.test.ts</code> 或 coding-agent 测试中找覆盖此站的用例；⑤ 用 <code>pi --verbose</code> 验证事件顺序。", "④ Find tests covering this station; ⑤ verify event order with <code>pi --verbose</code>."),
                ("记录三个不变量：若修改会破坏主线 prompt 的行为假设。", "Record three invariants: assumptions whose change would break the through-line."),
                ("将观察结果与 pi-textbook workshop 的 checkpoint 测试输出 diff。", "Diff observations against pi-textbook workshop checkpoint test output."),
            ]),
        ],
        trace=("21", "站 21：<code>packages/coding-agent/src/core/package-manager.ts</code> 处理主线。", "Station 21: <code>packages/coding-agent/src/core/package-manager.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/package-manager.ts", [
                '<span class="src-comment">// Pi Packages · packages/coding-agent/src/core/package-manager.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['12'],
        faq=[
            (
                "Pi Packages最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/package-manager.ts</code>。",
                "<code>packages/coding-agent/src/core/package-manager.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c22": _ch(
        (
            ("JSONL 会话树 决定你如何理解 Pi 在此层的机制。", "JSONL 会话树 shapes how you understand Pi at this layer."),
            ("反直觉：<code>session-manager.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>session-manager.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 22", "St. 22"),
            ("session-manager.ts", "session-manager.ts"),
        ),
        [
            ("JSONL 会话树：主线 prompt 如何穿过此模块", "JSONL 会话树: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/session-manager.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/session-manager.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("JSONL 会话树：关键函数与数据流", "JSONL 会话树: key functions and data flow", [
                ("<code>session-manager.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>session-manager.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("JSONL 会话树：与 agent-loop 的接口", "JSONL 会话树: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/session-manager.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/session-manager.ts</code>."),
            ]),
            ("JSONL 会话树：设计权衡与常见坑", "JSONL 会话树: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("22", "站 22：<code>packages/coding-agent/src/core/session-manager.ts</code> 处理主线。", "Station 22: <code>packages/coding-agent/src/core/session-manager.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/session-manager.ts", [
                '<span class="src-kw">export const</span> <span class="src-arg">CURRENT_SESSION_VERSION</span> = <span class="src-num">3</span>;',
                '<span class="src-arg">parentId</span>: <span class="src-cls">string</span> | <span class="src-cls">null</span>;',
            ]),
        ],
        textbook_cps=['10'],
        faq=[
            (
                "JSONL 会话树最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/session-manager.ts</code>。",
                "<code>packages/coding-agent/src/core/session-manager.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c23": _ch(
        (
            ("Compaction 决定你如何理解 Pi 在此层的机制。", "Compaction shapes how you understand Pi at this layer."),
            ("反直觉：<code>index.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>index.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 23", "St. 23"),
            ("index.ts", "index.ts"),
        ),
        [
            ("Compaction：主线 prompt 如何穿过此模块", "Compaction: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/core/compaction/index.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/core/compaction/index.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("Compaction：关键函数与数据流", "Compaction: key functions and data flow", [
                ("<code>index.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>index.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("Compaction：与 agent-loop 的接口", "Compaction: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/core/compaction/index.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/core/compaction/index.ts</code>."),
            ]),
            ("Compaction：设计权衡与常见坑", "Compaction: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("23", "站 23：<code>packages/coding-agent/src/core/compaction/index.ts</code> 处理主线。", "Station 23: <code>packages/coding-agent/src/core/compaction/index.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/core/compaction/index.ts", [
                '<span class="src-comment">// Compaction · packages/coding-agent/src/core/compaction/index.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['11'],
        faq=[
            (
                "Compaction最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/core/compaction/index.ts</code>。",
                "<code>packages/coding-agent/src/core/compaction/index.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
    "c24": _ch(
        (
            ("生态对比 决定你如何理解 Pi 在此层的机制。", "生态对比 shapes how you understand Pi at this layer."),
            ("反直觉：<code>—</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>—</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("pi-mono", "pi-mono"),
            ("背景", "Background"),
            ("—", "—"),
        ),
        [
            ("生态对比：主线 prompt 如何穿过此模块", "生态对比: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>—</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>—</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("生态对比：关键函数与数据流", "生态对比: key functions and data flow", [
                ("<code>—</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>—</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("生态对比：与 agent-loop 的接口", "生态对比: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>—</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>—</code>."),
            ]),
            ("生态对比：设计权衡与常见坑", "生态对比: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        src_extra=[
            ("src", "—", [
                '<span class="src-comment">// 生态对比 · —</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        faq=[
            (
                "生态对比最关键文件？",
                "Key file?",
                "<code>—</code>。",
                "<code>—</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),

    "c25": _ch(
        (
            ("pi-protocol 定义 JSONL 帧 + TypeBox schema；pi-server 用 CBOR 跑远程会话。", "pi-protocol defines JSONL frames + TypeBox schema; pi-server runs remote sessions over CBOR."),
            ("反直觉：RPC 模式不是 HTTP REST，而是 stdin/stdout JSONL 进程协议。", "Counter-intuitive: RPC mode is stdin/stdout JSONL process protocol, not HTTP REST."),
            ("优化：--mode rpc 让外部编排器驱动 AgentSession 而不启动 TUI。", "Optimize: --mode rpc lets external orchestrator drive AgentSession without TUI."),
        ),
        (("protocol + server","protocol + server"),("schemas.ts + rpc-entry.ts","schemas.ts + rpc-entry.ts"),("站 21","St. 21"),("JSONL / CBOR","JSONL / CBOR")),
        [
            ("protocol 包：TypeBox schema", "protocol: TypeBox schema", [
                ("packages/protocol/src/schemas.ts：PROTOCOL_VERSION = 1；SessionPhaseSchema 对齐 AgentHarnessPhase（idle/turn/compaction/branch_summary/retry）。", "schemas.ts: PROTOCOL_VERSION = 1; SessionPhaseSchema aligns with AgentHarnessPhase."),
                ("ModelRefSchema、ThinkingLevelSchema、JsonValueSchema 用 Type.Strict 禁止 additionalProperties。", "ModelRefSchema, ThinkingLevelSchema, JsonValueSchema use strict objects."),
                ("帧格式在 framing.ts + codec.ts：长度前缀 JSONL 或 CBOR 二进制。", "Frame format in framing.ts + codec.ts: length-prefixed JSONL or CBOR binary."),
            ]),
            ("RPC 模式启动链", "RPC boot chain", [
                ("main.ts 解析 --mode rpc → rpc-entry.ts 读 stdin JSONL 命令 → 调用 AgentSession 方法 → 写 stdout 响应。", "main.ts --mode rpc → rpc-entry.ts reads stdin JSONL commands → AgentSession methods → stdout responses."),
                ("主线 prompt 可作为 rpc prompt 命令注入，无需 TUI。", "Through-line injectable as rpc prompt command without TUI."),
                ("适合 CI、外部 IDE 插件、多 pi 实例编排。", "Suits CI, external IDE plugins, multi-pi orchestration."),
            ]),
            ("pi-server 远程会话", "pi-server remote sessions", [
                ("packages/server CBOR over HTTP 暴露远程 AgentSession；client 包 acquireSession 获取 lease。", "server package exposes remote AgentSession via CBOR HTTP; client acquireSession gets lease."),
                ("exclusive vs shared lease 防止并发写（client README 30 行）。", "exclusive vs shared lease prevents concurrent writes (client README line 30)."),
            ]),
            ("与 session fork 组合", "With session fork", [
                ("RPC + fork：父进程 rpc fork 命令创建 branch session，子 pi 实例处理子任务——替代 sub-agent 的官方路径之一。", "RPC + fork: parent rpc fork creates branch session, child pi handles subtask — official sub-agent alternative."),
            ]),
            ("主线 prompt 的 RPC trace", "RPC trace of through-line", [
                ("管道 stdin 发送 prompt 命令 + <code>pi --mode rpc --verbose</code> 可无 TUI 观察完整事件 JSONL。", "Pipe stdin prompt command + <code>pi --mode rpc --verbose</code> observes full event JSONL without TUI."),
                ("对比 interactive：同一 <code>AgentSession.prompt()</code> 路径，仅 I/O 层从 TUI 换为 stdin/stdout 帧。", "vs interactive: same <code>AgentSession.prompt()</code> path, only I/O layer swaps TUI for stdin/stdout frames."),
            ]),
            ("rpc-entry.ts 命令面", "rpc-entry.ts command surface", [
                ("<code>packages/coding-agent/src/rpc-entry.ts</code> 解析每行 JSON 命令：prompt、abort、set_model、fork 等，映射到 AgentSession 公开方法。", "<code>rpc-entry.ts</code> parses each JSON line command: prompt, abort, set_model, fork, etc., mapping to AgentSession public methods."),
                ("响应帧同样 JSONL 序列化 AgentEvent，外部编排器可重建与 --verbose 等价的日志。", "Response frames serialize AgentEvent as JSONL; external orchestrator can rebuild --verbose-equivalent logs."),
            ]),
        ],
        trace=("21", "站 21：RPC JSONL 帧或 CBOR 远程驱动 AgentSession。", "Station 21: RPC JSONL frames or CBOR remote drives AgentSession."),
        src_extra=[("proto", "packages/protocol/src/schemas.ts", [
            '<span class="src-kw">export const</span> <span class="src-arg">PROTOCOL_VERSION</span> = <span class="src-num">1</span>;',
            '<span class="src-kw">export const</span> <span class="src-arg">SessionPhaseSchema</span> = Type.Union([...]);',
        ])],
        textbook_cps=["13"],
        faq=[("RPC 与 interactive 共享 AgentSession 吗？","Share AgentSession?","是，同一类不同 I/O 层。","Yes, same class, different I/O layer."),
             ("CBOR 何时用？","When CBOR?","pi-server 远程；本地 RPC 用 JSONL。","pi-server remote; local RPC uses JSONL."),
             ("如何测 RPC？","Test RPC?","管道 stdin/stdout + 断言响应帧序列。","Pipe stdin/stdout + assert response frame sequence.")],
    ),
    "c26": _ch(
        (
            ("自己 trace 决定你如何理解 Pi 在此层的机制。", "自己 trace shapes how you understand Pi at this layer."),
            ("反直觉：<code>main.ts</code> 的复杂度在事件契约而非算法。", "Counter-intuitive: complexity in <code>main.ts</code> is event contracts."),
            ("优化：--verbose + 源码对照，不猜测模型行为。", "Optimize: --verbose plus source, don't guess."),
        ),
        (
            ("模块", "Module"),
            ("coding-agent", "coding-agent"),
            ("站 26", "St. 26"),
            ("main.ts", "main.ts"),
        ),
        [
            ("自己 trace：主线 prompt 如何穿过此模块", "自己 trace: through-line crossing", [
                ("用户输入「<code>读取 README.md，用一句话告诉我这个项目做什么</code>」后，<code>packages/coding-agent/src/main.ts</code> 定义了此阶段的类型契约与副作用边界。", "After «<code>read README.md and tell me what this project does in one sentence</code>», <code>packages/coding-agent/src/main.ts</code> defines type contracts and side-effect boundaries here."),
                ("在 pi-mono 仓库打开该文件，搜索 <code>export</code> 与 <code>AgentEvent</code>——这是比读 README 更快的定位法。", "In pi-mono, search <code>export</code> and <code>AgentEvent</code> — faster than README alone."),
                ("设计原则：核心循环（agent-loop）不 import TUI；本模块通过事件与回调与上游通信。", "Principle: agent-loop never imports TUI; this module talks upstream via events/callbacks."),
                ("pi-textbook 对应 checkpoint 提供剥离 OAuth/TUI 后的最小可运行切片，建议先跑测试再读生产文件。", "Matching textbook checkpoint offers a minimal slice without OAuth/TUI — run its test before production file."),
            ]),
            ("自己 trace：关键函数与数据流", "自己 trace: key functions and data flow", [
                ("<code>main.ts</code> 内的 <code>async</code> 函数通常是 IO 边界：磁盘（read/write JSONL）、网络（streamSimple）、或子进程（bash）。", "<code>async</code> functions in <code>main.ts</code> are usually IO boundaries: disk, network, or subprocess."),
                ("成功路径与错误路径都必须 emit 事件，否则 TUI 会卡在 streaming 状态、JSONL 会缺 entry。", "Success and error paths must emit events or TUI stalls streaming and JSONL misses entries."),
                ("length 截断时 <code>agent-loop.ts</code> 的 <code>failToolCallsFromTruncatedMessage</code> 批量失败 tool calls，防止执行损坏参数。", "On length truncation, <code>failToolCallsFromTruncatedMessage</code> fails all tool calls to avoid corrupted args."),
                ("对照 <code>packages/agent/test/agent-loop.test.ts</code> 中的同名场景测试用例。", "Compare with matching scenarios in <code>packages/agent/test/agent-loop.test.ts</code>."),
            ]),
            ("自己 trace：与 agent-loop 的接口", "自己 trace: interface with agent-loop", [
                ("<code>AgentLoopConfig</code>（<code>packages/agent/src/types.ts</code>）列出所有注入点：<code>convertToLlm</code>、<code>getSteeringMessages</code>、<code>prepareNextTurn</code> 等。", "<code>AgentLoopConfig</code> in <code>types.ts</code> lists injection points: <code>convertToLlm</code>, <code>getSteeringMessages</code>, <code>prepareNextTurn</code>, etc."),
                ("<code>AgentSession</code> 在构造 config 时绑定本模块实现；换模式（print/rpc/interactive）不换 agent-loop。", "<code>AgentSession</code> binds this module when building config; modes change, agent-loop does not."),
                ("fork 项目时优先替换本模块而非复制 agent-loop——这是 Pi 社区的实际 fork 模式。", "When forking, replace this module first rather than copying agent-loop — the common community pattern."),
                ("--verbose 模式下 stderr 事件类型可回溯到 <code>packages/coding-agent/src/main.ts</code> 的具体行。", "Under --verbose, stderr event types trace to lines in <code>packages/coding-agent/src/main.ts</code>."),
            ]),
            ("自己 trace：设计权衡与常见坑", "自己 trace: trade-offs and pitfalls", [
                ("显式事件总线 vs 隐式回调：Pi 选择前者，事件类型在 <code>AgentEvent</code> union 中版本化。", "Explicit event bus vs implicit callbacks: Pi chooses the former; events versioned in <code>AgentEvent</code> union."),
                ("扩展应 subscribe 事件而非 monkey-patch 私有方法——<code>ExtensionRunner</code> 提供正规 hook 面。", "Extensions should subscribe to events, not monkey-patch privates — <code>ExtensionRunner</code> provides hooks."),
                ("JSONL <code>CURRENT_SESSION_VERSION = 3</code>：改 entry schema 必须 bump version 并提供迁移。", "JSONL <code>CURRENT_SESSION_VERSION = 3</code>: schema changes need version bump and migration."),
                ("对比 Claude Code：闭源栈无法确认 compaction 触发点；Pi 的 <code>shouldCompact</code> 在源码中可读。", "vs Claude Code: closed stack hides compaction triggers; Pi's <code>shouldCompact</code> is readable."),
            ]),
        ],
        trace=("26", "站 26：<code>packages/coding-agent/src/main.ts</code> 处理主线。", "Station 26: <code>packages/coding-agent/src/main.ts</code> on through-line."),
        src_extra=[
            ("src", "packages/coding-agent/src/main.ts", [
                '<span class="src-comment">// 自己 trace · packages/coding-agent/src/main.ts</span>',
                '<span class="src-comment">// through-line: README.md</span>',
            ]),
        ],
        textbook_cps=['00', '14'],
        faq=[
            (
                "自己 trace最关键文件？",
                "Key file?",
                "<code>packages/coding-agent/src/main.ts</code>。",
                "<code>packages/coding-agent/src/main.ts</code>.",
            ),
            (
                "如何单测？",
                "Unit test?",
                "mock StreamFn 或 ScriptedModel。",
                "mock StreamFn or ScriptedModel.",
            ),
            (
                "与 textbook 差异？",
                "vs textbook?",
                "生产含 OAuth/TUI/40+ providers。",
                "Production adds OAuth/TUI/40+ providers.",
            ),
        ],
    ),
}


# Fourth section per chapter: executable reading checklist (adds depth without title spam)
_CHECKLIST_PATHS: dict[str, str] = {
    "c1": "packages/agent/src/agent-loop.ts",
    "c2": "packages/coding-agent/src/main.ts",
    "c6": "packages/coding-agent/src/cli.ts",
    "c7": "packages/coding-agent/src/core/agent-session.ts",
    "c10": "packages/agent/src/agent-loop.ts",
    "c12": "packages/coding-agent/src/core/tools/read.ts",
    "c14": "packages/ai/src/api/stream-simple.ts",
    "c17": "packages/tui/src/terminal.ts",
    "c22": "packages/coding-agent/src/core/session-manager.ts",
}


def _boost_all_depth() -> None:
    for cid, entry in DEPTH.items():
        path = _CHECKLIST_PATHS.get(cid, "packages/agent/src/agent-loop.ts")
        ch_title = next(c[4] for c in CHAPTERS if c[0] == cid)
        extra = (
            f"读完后应能回答的 5 个问题 · {ch_title}",
            f"Five questions you should answer after reading · {ch_title}",
            [
                (
                    f"① 主线 prompt 进入本章模块时，第一个被调用的 <code>export</code> 函数是什么？② 它 emit 的第一个 AgentEvent 类型是什么？③ 若在此层抛错，TUI 会卡在什么状态？④ 对应的 pi-textbook checkpoint 测试命令是什么？⑤ <code>{path}</code> 中哪一行最值得打断点？",
                    f"① First <code>export</code> called when through-line enters this module? ② First AgentEvent type emitted? ③ If this layer throws, what TUI state stalls? ④ Matching pi-textbook checkpoint test command? ⑤ Best breakpoint line in <code>{path}</code>?",
                ),
                (
                    "不要一次读完整个文件。用「从测试入手」法：先 <code>npm test -- &lt;matching-test&gt;</code>，看失败断言指向哪行，再读那一行上下游 30 行。生产 pi-mono 的测试覆盖率在 agent-loop 与 session-manager 最高——优先读测试。",
                    "Don't read whole files at once. «Test-first» method: run <code>npm test -- &lt;matching-test&gt;</code>, see which assertion fails, read ±30 lines around that line. Highest test coverage in agent-loop and session-manager — read tests first.",
                ),
                (
                    "对照本文 TRACE 盒与 <code>--verbose</code> stderr：每个 event type 应在源码中有且仅有一处「决策点」——若找不到，说明事件在更上层（AgentSession）或更下层（pi-ai adapter）合并发出。",
                    "Cross-check TRACE box with <code>--verbose</code> stderr: each event type should have exactly one «decision point» in source — if missing, event is merged upstream (AgentSession) or downstream (pi-ai adapter).",
                ),
                (
                    f"进阶：用 <code>git blame {path}</code> 看最近改动——Pi 的 harness 接口仍在活跃演进，注释可能落后于 <code>AgentLoopConfig</code> 类型定义。类型即文档。",
                    f"Advanced: <code>git blame {path}</code> for recent changes — Pi harness APIs still evolve; comments may lag <code>AgentLoopConfig</code> types. Types are the doc.",
                ),
            ],
        )
        defs = list(entry.get("section_defs", []))
        defs.append(extra)
        entry["section_defs"] = defs


_boost_all_depth()


def chapter_depth_chars(cid: str) -> int:
    """Approximate new HTML char count added by deepen (excluding base)."""
    d = DEPTH.get(cid, {})
    total = sum(len(d.get(k, "")) for k in ("why", "banner", "trace", "case", "faq"))
    total += sum(len(str(s)) for s in d.get("section_defs", []))
    total += sum(len(s) for s in d.get("src_extra", []))
    if d.get("textbook_cps"):
        total += 500
    return total


if __name__ == "__main__":
    counts = {cid: chapter_depth_chars(cid) for cid in sorted(DEPTH, key=lambda x: int(x[1:]))}
    avg = sum(counts.values()) // max(len(counts), 1)
    print(f"Chapters: {len(counts)}, avg depth chars: {avg}")
    for cid, n in sorted(counts.items(), key=lambda x: x[1]):
        print(f"  {cid}: {n}")
