"""Cross-reference map between DeepSeek Harness official docs and production packages."""

from __future__ import annotations

from _html_helpers import note

DOC_REFERENCES: list[tuple[str, str, str, str, str, str]] = [
    (
        "architecture",
        "架构总览",
        "Architecture overview",
        "docs/architecture.md",
        "Cordis 插件树、Profile×Bundle 组合、六大 ctx 服务与 turn 流",
        "Cordis plugin tree, Profile×Bundle composition, six core ctx services, and turn flow",
    ),
    (
        "agent-lifecycle",
        "Agent 生命周期",
        "Agent lifecycle",
        "docs/agent-lifecycle.md",
        "turn/step 双环、agent/pre-step waterfall、session 与 agent 事件分工",
        "turn/step twin loops, agent/pre-step waterfall, session vs agent event split",
    ),
    (
        "tool-execution-pipeline",
        "工具执行管线",
        "Tool execution pipeline",
        "docs/tool-execution-pipeline.md",
        "tools/pre-execute → execute → post-execute 三段 waterfall 与审批链",
        "tools/pre-execute → execute → post-execute waterfalls and approval chain",
    ),
    (
        "event-producer-consumer",
        "事件生产消费矩阵",
        "Event producer-consumer matrix",
        "docs/event-producer-consumer.md",
        "每个 harness 事件的 dispatch 模式、声明位置、生产者与消费者包",
        "Dispatch mode, declaration site, producers and listeners per harness event",
    ),
    (
        "capability-seams",
        "能力接缝图",
        "Capability seams",
        "docs/capability-seams.md",
        "ctx.fs / ctx.shell / ctx.sandbox 等可替换 seam 与实现包映射",
        "Swappable seams (ctx.fs, ctx.shell, ctx.sandbox) and implementation packages",
    ),
    (
        "cordis-primer",
        "Cordis 入门",
        "Cordis primer",
        "docs/cordis-primer.md",
        "插件=Service、inject 依赖、waterfall 语义、可逆 effect 五条范式",
        "Plugin=Service, inject deps, waterfall semantics, reversible effects — five ideas",
    ),
]


def doc_ref(doc_id: str) -> str:
    row = next((r for r in DOC_REFERENCES if r[0] == doc_id), None)
    if not row:
        return ""
    _id, title_zh, title_en, path, summary_zh, summary_en = row
    return note(
        f"📘 <strong>{title_zh}</strong>（<code>{path}</code>）· {summary_zh}",
        f"📘 <strong>{title_en}</strong> (<code>{path}</code>) · {summary_en}",
        copper=True,
    )
