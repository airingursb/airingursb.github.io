"""Targeted chapter expansions only — no filler padding."""
from __future__ import annotations

from meta import CHAPTERS
from textbook_map import PRODUCTION_MAP, TEXTBOOK_CHECKPOINTS

from _html_helpers import aside_label, cmp, note, p, src
from heart_trace import heart_trace_block


def textbook_crossref_table(cp_ids: list[str]) -> str:
    rows = []
    for cp in cp_ids:
        row = next((r for r in TEXTBOOK_CHECKPOINTS if r[0] == cp), None)
        if row:
            prod = PRODUCTION_MAP.get(cp, "—")
            rows.append([f"cp {cp}", row[2], f"<code>{row[3]}</code>", f"<code>{prod}</code>"])
    if not rows:
        return ""
    return (
        aside_label("交叉引用", "Cross-ref", "pi-textbook checkpoint", "pi-textbook checkpoint")
        + cmp(["CP", "主题", "教学 artifact", "生产映射"], rows)
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
        textbook_crossref_table(["00", "13"]),
        case_study(
            "从 Claude Code 迁移到 Pi",
            "Migrating from Claude Code to Pi",
            "Claude Code 把编排藏在产品里；Pi 把编排写在 agent-loop.ts。迁移的第一步不是换 CLI，而是跑通 pi-textbook checkpoint 00 的七里程碑，建立事件心智模型。",
            "Claude Code hides orchestration in the product; Pi writes it in agent-loop.ts. Migration starts not with a new CLI but checkpoint 00's seven milestones — building an event mental model.",
        ),
    ),
    "c7": join_blocks(
        source_walkthrough("packages/coding-agent/src/core/agent-session.ts", [
            ("async prompt(text: string)", "用户主线入口", "through-line entry"),
            ("const userMsg = createUserMessage(text)", "构造 AgentMessage", "build AgentMessage"),
            ("agentLoop([userMsg], ctx, config, signal, streamFn)", "委托 agent-core", "delegate to agent-core"),
            ("for await (const event of stream)", "事件泵 → JSONL + TUI", "event pump → JSONL + TUI"),
        ]),
        textbook_crossref_table(["09", "13"]),
    ),
    "c10": join_blocks(
        source_walkthrough("packages/agent/src/agent-loop.ts", [
            ("while (true) {", "外环：follow-up", "outer: follow-up"),
            ("while (hasMoreToolCalls || pendingMessages.length)", "内环：tool+steer", "inner: tool+steer"),
            ("await streamAssistantResponse(...)", "调 LLM", "call LLM"),
            ("await executeToolCalls(...)", "执行 read 等", "execute read etc"),
        ]),
        textbook_crossref_table(["07"]),
    ),
    "c22": join_blocks(
        source_walkthrough("packages/coding-agent/src/core/session-manager.ts", [
            ("appendFileSync(sessionPath, JSON.stringify(entry))", "追加 JSONL 行", "append JSONL line"),
            ("parentId: string | null", "树边", "tree edge"),
            ("fork(fromEntryId)", "创建分支会话", "branch session"),
            ("getLeafId()", "当前叶指针", "current leaf"),
        ]),
        textbook_crossref_table(["10"]),
    ),
    "c23": textbook_crossref_table(["11"]),
    "c24": cmp(
        ["特性", "Claude Code", "Cursor", "Pi"],
        [
            ["MCP 工具市场", "✓", "✓", "✗ (Extension API)"],
            ["子 agent", "✓", "△", "✗ (session fork)"],
            ["Plan 模式", "✓", "✓", "✗"],
            ["JSONL 会话树", "✗", "✗", "✓"],
            ["源码可读", "✗", "✗", "✓"],
            ["--verbose 事件", "✗", "✗", "✓"],
            ["IDE 集成", "△", "✓", "✗"],
            ["OAuth 40+ 模型", "△", "△", "✓"],
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
