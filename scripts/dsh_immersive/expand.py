"""Targeted chapter expansions for DSH immersive article."""
from __future__ import annotations

from doc_map import DOC_REFERENCES

from _html_helpers import aside_label, cmp, note, p, src
from heart_trace import heart_trace_block


def doc_crossref_table(doc_ids: list[str]) -> str:
    rows = []
    for did in doc_ids:
        row = next((r for r in DOC_REFERENCES if r[0] == did), None)
        if row:
            rows.append([did, row[1], f"<code>{row[3]}</code>", row[5]])
    if not rows:
        return ""
    return (
        aside_label("交叉引用", "Cross-ref", "deepseek-harness 文档", "deepseek-harness docs")
        + cmp(["DOC", "主题", "路径", "摘要"], rows)
    )


def case_study(title_zh: str, title_en: str, body_zh: str, body_en: str) -> str:
    return f"""    <div class="case-study">
      <div class="cs-tag">CASE STUDY</div>
      <div class="cs-title"><span class="lang-zh-only">{title_zh}</span><span class="lang-en-only">{title_en}</span></div>
      <div class="lang-zh-only"><p>{body_zh}</p></div>
      <div class="lang-en-only"><p>{body_en}</p></div>
    </div>"""


def join_blocks(*parts: str) -> str:
    return "\n\n".join(p for p in parts if p)


def source_walkthrough(path: str, lines: list[tuple[str, str, str]]) -> str:
    code_lines = []
    for i, (code, czh, cen) in enumerate(lines, 1):
        code_lines.append(f'<span class="src-ln">{i:3d}</span> <span class="src-hl">{code}</span>')
        code_lines.append(f'<span class="src-comment">     // {czh} / {cen}</span>')
    return src("walkthrough", path, code_lines)


CHAPTER_EXTRAS: dict[str, str] = {
    "c1": join_blocks(
        doc_crossref_table(["architecture", "cordis-primer"]),
        case_study(
            "从 Pi 迁移到 DSH",
            "Migrating from Pi to DSH",
            "Pi 把 agent-loop 写死在 npm 包里；DSH 把 agent-loop 本身做成可替换插件。迁移的第一步不是换 CLI，而是跑 <code>dsh --profile web --dump-config</code> 看清插件树。",
            "Pi hard-codes agent-loop in an npm package; DSH makes agent-loop itself a replaceable plugin. Migration starts with <code>dsh --profile web --dump-config</code> to see the plugin tree.",
        ),
    ),
    "c7": join_blocks(
        source_walkthrough("packages/core/agent-loop/src/agent.ts", [
            ("send(message, target, wakeup)", "用户主线入口", "through-line entry"),
            ("inbox.splice(resolvedTarget, ...)", "claim 下一条 user/message", "claim next user/message"),
            ("wakeDriver(wakingAfterAbort)", "唤醒 ReactLoopAgent", "wake ReactLoopAgent"),
            ("session.append('turn/start', { turn })", "持久化 turn 边界", "persist turn boundary"),
        ]),
        doc_crossref_table(["agent-lifecycle"]),
    ),
    "c10": join_blocks(
        source_walkthrough("packages/core/agent-loop/src/agent.ts", [
            ("'agent/pre-step', { messages: claimed }", "瀑布：可 reject/rewrite", "waterfall: reject/rewrite"),
            ("session.append('step/start', { turn, step })", "step 边界", "step boundary"),
            ("session.deriveMessages()", "投影 model history", "project model history"),
            ("await executeToolCalls(...)", "执行 read 等", "execute read etc"),
        ]),
        doc_crossref_table(["agent-lifecycle", "tool-execution-pipeline"]),
    ),
    "c22": join_blocks(
        source_walkthrough("packages/core/session/", [
            ("session.append(type, data)", "追加 SessionEvent", "append SessionEvent"),
            ("seq 单调递增", "重放与 fork 基础", "replay and fork basis"),
            ("ctx.sessions.fork(source, boundary)", "分支会话", "branch session"),
            ("session/event 广播", "Web UI 订阅", "Web UI subscribes"),
        ]),
        doc_crossref_table(["architecture"]),
    ),
    "c24": cmp(
        ["特性", "Pi", "DSH", "Claude Code"],
        [
            ["插件化 agent-loop", "✗", "✓", "✗"],
            ["MCP", "✗", "✓", "✓"],
            ["SessionEvent 日志", "JSONL messages", "append-only events", "✗"],
            ["deriveMessages", "convertToLlm", "log projection", "✗"],
            ["子 agent", "✗", "✓", "✓"],
            ["源码可读", "✓", "✓", "✗"],
            ["Web UI", "TUI", "✓ :3080", "✗"],
        ],
    ),
}


def expand_chapter(cid: str, base: str) -> str:
    parts = [base]
    ht = heart_trace_block(cid)
    if ht:
        parts.append(ht)
    extra = CHAPTER_EXTRAS.get(cid, "")
    if extra:
        parts.append(extra)
    return "\n\n".join(parts)
