"""Per-chapter compass navigation — where you are in the forest."""
from __future__ import annotations

from meta import CHAPTERS, TOC_GROUPS, TOC_GROUPS_BG

COMPASS_META: dict[str, tuple[str, str, str, str, str, str, str]] = {
    "c1": ("0", "引子", "Prologue", "站 00", "St. 00", "森林入口：Harness ≠ Product", "Forest entry: Harness ≠ Product"),
    "c2": ("0", "引子", "Prologue", "站 01–22", "St. 01–22", "turn/step 全景图", "turn/step panorama"),
    "c3": ("·", "背景", "Background", "—", "—", "Cordis 与 monorepo 家谱", "Cordis and monorepo family tree"),
    "c4": ("·", "背景", "Background", "—", "—", "Core spine 六包", "Core spine six packages"),
    "c5": ("·", "背景", "Background", "—", "—", "一切皆插件", "Everything is a plugin"),
    "c6": ("I", "入口", "Intake", "站 01–03", "St. 01–03", "dsh web 启动链", "dsh web boot chain"),
    "c7": ("I", "入口", "Intake", "站 04–06", "St. 04–06", "ctx.agents 生命周期", "ctx.agents lifecycle"),
    "c8": ("I", "入口", "Intake", "站 07", "St. 07", "system-prompt 组装", "system-prompt assembly"),
    "c9": ("II", "心脏", "Heart", "站 08–09", "St. 08–09", "Session log 不变量", "Session log invariant"),
    "c10": ("II", "心脏", "Heart", "站 10–11", "St. 10–11", "ReactLoopAgent 驱动", "ReactLoopAgent driver"),
    "c11": ("II", "心脏", "Heart", "站 12", "St. 12", "agent/pre-step 瀑布", "agent/pre-step waterfall"),
    "c12": ("II", "心脏", "Heart", "站 13–14", "St. 13–14", "Tool 执行管线", "Tool execution pipeline"),
    "c13": ("II", "心脏", "Heart", "站 15", "St. 15", "三域事件矩阵", "Three-domain event matrix"),
    "c14": ("III", "LLM", "LLM", "站 16", "St. 16", "ctx.llm 适配缝", "ctx.llm adapter seam"),
    "c15": ("III", "LLM", "LLM", "站 17", "St. 17", "assistant/chunk 流式", "assistant/chunk streaming"),
    "c16": ("III", "LLM", "LLM", "站 18", "St. 18", "deriveMessages 闭环", "deriveMessages closed loop"),
    "c17": ("IV", "Web", "Web", "站 19", "St. 19", "ctx.web 能力缝", "ctx.web capability seam"),
    "c18": ("IV", "Web", "Web", "站 20", "St. 20", "tool-web Consumer", "tool-web consumer"),
    "c19": ("V", "扩展", "Extensions", "—", "—", "Cordis 插件面", "Cordis plugin surface"),
    "c20": ("V", "扩展", "Extensions", "—", "—", "Loader 与 bundle", "Loader and bundle"),
    "c21": ("V", "扩展", "Extensions", "—", "—", "cordis.patch 组合", "cordis.patch composition"),
    "c22": ("VI", "持久化", "Persistence", "站 21", "St. 21", "SessionEvent JSONL", "SessionEvent JSONL on disk"),
    "c23": ("VI", "持久化", "Persistence", "站 22", "St. 22", "Compaction · surface", "Compaction · surface replace"),
    "c24": ("VII", "全景", "Landscape", "—", "—", "对比 Pi Harness", "vs Pi harness"),
    "c25": ("VII", "全景", "Landscape", "—", "—", "JSON-RPC · profiles", "JSON-RPC · profiles"),
    "c26": ("∎", "Coda", "Coda", "—", "—", "自己 trace 一轮", "Trace a turn yourself"),
}


def _chapter_index(cid: str) -> int:
    return next(i for i, c in enumerate(CHAPTERS) if c[0] == cid)


def chapter_compass(cid: str) -> str:
    idx = _chapter_index(cid)
    ch = CHAPTERS[idx]
    num = ch[1]
    total = len(CHAPTERS)
    meta = COMPASS_META.get(cid, ("?", ch[2], ch[3], "—", "—", ch[6], ch[7]))
    roman, pzh, pen, stz, ste, fzh, fen = meta

    prev_link = next_link = ""
    if idx > 0:
        pc = CHAPTERS[idx - 1]
        prev_link = (
            f'<a class="cc-nav cc-prev" href="#{pc[0]}">'
            f'<span class="cc-arrow">←</span> '
            f'<span class="cc-nav-num">C{pc[1]}</span> '
            f'<span class="lang-zh-only">{pc[4]}</span>'
            f'<span class="lang-en-only">{pc[5]}</span></a>'
        )
    if idx < total - 1:
        nc = CHAPTERS[idx + 1]
        next_link = (
            f'<a class="cc-nav cc-next" href="#{nc[0]}">'
            f'<span class="cc-nav-num">C{nc[1]}</span> '
            f'<span class="lang-zh-only">{nc[4]}</span>'
            f'<span class="lang-en-only">{nc[5]}</span> '
            f'<span class="cc-arrow">→</span></a>'
        )

    return f"""    <nav class="chapter-compass" aria-label="Chapter navigation">
      <div class="cc-row">
        <div class="cc-phase"><span class="cc-roman">{roman}</span> · <span class="lang-zh-only">{pzh}</span><span class="lang-en-only">{pen}</span></div>
        <div class="cc-station"><span class="lang-zh-only">{stz}</span><span class="lang-en-only">{ste}</span> · C{num}/{total:02d}</div>
      </div>
      <div class="cc-forest"><span class="lang-zh-only">{fzh}</span><span class="lang-en-only">{fen}</span></div>
      <div class="cc-links">
        {prev_link}
        <a class="cc-map" href="#forest-overview"><span class="lang-zh-only">回到总览</span><span class="lang-en-only">Forest map</span></a>
        {next_link}
      </div>
    </nav>"""
