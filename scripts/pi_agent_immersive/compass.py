"""Per-chapter compass navigation — where you are in the forest."""
from __future__ import annotations

from meta import CHAPTERS, TOC_GROUPS, TOC_GROUPS_BG

# (phase_roman, phase_zh, phase_en, station_hint_zh, station_hint_en, forest_zh, forest_en)
COMPASS_META: dict[str, tuple[str, str, str, str, str, str, str]] = {
    "c1": ("0", "引子", "Prologue", "站 00 · 心智", "St. 00 · mindset", "森林入口：先建立 harness 心智", "Forest entry: harness mindset first"),
    "c2": ("0", "引子", "Prologue", "站 01–22 · 全景", "St. 01–22 · map", "望远镜：22 站 + 7 里程碑总览", "Telescope: 22 stations + 7 milestones"),
    "c3": ("·", "背景", "Background", "—", "—", "树根：pi-mono 家谱", "Roots: pi-mono family tree"),
    "c4": ("·", "背景", "Background", "—", "—", "六层蛋糕：依赖方向", "Six-layer cake: dependency flow"),
    "c5": ("·", "背景", "Background", "—", "—", "边界：故意不做的功能", "Boundary: intentionally omitted"),
    "c6": ("I", "入口", "Intake", "站 01–03", "St. 01–03", "CLI 启动 → createAgentSession", "CLI boot → createAgentSession"),
    "c7": ("I", "入口", "Intake", "站 04–06", "St. 04–06", "中枢：AgentSession.prompt()", "Hub: AgentSession.prompt()"),
    "c8": ("I", "入口", "Intake", "站 07", "St. 07", "上下文栈：AGENTS.md 叠加", "Context stack: AGENTS.md layers"),
    "c9": ("II", "心脏", "Heart", "站 08–09", "St. 08–09", "消息 IR：AgentMessage ≠ Message", "Message IR: AgentMessage ≠ Message"),
    "c10": ("II", "心脏", "Heart", "站 10–11", "St. 10–11", "双环：follow-up × tool batch", "Twin loops: follow-up × tool batch"),
    "c11": ("II", "心脏", "Heart", "站 12", "St. 12", "插队：steering / follow-up", "Injection: steering / follow-up"),
    "c12": ("II", "心脏", "Heart", "站 13–14", "St. 13–14", "工具：read README · 截断", "Tools: read README · truncation"),
    "c13": ("II", "心脏", "Heart", "站 15", "St. 15", "事件总线 → TUI 燃料", "Event bus → TUI fuel"),
    "c14": ("III", "LLM", "LLM", "站 16", "St. 16", "pi-ai：provider 抽象", "pi-ai: provider abstraction"),
    "c15": ("III", "LLM", "LLM", "站 17", "St. 17", "流式：text_delta / toolcall_delta", "Streaming: text_delta / toolcall_delta"),
    "c16": ("III", "LLM", "LLM", "站 18", "St. 18", "认证与模型目录", "Auth and model catalog"),
    "c17": ("IV", "终端", "Terminal", "站 19", "St. 19", "CSI 2026 差分渲染", "CSI 2026 differential render"),
    "c18": ("IV", "终端", "Terminal", "站 20", "St. 20", "Interactive：Editor + Markdown", "Interactive: Editor + Markdown"),
    "c19": ("V", "扩展", "Extensions", "—", "—", "Extension API 面", "Extension API surface"),
    "c20": ("V", "扩展", "Extensions", "—", "—", "ExtensionRunner · jiti", "ExtensionRunner · jiti"),
    "c21": ("V", "扩展", "Extensions", "—", "—", "Pi Packages 分享 harness", "Pi Packages share harness"),
    "c22": ("VI", "持久化", "Persistence", "站 21", "St. 21", "JSONL 会话树落盘", "JSONL session tree on disk"),
    "c23": ("VI", "持久化", "Persistence", "站 22", "St. 22", "Compaction 压缩上下文", "Compaction compresses context"),
    "c24": ("VII", "全景", "Landscape", "—", "—", "对比 Claude Code / Cursor", "vs Claude Code / Cursor"),
    "c25": ("VII", "全景", "Landscape", "—", "—", "RPC · pi-server", "RPC · pi-server"),
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

    phase_label_zh = f"Phase {roman} · {pzh}" if roman not in ("0", "·", "∎") else pzh
    phase_label_en = f"Phase {roman} · {pen}" if roman not in ("0", "·", "∎") else pen

    return f"""    <nav class="chap-compass" aria-label="Chapter {num} navigation">
      <div class="cc-row cc-loc">
        <span class="cc-phase"><span class="lang-zh-only">{phase_label_zh}</span><span class="lang-en-only">{phase_label_en}</span></span>
        <span class="cc-sep">·</span>
        <span class="cc-chap">C{num} / {total:02d}</span>
        <span class="cc-sep">·</span>
        <span class="cc-station"><span class="lang-zh-only">{stz}</span><span class="lang-en-only">{ste}</span></span>
      </div>
      <div class="cc-row cc-forest">
        <span class="cc-forest-label lang-zh-only">你在森林的这里</span>
        <span class="cc-forest-label lang-en-only">You are here</span>
        <span class="cc-forest-text lang-zh-only">{fzh}</span>
        <span class="cc-forest-text lang-en-only">{fen}</span>
      </div>
      <div class="cc-row cc-links">
        {prev_link or '<span class="cc-nav cc-empty"></span>'}
        <a class="cc-back-map" href="#forest-overview"><span class="lang-zh-only">↑ 回到总览</span><span class="lang-en-only">↑ Forest map</span></a>
        {next_link or '<span class="cc-nav cc-empty"></span>'}
      </div>
    </nav>"""
