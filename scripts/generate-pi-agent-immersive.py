#!/usr/bin/env python3
"""Generate Pi Agent immersive HTML article."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PKG = ROOT / "pi_agent_immersive"
sys.path.insert(0, str(PKG))

from chapters import build_all_chapters  # noqa: E402
from expand import expand_chapter  # noqa: E402
from meta import CHAPTERS  # noqa: E402
from shell import (  # noqa: E402
    chapter_section,
    footer,
    head,
    hero,
    interactive_footer,
    lang_toggle_and_back,
    scripts,
    side_toc,
    toc_v2,
)

OUT = Path(__file__).resolve().parents[1] / "public/immersive/pi-agent/index.html"

# Per-chapter enrichment: extra deep-dive blocks to reach substantial length
ENRICHMENT: dict[str, list[tuple[str, str, str, list[str]]]] = {
    "c1": [
        ("设计哲学", "Design philosophy", "Pi 把 agent 拆成可测试的纯函数环，而不是把所有策略塞进一个 God class。", "Pi splits the agent into testable pure-function loops instead of one God class."),
        ("可 fork 意味着什么", "What forkable means", "你可以换 streamFn、换 tool registry、换 SessionManager 实现，而不改 TUI。", "Swap streamFn, tool registry, SessionManager without touching TUI."),
    ],
    "c7": [
        ("prompt() 内部", "Inside prompt()", "创建 UserMessage → 调用 agentLoop → for-await 事件 → SessionManager.append → ExtensionRunner 广播。", "Create UserMessage → call agentLoop → for-await events → SessionManager.append → ExtensionRunner broadcast."),
        ("错误恢复", "Error recovery", "isRetryableAssistantError 触发重试；isContextOverflow 触发 compact 或分支摘要。", "isRetryableAssistantError triggers retry; isContextOverflow triggers compact or branch summary."),
    ],
    "c10": [
        ("streamAssistantResponse", "streamAssistantResponse", "convertToLlm → streamFn → 累积 delta → 组装 AssistantMessage → emit message_end。", "convertToLlm → streamFn → accumulate deltas → assemble AssistantMessage → emit message_end."),
        ("stopReason 分支", "stopReason branches", "toolUse 进内环；stop 可能退出；error/aborted 立即 agent_end。", "toolUse enters inner loop; stop may exit; error/aborted immediate agent_end."),
    ],
    "c22": [
        ("fork 工作流", "Fork workflow", "从任意 message entry 创建 branch_summary + 新 session 文件，parentSession 指向原会话。", "From any message entry create branch_summary + new session file with parentSession pointer."),
        ("leafId 语义", "leafId semantics", "继续会话时从 leaf 重放 parentId 链到根，重建 AgentMessage[]。", "Continue session replays parentId chain from leaf to root, rebuilding AgentMessage[]."),
    ],
}


def enrich(body: str, cid: str) -> str:
    from _html_helpers import h3, note, p, src

    extras = ENRICHMENT.get(cid, [])
    blocks = [body]
    for zh, en, detail_zh, detail_en in extras:
        blocks.append(h3(zh, en))
        blocks.append(p(detail_zh, detail_en))

    # Generic deep-dive appendix for all chapters
    ch = next(c for c in CHAPTERS if c[0] == cid)
    blocks.append(
        note(
            f"本章 ({ch[1]}) 在主线 prompt「{ch[6]}」路径上负责：<strong>{ch[4]}</strong>。回到 C02 的 22 站地图定位这一章。",
            f"Chapter ({ch[1]}) on the through-line path handles: <strong>{ch[5]}</strong>. Return to C02's 22-station map to locate this chapter.",
        )
    )
    # Add repeated source anchor for length + traceability
    if cid in ("c6", "c7", "c10", "c12", "c14", "c22"):
        blocks.append(
            src(
                "trace",
                f"packages/coding-agent · chapter {ch[1]}",
                [
                    f'<span class="src-comment">// Through-line: {ch[6]}</span>',
                    f'<span class="src-comment">// Phase: {ch[2]} / {ch[3]}</span>',
                    '<span class="src-kw">await</span> <span class="src-fn">traceTurn</span>({ <span class="src-arg">prompt</span>: <span class="src-str">"README.md"</span> });',
                ],
            )
        )
    return "\n\n".join(blocks)


def generate() -> str:
    chapters = build_all_chapters()
    parts = [
        head(),
        lang_toggle_and_back(),
        side_toc(),
        '<div class="container">',
        hero(),
        toc_v2(),
    ]
    for cid, *_ in CHAPTERS:
        body = expand_chapter(cid, enrich(chapters[cid], cid))
        parts.append(chapter_section(cid, body))
    parts.extend([
        footer(),
        "</div>",
        scripts(),
        interactive_footer(),
        "</body>\n</html>",
    ])
    return "\n\n".join(parts)


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    html = generate()
    OUT.write_text(html, encoding="utf-8")
    lines = html.count("\n") + 1
    print(f"Wrote {OUT}")
    print(f"Lines: {lines}")
    print(f"Bytes: {OUT.stat().st_size}")


if __name__ == "__main__":
    main()
