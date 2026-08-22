"""Ultra-deep walkthrough blocks — one extra numbered section per chapter."""
from __future__ import annotations

from _html_helpers import join, p, section_block, src

# Per-chapter: (title_zh, title_en, paragraphs, optional source block)
ULTRA: dict[str, tuple[str, str, list[tuple[str, str]], tuple[str, str, list[str]] | None]] = {
    "c7": (
        "prompt() 到 agentLoop 的逐步 trace",
        "Step-by-step trace from prompt() to agentLoop",
        [
            (
                "<code>AgentSession.prompt(text)</code> 首先构造 <code>createUserMessage(text)</code>，类型为 <code>AgentMessage</code> 而非 pi-ai 的 <code>Message</code>。这是 checkpoint 03 与 09 的分水岭：在 agent-core 内永远操作 AgentMessage，只在 <code>streamAssistantResponse</code> 边界调用 <code>convertToLlm</code>。",
                "<code>AgentSession.prompt(text)</code> first builds <code>createUserMessage(text)</code> as <code>AgentMessage</code>, not pi-ai <code>Message</code>. Checkpoint 03/09 watershed: AgentMessage inside agent-core; <code>convertToLlm</code> only at <code>streamAssistantResponse</code>.",
            ),
            (
                "随后 <code>runLoop</code> 把 userMsg 推入 pending queue，emit <code>turn_start</code> → <code>message_start</code>。若 SessionManager 已绑定，同一事件流会触发 JSONL append——因此 TUI 与磁盘是<strong>同一事件的两个订阅者</strong>，不是两条路径。",
                "Then <code>runLoop</code> pushes userMsg to pending queue, emits <code>turn_start</code> → <code>message_start</code>. With SessionManager bound, the same stream triggers JSONL append — TUI and disk are <strong>two subscribers to one event bus</strong>, not two paths.",
            ),
            (
                "主线 prompt 的第一圈 model stream 在 <code>agent-loop.ts</code> 的 inner loop 启动；当 <code>stopReason=toolUse</code> 时，outer loop 不退出，而是进入 tool batch。读 README 的 <code>read</code> 在此执行——cwd 相对路径由 coding-agent 的 tool registry 解析。",
                "First model stream for the through-line starts in agent-loop's inner loop; when <code>stopReason=toolUse</code>, outer loop continues into tool batch. <code>read</code> for README runs here — cwd-relative paths resolved by coding-agent tool registry.",
            ),
        ],
        (
            "walkthrough",
            "packages/coding-agent/src/core/agent-session.ts",
            [
                '<span class="src-kw">async</span> <span class="src-fn">prompt</span>(<span class="src-arg">text</span>: <span class="src-cls">string</span>) {',
                '  <span class="src-kw">const</span> userMsg = <span class="src-fn">createUserMessage</span>(text);',
                '  <span class="src-kw">await</span> <span class="src-fn">this.runLoop</span>([userMsg]);',
                '}',
            ],
        ),
    ),
    "c10": (
        "双环状态机：用主线 prompt 走一遍",
        "Twin-loop state machine walked with through-line prompt",
        [
            (
                "外环条件：<code>while (true)</code> 检查 follow-up 队列与 steering 注入。主线 prompt 首次进入时 follow-up 为空，但 steering 可能在 tool 执行中被用户插入——这是 Pi 与「一次性 completion API」的本质差异。",
                "Outer loop: <code>while (true)</code> checks follow-up queue and steering. First through-line entry has empty follow-up, but steering may inject during tool execution — Pi's essential difference from one-shot completion APIs.",
            ),
            (
                "内环条件：<code>while (hasMoreToolCalls || pendingMessages.length)</code>。第一圈 model 返回 toolUse(read) 后，<code>hasMoreToolCalls</code> 为真，内环继续而不回到用户。第二圈 model 收到 tool result 后 <code>stopReason=stop</code>，内环退出，外环检查无 follow-up 后 agent_end。",
                "Inner loop: <code>while (hasMoreToolCalls || pendingMessages.length)</code>. After turn-1 toolUse(read), inner loop continues. Turn-2 stop ends inner loop; outer loop exits with agent_end when no follow-up.",
            ),
            (
                "理解双环的最快方法：在 pi-textbook checkpoint 07 的测试里给 <code>ScriptedModel</code> 固定两轮响应，对照 <code>--verbose</code> stderr 的 event 顺序——应看到两次 <code>model_start</code> 夹一次 <code>tool_execution_*</code>。",
                "Fastest way to grok twin loops: fix two-turn responses in textbook cp07's <code>ScriptedModel</code>, compare with <code>--verbose</code> stderr — expect two <code>model_start</code> bracketing one <code>tool_execution_*</code>.",
            ),
        ],
        (
            "loop",
            "packages/agent/src/agent-loop.ts",
            [
                '<span class="src-kw">while</span> (<span class="src-lit">true</span>) { <span class="src-comment">// outer: follow-up</span>',
                '  <span class="src-kw">while</span> (hasMoreToolCalls || pendingMessages.length) { <span class="src-comment">// inner</span>',
                '    <span class="src-kw">await</span> <span class="src-fn">streamAssistantResponse</span>(...);',
                '    <span class="src-kw">await</span> <span class="src-fn">executeToolCalls</span>(...);',
                '  }',
                '}',
            ],
        ),
    ),
    "c14": (
        "streamSimple 如何吃掉 convertToLlm 的输出",
        "How streamSimple consumes convertToLlm output",
        [
            (
                "<code>convertToLlm(messages: AgentMessage[])</code> 产出 pi-ai 的 <code>Message[]</code>，其中 tool result 已折叠为 provider 特定格式。Anthropic 与 OpenAI 的 tool 块形状不同——pi-ai 的 adapter 层负责这一转换，agent-core 不应 import provider 细节。",
                "<code>convertToLlm(messages: AgentMessage[])</code> yields pi-ai <code>Message[]</code> with tool results folded to provider format. Anthropic vs OpenAI tool blocks differ — pi-ai adapters handle this; agent-core must not import provider details.",
            ),
            (
                "<code>streamSimple(model, messages, tools)</code> 返回 <code>EventStream</code>：先过程项（text_delta、toolcall_delta），后终态（done + usage）。TUI 只订阅 message_update；SessionManager 在 message_end 落盘——两者消费同一 stream 的不同阶段。",
                "<code>streamSimple(model, messages, tools)</code> returns <code>EventStream</code>: process items first (text_delta, toolcall_delta), terminal state last (done + usage). TUI subscribes to message_update; SessionManager persists at message_end.",
            ),
        ],
        None,
    ),
    "c22": (
        "JSONL 一行究竟长什么样",
        "What one JSONL line actually looks like",
        [
            (
                "每条 entry 含 <code>id</code>、<code>parentId</code>、<code>type</code>、<code>message</code> 或 <code>event</code> 载荷。主线 prompt 的第一行 user entry 的 <code>parentId</code> 指向 session 根或上一 leaf；assistant toolUse 行的 <code>parentId</code> 指向 user entry——形成树而非链表。",
                "Each entry has <code>id</code>, <code>parentId</code>, <code>type</code>, and <code>message</code> or <code>event</code> payload. First user entry's <code>parentId</code> points to session root or prior leaf; assistant toolUse points to user entry — a tree, not a linked list.",
            ),
            (
                "<code>fork(fromEntryId)</code> 创建新 session 文件，复制祖先链到切点，后续 append 挂在新分支上。这是 Pi 替代 sub-agent 的方式：不是进程内 spawn，而是<strong>会话树分支</strong>。",
                "<code>fork(fromEntryId)</code> creates a new session file, copies ancestor chain to cut point; subsequent appends hang on the new branch. Pi's sub-agent alternative: <strong>session tree branch</strong>, not in-process spawn.",
            ),
        ],
        None,
    ),
}

