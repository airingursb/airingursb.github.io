"""Deep bilingual expansions for DSH immersive chapters."""
from __future__ import annotations

from expand import case_study, doc_crossref_table
from _html_helpers import depth_zone_close, depth_zone_open, faq_block, join, section_block, stage_banner, trace_box, why_care
from meta import CHAPTERS

PROMPT_ZH = "读取 README.md，用一句话告诉我这个项目做什么"
PROMPT_EN = "read README.md and tell me what this project does in one sentence"


def _why(intuition: tuple[str, str], counter: tuple[str, str], optimize: tuple[str, str]) -> str:
    return why_care([
        ("直觉", intuition[0], intuition[1], ""),
        ("反直觉", counter[0], counter[1], "rev"),
        ("优化", optimize[0], optimize[1], "act"),
    ])


def _banner(module: tuple[str, str], package: tuple[str, str], thread: tuple[str, str], output: tuple[str, str]) -> str:
    return stage_banner([
        ("模块", "Module", module[0], module[1]),
        ("包", "Package", package[0], package[1]),
        ("线程", "Thread", thread[0], thread[1]),
        ("输出", "Output", output[0], output[1]),
    ])


def _trace(station: str, zh: str, en: str) -> str:
    return trace_box(station, zh, en)


def _sec(title_zh: str, title_en: str, sec: str, *paragraphs: tuple[str, str]) -> str:
    return section_block(title_zh, title_en, list(paragraphs), sec=sec)


def deepen(cid: str, base: str) -> str:
    d = DEPTH.get(cid)
    if not d:
        return base
    ch_num = next(c[1] for c in CHAPTERS if c[0] == cid)
    parts: list[str] = []
    if d.get("why"):
        parts.append(d["why"])
    if d.get("banner"):
        parts.append(d["banner"])
    parts.append(base)
    if d.get("trace"):
        parts.append(d["trace"])
    parts.append(depth_zone_open(ch_num))
    sec = 4
    for block in d.get("sections", []):
        parts.append(_sec(block[0], block[1], f"C{ch_num}.{sec}", *block[2]))
        sec += 1
    if d.get("faq"):
        parts.append(faq_block(d["faq"]))
    if d.get("case"):
        parts.append(case_study(*d["case"]))
    if d.get("docs"):
        parts.append(doc_crossref_table(d["docs"]))
    parts.append(depth_zone_close())
    return join(*parts)


def _ch(
    module: tuple[str, str],
    package: tuple[str, str],
    thread: tuple[str, str],
    output: tuple[str, str],
    trace_zh: str,
    trace_en: str,
    *,
    sections: list | None = None,
    faq: list | None = None,
    case: tuple | None = None,
    docs: list[str] | None = None,
) -> dict:
    return {
        "why": _why(
            ("本章回答「这条主线 prompt 在此层长什么样」", "This chapter answers what the through-line prompt looks like at this layer"),
            ("DSH 没有隐藏魔法——一切可替换行为都在 Cordis 事件或 SessionEvent 里", "DSH has no hidden magic — replaceable behavior lives in Cordis events or SessionEvents"),
            ("读源码时先搜 session.append 与 ctx.* 注册点", "When reading source, search session.append and ctx.* registration first"),
        ),
        "banner": _banner(module, package, thread, output),
        "trace": _trace(f"station {module[0]}", trace_zh, trace_en),
        "sections": sections or [],
        "faq": faq,
        "case": case,
        "docs": docs,
    }


