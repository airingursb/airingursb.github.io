"""Long-form pi-mono source traces for Heart chapters C09–C13."""
from __future__ import annotations

import html
import re
from pathlib import Path

from _html_helpers import cmp, h3, join, note, p, src

PI_MONO = Path("/tmp/pi-mono")
PROMPT_ZH = "读取 README.md，用一句话告诉我这个项目做什么"
PROMPT_EN = "read README.md and tell me what this project does in one sentence"

# ── helpers ──────────────────────────────────────────────────────────

_KW = re.compile(
    r"\b(async|await|export|function|const|let|return|if|else|for|while|"
    r"switch|case|break|continue|type|interface|import|from|new|throw|"
    r"typeof|undefined|null|true|false)\b"
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
    path = PI_MONO / rel
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
            f"源码暂不可用：<code>{rel}</code>（需本地 pi-mono clone）",
            f"Source unavailable: <code>{rel}</code> (pi-mono clone required)",
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


# ── C09: message model ───────────────────────────────────────────────

def _trace_c09() -> str:
    parts = [
        _trace_header(
            "09",
            f"主线 prompt「{PROMPT_ZH}」在消息 IR 层的变形",
            f"Through-line prompt message IR transformation",
        ),
        p(
            "本章 trace 只盯住一件事：<strong>同一条用户输入在 agent-core 内永远是 AgentMessage</strong>，直到 <code>streamAssistantResponse</code> 调用 <code>convertToLlm</code> 才投影成 pi-ai 的 <code>Message[]</code>。主线 prompt 的 user 消息、read 的 toolResult、最终 assistant 回答——三者形状不同，但 JSONL 里存的全是 AgentMessage 变体。",
            "This trace tracks one thing: <strong>the same user input stays AgentMessage inside agent-core</strong> until <code>streamAssistantResponse</code> calls <code>convertToLlm</code> to project into pi-ai <code>Message[]</code>. User message, read toolResult, final assistant — different shapes, all AgentMessage variants in JSONL.",
        ),
        _annotated_trace(
            "types",
            "packages/agent/src/types.ts",
            149,
            200,
            {
                178: ("convertToLlm：AgentMessage[] → Message[]，每次 LLM 调用前执行", "convertToLlm: AgentMessage[] → Message[] before each LLM call"),
                200: ("transformContext：在 convert 之前做 compaction / 剪枝", "transformContext: compaction/prune before convert"),
            },
            highlight_lines={178, 200},
        ),
        p(
            "<code>AgentLoopConfig</code> 的 JSDoc 把契约写得很硬：<code>convertToLlm</code> <strong>must not throw</strong>——抛错会打断低层循环且不会产生正常 event 序列。这就是为什么 compaction 和 custom message 过滤都在 Message 层做投影，而不是在 agent-loop 里 try/catch 糊过去。",
            "<code>AgentLoopConfig</code> JSDoc is strict: <code>convertToLlm</code> <strong>must not throw</strong> — throws break the low-level loop without a normal event sequence. Compaction and custom message filtering project at Message layer, not try/catch in agent-loop.",
        ),
        _annotated_trace(
            "convert",
            "packages/coding-agent/src/core/messages.ts",
            140,
            195,
            {
                148: ("coding-agent 的生产 convertToLlm 实现", "production convertToLlm in coding-agent"),
                152: ("switch(m.role)：custom / bashExecution / branchSummary 在此折叠", "switch(m.role): custom/bash/branch fold here"),
                184: ("user/assistant/toolResult 原样透传——主线三角色", "user/assistant/toolResult pass through — through-line trio"),
            },
            highlight_lines={148, 152, 184},
        ),
        _step_table(
            "主线 prompt 消息投影时间线",
            "Through-line message projection timeline",
            [
                ["1", "<code>AgentSession.prompt()</code>", f"user AgentMessage: «{PROMPT_ZH[:18]}…»"],
                ["2", "<code>context.messages[]</code>", "canonical transcript 追加 user"],
                ["3", "<code>transformContext?</code>", "compaction 可能在此剪枝旧消息"],
                ["4", "<code>convertToLlm()</code>", "→ [{role:user, content:…}] 送 pi-ai"],
                ["5", "turn-1 assistant", "toolUse(read) 仍在 AgentMessage 形状"],
                ["6", "toolResult", "read README 内容 · role=toolResult"],
                ["7", "turn-2 convert", "user+assistant+toolResult → Message[]"],
                ["8", "turn-2 assistant", "stopReason=stop · 最终回答"],
            ],
        ),
        _annotated_trace(
            "stream",
            "packages/agent/src/agent-loop.ts",
            281,
            312,
            {
                288: ("transformContext 边界：仍是 AgentMessage[]", "transformContext boundary: still AgentMessage[]"),
                294: ("★ 唯一 convert 调用点", "★ sole convert call site"),
                295: ("llmMessages 进入 streamFunction", "llmMessages enters streamFunction"),
            },
            highlight_lines={294, 295},
        ),
        p(
            "注意 <code>streamAssistantResponse</code> 注释原文：「This is where AgentMessage[] gets transformed to Message[] for the LLM.」——读 pi-mono 时搜索这句话，比搜索 <code>convertToLlm</code> 更快定位心脏。主线 prompt 第一次 convert 发生在 turn-1 model stream 前；第二次在 turn-2（tool result 已入 context）前。",
            "Note <code>streamAssistantResponse</code> comment: «This is where AgentMessage[] gets transformed to Message[] for the LLM.» Search this phrase in pi-mono to locate the heart faster than <code>convertToLlm</code>. First convert before turn-1; second before turn-2 after tool result enters context.",
        ),
        _annotated_trace(
            "agentmsg",
            "packages/agent/src/types.ts",
            318,
            330,
            {
                325: ("AgentMessage = Message | CustomAgentMessages 合并", "AgentMessage = Message | CustomAgentMessages merge"),
            },
            highlight_lines={325},
        ),
        _annotated_trace(
            "events-type",
            "packages/agent/src/types.ts",
            421,
            443,
            {
                428: ("AgentEvent：message_* 事件携带 AgentMessage 快照", "AgentEvent: message_* carries AgentMessage snapshot"),
                438: ("message_update 仅 assistant 流式阶段", "message_update only during assistant streaming"),
            },
            highlight_lines={428, 438},
        ),
        note(
            "练习：在 pi-textbook checkpoint 03 给 transcript 加一条 <code>role:custom</code> 消息，观察 convertToLlm 是否过滤、JSONL 是否仍完整保存。",
            "Exercise: in textbook cp03 add a <code>role:custom</code> message; observe convertToLlm filter vs JSONL full save.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C10: runLoop twin loops ──────────────────────────────────────────

def _trace_c10() -> str:
    parts = [
        _trace_header(
            "10",
            "runLoop 双环：主线 prompt 两圈 model stream 完整源码 trace",
            "runLoop twin loops: full source trace for two model streams",
        ),
        p(
            "<code>runLoop</code>（<code>agent-loop.ts:155</code>）是 Pi 与 Claude Code 最大架构差异所在：不是「一次 completion」，而是<strong>外环 follow-up × 内环 tool batch</strong>。主线 prompt 固定走两圈内环迭代（turn-1 toolUse + turn-2 stop），外环通常只转一圈。",
            "<code>runLoop</code> (<code>agent-loop.ts:155</code>) is Pi's biggest architectural difference from Claude Code: not one completion but <strong>outer follow-up × inner tool batch</strong>. Through-line prompt runs two inner iterations (turn-1 toolUse + turn-2 stop); outer loop usually one revolution.",
        ),
        _annotated_trace(
            "runloop",
            "packages/agent/src/agent-loop.ts",
            155,
            225,
            {
                167: ("启动时先 drain steering 队列", "drain steering queue at start"),
                169: ("外环：follow-up 到达时 agent 本可停止却继续", "outer: continue when follow-up arrives"),
                174: ("内环条件：还有 tool 或 pending steering", "inner: more tools or pending steering"),
                182: ("steering 注入：message_start/end 无 streaming", "steering inject: message_start/end, no streaming"),
                193: ("★ streamAssistantResponse：每圈内环一次 model", "★ streamAssistantResponse: one model per inner round"),
                203: ("从 assistant content 提取 toolCall", "extract toolCall from assistant content"),
                211: ("stopReason=length → 批量 fail tool，不执行", "stopReason=length → fail all tools, don't execute"),
                214: ("★ executeToolCalls：read README 在此", "★ executeToolCalls: read README here"),
                224: ("turn_end：TUI 可在此刷新 tool 卡片", "turn_end: TUI refreshes tool cards"),
            },
            highlight_lines={169, 174, 193, 214},
        ),
        _step_table(
            "主线 prompt · runLoop 状态机",
            "Through-line prompt · runLoop state machine",
            [
                ["T0", "outer iter=1, inner iter=1", "pending=[] · stream turn-1"],
                ["T1", "inner iter=1 end", "stopReason=toolUse · toolCalls=[read]"],
                ["T2", "executeToolCalls", "tool_execution_* · README content"],
                ["T3", "inner iter=2", "context+=toolResult · stream turn-2"],
                ["T4", "inner iter=2 end", "stopReason=stop · 最终回答"],
                ["T5", "inner exit", "hasMoreToolCalls=false · pending=[]"],
                ["T6", "outer check follow-up", "无 follow-up → break"],
                ["T7", "agent_end", "return newMessages[]"],
            ],
        ),
        _annotated_trace(
            "stream-emit",
            "packages/agent/src/agent-loop.ts",
            314,
            360,
            {
                317: ("消费 pi-ai EventStream", "consume pi-ai EventStream"),
                319: ("start → message_start(partial)", "start → message_start(partial)"),
                338: ("★ message_update：每个 text/toolcall delta", "★ message_update: each text/toolcall delta"),
                357: ("done → message_end(final)", "done → message_end(final)"),
            },
            highlight_lines={338, 357},
        ),
        p(
            "内环第二次迭代时，<code>currentContext.messages</code> 已含：user prompt、turn-1 assistant(toolUse)、toolResult(README)。<code>convertToLlm</code> 把 toolResult 折叠成 provider 特定 tool_result 块——Anthropic 与 OpenAI 形状不同，但 agent-loop 不感知，这是 pi-ai adapter 的职责（C14）。",
            "Second inner iteration: <code>currentContext.messages</code> has user, turn-1 assistant(toolUse), toolResult(README). <code>convertToLlm</code> folds toolResult to provider-specific blocks — agent-loop doesn't care, pi-ai adapter's job (C14).",
        ),
        _annotated_trace(
            "outer-exit",
            "packages/agent/src/agent-loop.ts",
            247,
            275,
            {
                247: ("shouldStopAfterTurn：扩展可强制提前 agent_end", "shouldStopAfterTurn: extensions can force early agent_end"),
                259: ("内环结束后再次 poll steering", "poll steering again after inner loop"),
                262: ("外环 follow-up 检查点", "outer follow-up checkpoint"),
                264: ("有 follow-up → pendingMessages → continue 外环", "follow-up → pendingMessages → continue outer"),
                274: ("无消息 → agent_end", "no messages → agent_end"),
            },
            highlight_lines={262, 264, 274},
        ),
        _annotated_trace(
            "length-fail",
            "packages/agent/src/agent-loop.ts",
            381,
            405,
            {
                381: ("length 截断时拒绝执行所有 tool call", "length truncation rejects all tool calls"),
                396: ("错误 tool result 文案：要求模型重新发起完整参数", "error tool result: ask model to re-issue full args"),
            },
            highlight_lines={381},
        ),
        note(
            "对照 pi-textbook cp07 <code>agent-loop.test.ts</code>：搜索 <code>two turn</code> 或 <code>toolUse</code>，测试里的 event 序列应与 --verbose stderr 同构。",
            "Cross-read textbook cp07 <code>agent-loop.test.ts</code>: search <code>two turn</code> or <code>toolUse</code>; test event sequence should match --verbose stderr.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C11: steering & follow-up ────────────────────────────────────────

def _trace_c11() -> str:
    parts = [
        _trace_header(
            "11",
            "Steering / Follow-up 双队列源码 trace",
            "Steering / Follow-up dual-queue source trace",
        ),
        p(
            "Steering 与 Follow-up 不是 UI 花活——它们在类型系统里是 <code>AgentLoopConfig</code> 的两个可选钩子：<code>getSteeringMessages</code> 与 <code>getFollowUpMessages</code>。AgentSession 维护 <code>_steeringMessages</code> / <code>_followUpMessages</code> 字符串队列，在 config 工厂里桥接到 agent-loop。",
            "Steering and follow-up aren't UI gimmicks — they're optional hooks on <code>AgentLoopConfig</code>: <code>getSteeringMessages</code> and <code>getFollowUpMessages</code>. AgentSession maintains string queues bridged to agent-loop via config factory.",
        ),
        _annotated_trace(
            "config-hooks",
            "packages/agent/src/types.ts",
            230,
            260,
            {
                244: ("getSteeringMessages：内环每轮前 poll", "getSteeringMessages: poll before each inner round"),
                257: ("getFollowUpMessages：外环 would-stop 时 poll", "getFollowUpMessages: poll at outer would-stop"),
            },
            highlight_lines={244, 257},
        ),
        _annotated_trace(
            "inject",
            "packages/agent/src/agent-loop.ts",
            166,
            190,
            {
                167: ("循环开头：await getSteeringMessages", "loop start: await getSteeringMessages"),
                182: ("pending 非空：逐条 push 到 context，无 LLM", "pending non-empty: push to context, no LLM"),
                185: ("message_end 后立即进入 streamAssistantResponse", "message_end then streamAssistantResponse"),
            },
            highlight_lines={182},
        ),
        _annotated_trace(
            "followup",
            "packages/agent/src/agent-loop.ts",
            258,
            268,
            {
                259: ("内环结束后再 poll steering", "poll steering after inner loop"),
                263: ("★ follow-up：外环唯一重启条件", "★ follow-up: sole outer restart condition"),
                266: ("follow-up 变成 pending，continue 外环", "follow-up becomes pending, continue outer"),
            },
            highlight_lines={263, 266},
        ),
        _step_table(
            "Case：read 中途 steering「先 ls」",
            "Case: steer «ls first» mid-read",
            [
                ["1", "turn-1 toolUse(read)", "模型已决定读 README"],
                ["2", "executeTool 前", "getSteeringMessages 返回 user「先 ls」"],
                ["3", "pending 注入", "context += steer user · 无 model"],
                ["4", "stream turn-1b", "模型可能改调 bash/ls"],
                ["5", "队列 UI", "AgentSession splice steering 队列"],
            ],
        ),
        _annotated_trace(
            "session-queue",
            "packages/coding-agent/src/core/agent-session.ts",
            620,
            648,
            {
                624: ("message_start(user) 时从队列移除", "on message_start(user) remove from queue"),
                629: ("先匹配 steering 队列", "match steering queue first"),
                635: ("再匹配 follow-up 队列", "then follow-up queue"),
                648: ("_emit 给 TUI 监听器", "_emit to TUI listeners"),
            },
            highlight_lines={624, 629, 635},
        ),
        p(
            "关键时序：<code>_handleAgentEvent</code> 在 <code>message_start(user)</code> 时<strong>先于 emit</strong> 修改队列状态——保证 TUI 看到 steering 消息时侧边栏队列已更新。这是「事件驱动 UI」与「轮询队列」的接缝，也是 fork Pi 时最容易漏掉的细节。",
            "Key timing: <code>_handleAgentEvent</code> mutates queue <strong>before emit</strong> on <code>message_start(user)</code> — TUI sees updated sidebar when steering message appears. Seam between event-driven UI and queue polling; easy to miss when forking Pi.",
        ),
        note(
            "实验：interactive 模式下模型 toolUse(read) 后立刻输入 steering，观察 inner loop 是否多一轮 model stream。",
            "Experiment: after toolUse(read) in interactive mode, steer immediately; observe extra inner model round.",
            copper=True,
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C12: tool pipeline ───────────────────────────────────────────────

def _trace_c12() -> str:
    parts = [
        _trace_header(
            "12",
            f"read README 工具管线 · 从 toolUse 到 toolResult",
            f"read README tool pipeline · toolUse to toolResult",
        ),
        p(
            "主线 prompt 的第一次 tool call 几乎总是 <code>read({\"path\":\"README.md\"})</code>。<code>executeToolCalls</code> 根据 <code>toolExecution</code> 配置和 per-tool <code>executionMode</code> 选择并行或串行；read 默认并行安全。",
            "Through-line's first tool call is usually <code>read({\"path\":\"README.md\"})</code>. <code>executeToolCalls</code> picks parallel vs sequential from <code>toolExecution</code> config and per-tool <code>executionMode</code>; read is parallel-safe by default.",
        ),
        _annotated_trace(
            "dispatch",
            "packages/agent/src/agent-loop.ts",
            411,
            426,
            {
                418: ("从 assistant content filter toolCall", "filter toolCall from assistant content"),
                419: ("任一 tool executionMode=sequential → 串行", "any tool sequential → sequential path"),
                422: ("config.toolExecution 全局覆盖", "config.toolExecution global override"),
                425: ("read 单 call 时 parallel/sequential 等价", "single read: parallel≈sequential"),
            },
            highlight_lines={422, 425},
        ),
        _annotated_trace(
            "sequential",
            "packages/agent/src/agent-loop.ts",
            433,
            475,
            {
                444: ("逐 toolCall：tool_execution_start", "per toolCall: tool_execution_start"),
                452: ("prepareToolCall：参数校验 + 扩展 hook", "prepareToolCall: validate + extension hook"),
                461: ("executePreparedToolCall：真正执行 read", "executePreparedToolCall: actually run read"),
                473: ("createToolResultMessage → message_start/end", "createToolResultMessage → message_start/end"),
            },
            highlight_lines={445, 461, 473},
        ),
        _annotated_trace(
            "read-exec",
            "packages/coding-agent/src/core/tools/read.ts",
            209,
            230,
            {
                209: ("createReadToolDefinition：schema + execute", "createReadToolDefinition: schema + execute"),
                218: ("DEFAULT_MAX_LINES / MAX_BYTES 截断说明在 description", "truncation limits in description"),
                223: ("execute 入口：Promise + AbortSignal", "execute entry: Promise + AbortSignal"),
            },
            highlight_lines={223},
        ),
        _annotated_trace(
            "read-body",
            "packages/coding-agent/src/core/tools/read.ts",
            243,
            323,
            {
                245: ("resolveReadPathAsync：cwd 相对 → 绝对", "resolveReadPathAsync: cwd-relative → absolute"),
                248: ("fs access 检查可读", "fs access readability check"),
                273: ("文本分支：buffer.toString utf-8", "text branch: buffer.toString utf-8"),
                295: ("★ truncateHead：超长按行/字节截断", "★ truncateHead: line/byte truncation"),
                308: ("截断提示：offset=N 继续读", "truncation hint: offset=N to continue"),
                322: ("返回 TextContent[] 给 agent-loop", "return TextContent[] to agent-loop"),
            },
            highlight_lines={245, 295, 322},
        ),
        _step_table(
            "read(README.md) 逐步",
            "read(README.md) step by step",
            [
                ["1", "validateToolArguments", '{"path":"README.md"}'],
                ["2", "resolveReadPathAsync", "cwd/README.md → absolute"],
                ["3", "fsReadFile", "UTF-8 buffer"],
                ["4", "truncateHead", "≤2000 lines / 256KB"],
                ["5", "tool_execution_end", "isError=false"],
                ["6", "AgentMessage", "role=toolResult · toolCallId=call_1"],
                ["7", "inner loop iter 2", "context.messages += result"],
            ],
        ),
        p(
            "若 README 超大，<code>truncateHead</code> 会在 tool result 末尾附加 <code>[Showing lines … Use offset=N to continue.]</code>——模型在 turn-2 可能只读到文件头部。主线 prompt「一句话概括」通常不需要全文；这是 Pi 故意用截断换上下文窗口的设计取舍。",
            "If README is huge, <code>truncateHead</code> appends continuation hints — turn-2 model may only see the head. Through-line «one sentence summary» rarely needs full file; truncation trades context window for completeness.",
        ),
        _trace_close(),
    ]
    return join(*parts)


# ── C13: event bus ───────────────────────────────────────────────────

def _trace_c13() -> str:
    parts = [
        _trace_header(
            "13",
            "AgentEvent 总线：主线一轮完整事件序列",
            "AgentEvent bus: full event sequence for one through-line turn",
        ),
        p(
            "<code>AgentEvent</code> 是 agent-core 与 coding-agent/TUI 的<strong>唯一契约</strong>。agent-loop 只 call <code>emit(event)</code>；AgentSession 订阅后 fan-out 到 JSONL、TUI、ExtensionRunner。主线 prompt 一轮大约产生 25–40 个事件（含 message_update delta）。",
            "<code>AgentEvent</code> is the <strong>sole contract</strong> between agent-core and coding-agent/TUI. agent-loop only <code>emit(event)</code>; AgentSession fans out to JSONL, TUI, ExtensionRunner. One through-line turn emits ~25–40 events (including message_update deltas).",
        ),
        _annotated_trace(
            "event-union",
            "packages/agent/src/types.ts",
            421,
            443,
            {
                430: ("agent_start / agent_end 包裹整次 runLoop", "agent_start/agent_end wrap runLoop"),
                433: ("turn_start / turn_end 包裹每圈 model+tools", "turn_start/turn_end wrap each model+tools round"),
                436: ("message_start/end：user/assistant/toolResult 共用", "message_start/end: shared by user/assistant/toolResult"),
                438: ("★ message_update：仅 assistant 流式", "★ message_update: assistant streaming only"),
                441: ("tool_execution_*：read 生命周期", "tool_execution_*: read lifecycle"),
            },
            highlight_lines={438, 441},
        ),
        _step_table(
            "主线 prompt 事件序列（简化）",
            "Through-line event sequence (simplified)",
            [
                ["1", "agent_start", "runLoop 进入"],
                ["2", "turn_start", "turn-1 开始"],
                ["3", "message_start", "user prompt"],
                ["4", "message_end", "user 定稿 → JSONL append"],
                ["5", "message_start", "assistant partial"],
                ["6", "message_update×N", "toolcall_delta 组装 read(args)"],
                ["7", "message_end", "stopReason=toolUse"],
                ["8", "tool_execution_start", "read · call_1"],
                ["9", "tool_execution_end", "README 内容"],
                ["10", "message_start/end", "toolResult 消息"],
                ["11", "turn_end", "turn-1 完成"],
                ["12", "turn_start", "turn-2"],
                ["13", "message_update×M", "text_delta 最终回答"],
                ["14", "message_end", "stopReason=stop"],
                ["15", "turn_end", "turn-2 完成"],
                ["16", "agent_end", "newMessages 返回"],
            ],
        ),
        _annotated_trace(
            "emit-loop",
            "packages/agent/src/agent-loop.ts",
            326,
            344,
            {
                332: ("toolcall_delta → message_update", "toolcall_delta → message_update"),
                338: ("emit 携带 assistantMessageEvent 原样", "emit carries assistantMessageEvent as-is"),
                341: ("TUI 靠 message 快照差分渲染", "TUI diffs from message snapshot"),
            },
            highlight_lines={338},
        ),
        _annotated_trace(
            "session-persist",
            "packages/coding-agent/src/core/agent-session.ts",
            644,
            690,
            {
                645: ("扩展先收到事件（可改写 message_end）", "extensions receive first (can rewrite message_end)"),
                648: ("fan-out 到 session 监听器", "fan-out to session listeners"),
                651: ("★ message_end → SessionManager.appendMessage", "★ message_end → SessionManager.appendMessage"),
                667: ("user/assistant/toolResult 写 JSONL", "user/assistant/toolResult to JSONL"),
                672: ("assistant message_end 触发 compaction 检查标记", "assistant message_end sets compaction check flag"),
            },
            highlight_lines={651, 667},
        ),
        p(
            "「message_update 驱动 TUI，message_end 驱动 JSONL」——不是两条管道，而是<strong>同一 emit 的两个订阅者消费不同阶段</strong>。TUI 在 update 时重绘；SessionManager 只在 end 时落盘，避免每个 delta 写一行 JSONL。",
            "«message_update drives TUI, message_end drives JSONL» — not two pipes but <strong>two subscribers to same emit at different stages</strong>. TUI redraws on update; SessionManager persists only on end, avoiding per-delta JSONL lines.",
        ),
        _annotated_trace(
            "extension-fanout",
            "packages/coding-agent/src/core/agent-session.ts",
            738,
            818,
            {
                766: ("message_update → ExtensionRunner", "message_update → ExtensionRunner"),
                774: ("message_end → emitMessageEnd 可替换消息", "message_end → emitMessageEnd can replace message"),
                793: ("tool_execution_start 扩展可见", "tool_execution_start visible to extensions"),
            },
            highlight_lines={766, 774},
        ),
        note(
            "用 <code>pi --verbose 2&gt;events.log</code> 跑主线 prompt，<code>grep message_update events.log | wc -l</code> 应与 TUI 刷新次数同量级。",
            "Run <code>pi --verbose 2&gt;events.log</code> on through-line; <code>grep message_update events.log | wc -l</code> should match TUI refresh magnitude.",
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
}


def heart_trace_block(cid: str) -> str:
    fn = _HEART.get(cid)
    if not fn:
        return ""
    return fn()


def heart_trace_chars(cid: str) -> int:
    return len(heart_trace_block(cid))