# Default ultra block for chapters without custom content
_DEFAULT_PATHS: dict[str, str] = {
    "c1": "packages/agent/src/agent-loop.ts",
    "c2": "packages/coding-agent/src/main.ts",
    "c3": "package.json",
    "c4": "packages/agent/package.json",
    "c5": "packages/coding-agent/README.md",
    "c6": "packages/coding-agent/src/cli.ts",
    "c8": "packages/coding-agent/src/core/resource-loader.ts",
    "c9": "packages/agent/src/types.ts",
    "c11": "packages/agent/src/agent-loop.ts",
    "c12": "packages/coding-agent/src/core/tools/read.ts",
    "c13": "packages/agent/src/types.ts",
    "c15": "packages/ai/src/utils/event-stream.ts",
    "c16": "packages/ai/src/models.generated.ts",
    "c17": "packages/tui/src/terminal.ts",
    "c18": "packages/tui/src/components/editor.ts",
    "c19": "packages/coding-agent/src/core/extensions/types.ts",
    "c20": "packages/coding-agent/src/core/extensions/runner.ts",
    "c21": "packages/coding-agent/src/core/extensions/loader.ts",
    "c23": "packages/coding-agent/src/core/compaction/",
    "c24": "packages/coding-agent/src/core/sdk.ts",
    "c25": "packages/protocol/src/",
    "c26": "packages/coding-agent/src/cli.ts",
}


def ultra_for(cid: str, ch_num: str, sec_offset: int) -> str | None:
    custom = ULTRA.get(cid)
    sec = f"C{ch_num}.{sec_offset}"

    if custom:
        tz, te, paragraphs, src_block = custom
        parts = [section_block(tz, te, paragraphs, sec=sec)]
        if src_block:
            tag, path, lines = src_block
            parts.append(src(tag, path, [f'      <span class="src-line">{ln}</span>' for ln in lines]))
        return join(*parts)

    path = _DEFAULT_PATHS.get(cid)
    if not path:
        return None

    return section_block(
        f"打开源码：{path}",
        f"Open source: {path}",
        [
            (
                f"本章主线 prompt 经过此模块时，请在 pi-mono 打开 <code>{path}</code>，搜索 <code>export</code> 与测试文件中的同名场景。对照 pi-textbook 对应 checkpoint 的 workshop 测试——先让测试绿，再读生产实现。",
                f"When the through-line prompt crosses this module, open <code>{path}</code> in pi-mono, search <code>export</code> and matching test scenarios. Cross-read the pi-textbook checkpoint workshop test — green test first, then production.",
            ),
            (
                "建议命令：<code>cd packages/agent && npm test -- agent-loop</code>（路径因章而异）。测试文件是行为契约的executable spec，比注释更可靠。",
                "Suggested: <code>cd packages/agent && npm test -- agent-loop</code> (path varies). Tests are executable specs of behavior contracts — more reliable than comments.",
            ),
            (
                "用 <code>--verbose</code> 跑一轮主线 prompt，把 stderr event 类型与源码中的 <code>emit</code> 调用逐行对齐——这是本文 C26 推荐的 trace 方法。",
                "Run the through-line with <code>--verbose</code>, align stderr event types with <code>emit</code> calls in source — the trace method recommended in C26.",
            ),
        ],
        sec=sec,
    )


def attach_ultra_to_depth(depth: dict) -> dict:
    """Mutate DEPTH entry to include ultra block (called at import time)."""
    return depth