DEPTH: dict[str, dict] = {
    "c1": _ch(
        ("引子", "Prologue"), ("docs/", "docs/"), ("用户回车", "user Enter"), ("harness 心智", "harness mindset"),
        "站 00：理解 DSH 是插件组合，不是密封产品。",
        "St. 00: DSH is plugin composition, not a sealed product.",
        sections=[("密封 vs 可组合", "Sealed vs composable", [
            ("Claude Code / Cursor 把 agent-loop 封在产品里；DSH 把 loop、tools、llm 都做成可 patch 的 Cordis 插件。", "Claude Code / Cursor seal agent-loop in the product; DSH makes loop, tools, llm patchable Cordis plugins."),
        ])],
        docs=["architecture", "cordis-primer"],
    ),
    "c9": _ch(
        ("session", "session"), ("packages/core/session", "packages/core/session"), ("append", "append"), ("deriveMessages", "deriveMessages"),
        "站 08：model-visible means logged — 一切进模型的必须能由 log 重建。",
        "St. 08: model-visible means logged — anything reaching the model must be reconstructable from the log.",
        docs=["architecture"],
    ),
    "c10": _ch(
        ("agent-loop", "agent-loop"), ("packages/core/agent-loop", "packages/core/agent-loop"), ("ReactLoopAgent", "ReactLoopAgent"), ("turn/step", "turn/step"),
        "站 10：turn 包裹一个或多个 step；主线 read 通常占一个 step。",
        "St. 10: turn wraps one or more steps; through-line read usually costs one step.",
        docs=["agent-lifecycle"],
    ),
    "c12": _ch(
        ("tools", "tools"), ("packages/core/tools", "packages/core/tools"), ("executeToolCalls", "executeToolCalls"), ("tool/result", "tool/result"),
        "站 13：read README 走 tools/pre-execute → execute → post-execute 瀑布。",
        "St. 13: read README goes through tools/pre-execute → execute → post-execute waterfall.",
        docs=["tool-execution-pipeline"],
    ),
    "c16": _ch(
        ("deriveMessages", "deriveMessages"), ("packages/core/session", "packages/core/session"), ("step 边界", "step boundary"), ("llm request", "llm request"),
        "站 18：每次 model 请求前 deriveMessages() 从 log 投影 history。",
        "St. 18: deriveMessages() projects history from log before each model request.",
    ),
    "c24": _ch(
        ("对比", "Compare"), ("—", "—"), ("Pi vs DSH", "Pi vs DSH"), ("设计取舍", "trade-offs"),
        "站 24：Pi runLoop 双环 vs DSH turn/step — 同一主线 prompt 的不同编排哲学。",
        "St. 24: Pi runLoop twin loops vs DSH turn/step — same prompt, different orchestration philosophy.",
    ),
    "c26": _ch(
        ("Coda", "Coda"), ("apps/cli", "apps/cli"), ("--dump-config", "--dump-config"), ("session log", "session log"),
        "站 26：clone repo → dsh web → 读 session/event 与 event map。",
        "St. 26: clone repo → dsh web → read session/event and event map.",
        case=(
            "自己 trace 一轮",
            "Trace a turn yourself",
            "1. <code>git clone deepseek-ai/deepseek-harness</code><br>2. <code>pnpm i && pnpm dsh web</code><br>3. 发送主线 prompt<br>4. 在 DevTools 或日志里过滤 <code>session/event</code>",
            "1. <code>git clone deepseek-ai/deepseek-harness</code><br>2. <code>pnpm i && pnpm dsh web</code><br>3. Send through-line prompt<br>4. Filter <code>session/event</code> in DevTools or logs",
        ),
    ),
}

# Light depth for remaining chapters
for cid, mod, pkg, thr, out, zh, en in [
    ("c2", "全景", "Panorama", "docs/", "turn flow map", "22 站总览", "22-station overview"),
    ("c3", "Cordis", "Cordis", "vendor/", "ctx", "插件挂载", "plugin mount"),
    ("c4", "core spine", "core spine", "packages/core/*", "ctx.*", "六包依赖", "six-package spine"),
    ("c5", "plugin", "plugin", "packages/*", "patchable", "无特权核心", "no privileged core"),
    ("c6", "boot", "boot", "apps/cli", "profile", "dsh web 启动", "dsh web boot"),
    ("c7", "agents", "agents", "packages/core/agent", "ctx.agents", "Agent 注册", "Agent registry"),
    ("c8", "system-prompt", "system-prompt", "packages/core/system-prompt", "assemble", "prompt 组装", "prompt assembly"),
    ("c11", "pre-step", "pre-step", "agent-loop", "waterfall", "reject/rewrite", "reject/rewrite"),
    ("c13", "events", "events", "docs/", "三域", "session/agent/capability", "three domains"),
    ("c14", "llm", "llm", "packages/llm", "ctx.llm", "适配缝", "adapter seam"),
    ("c15", "chunk", "chunk", "assistant/chunk", "stream", "流式 chunk", "streaming chunks"),
    ("c17", "web", "web", "packages/web", "ctx.web", "Web 能力", "Web capability"),
    ("c18", "tool-web", "tool-web", "packages/tool-web", "consumer", "模型调网", "model hits network"),
    ("c19", "extensions", "extensions", "Cordis", "inject", "插件 API", "plugin API"),
    ("c20", "loader", "loader", "packages/bundle", "dsh-base", "bundle 层叠", "bundle stack"),
    ("c21", "patch", "patch", "cordis.patch.yml", "overlay", "组合定制", "composition customize"),
    ("c22", "persist", "persist", "session", "JSONL", "落盘", "persistence"),
    ("c23", "compaction", "compaction", "packages/compaction", "surface", "压缩", "compaction"),
    ("c25", "rpc", "rpc", "profiles", "headless", "多入口", "multi entry"),
]:
    DEPTH[cid] = _ch(
        (mod, mod), (pkg, pkg), (thr, thr), (out, out),
        f"站 {mod}：{zh}。", f"St. {mod}: {en}.",
    )
