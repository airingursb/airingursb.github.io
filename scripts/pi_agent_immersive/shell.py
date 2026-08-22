"""HTML shell assembly for Pi Agent immersive article."""
from __future__ import annotations

from pathlib import Path

from meta import (
    CHAPTERS,
    DATE,
    DECK_EN,
    DECK_ZH,
    FIELD_NOTE,
    OG_IMAGE,
    SLUG,
    SUBTITLE_EN,
    SUBTITLE_ZH,
    TITLE_EN,
    TITLE_ZH,
    TOC_GROUPS,
    TOC_GROUPS_BG,
)
from textbook_map import TEXTBOOK_CHECKPOINTS

TEMPLATE = Path(__file__).resolve().parents[2] / "public/immersive/llm-inference-life/index.html"

# Pipeline cell color by chapter phase
PIPELINE_COLORS = {
    "c1": "p0", "c2": "p0",
    "c3": "p1", "c4": "p1", "c5": "p1",
    "c6": "p2", "c7": "p2", "c8": "p2",
    "c9": "p3", "c10": "p3", "c11": "p3", "c12": "p3", "c13": "p3",
    "c14": "p4", "c15": "p4", "c16": "p4",
    "c17": "p5", "c18": "p5",
    "c19": "p6", "c20": "p6", "c21": "p6",
    "c22": "p7", "c23": "p7",
    "c24": "p8", "c25": "p8",
    "c26": "pc",
}

EXTRA_CSS = """
  .formula {
    background: var(--ink); color: var(--bg);
    padding: 32px; margin: 32px 0;
    font-family: var(--mono); font-size: 14px; line-height: 1.9;
    border-radius: 4px; position: relative;
  }
  .formula .ftitle {
    font-family: var(--sans); font-size: 11px;
    letter-spacing: 0.22em; text-transform: uppercase;
    margin-bottom: 16px; color: var(--rule);
  }
  .formula .cond { display: block; margin: 4px 0; }
  .formula .cond::before { content: "▸"; color: var(--accent-soft); margin-right: 12px; }
  .formula .out {
    margin-top: 16px; padding-top: 16px;
    border-top: 1px solid #2c2f36; color: var(--accent-soft);
  }
  .formula .term { color: #fcd34d; font-weight: 700; }
  .formula .term-cu { color: #d1855a; font-weight: 700; }
  .ladder {
    background: var(--paper); border: 1px solid var(--rule);
    border-radius: 4px; padding: 22px 24px; margin: 8px 0 24px;
  }
  .ladder .ld-row {
    display: grid; grid-template-columns: 36px 1fr;
    align-items: center; gap: 14px;
    padding: 10px 0; border-bottom: 1px dashed var(--rule);
  }
  .ladder .ld-row:last-child { border-bottom: none; }
  .ladder .ld-num {
    font-family: var(--mono); font-size: 22px; color: var(--accent);
    font-weight: 700; line-height: 1;
  }
  .ladder .ld-row:nth-child(2) .ld-num { color: #3873a3; }
  .ladder .ld-row:nth-child(3) .ld-num { color: #6285a8; }
  .ladder .ld-row:nth-child(4) .ld-num { color: #8090a8; }
  .ladder .ld-name {
    font-family: var(--serif); font-size: 15px; font-weight: 700; color: var(--ink);
  }
  body.lang-en .ladder .ld-name { font-family: var(--serif-en); }
  .ladder .ld-desc {
    font-family: var(--sans); font-size: 12px; color: var(--ink-mute);
    margin-top: 2px;
  }
  .pi-fig { width: 100%; overflow-x: auto; }
  .pi-fig.wide svg { min-width: 720px; }
  .pi-svg { width: 100%; height: auto; display: block; }
  .pi-svg .svg-label {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
    text-transform: uppercase; fill: var(--ink-mute);
  }
  .pi-svg .svg-body { font-family: var(--sans); font-size: 12px; fill: var(--ink); }
  .pi-svg .svg-mute { font-family: var(--sans); font-size: 10.5px; fill: #767c87; }
  .pi-svg .svg-micro { font-family: var(--mono); font-size: 9px; fill: var(--ink-soft); }
  .pi-svg .svg-tiny { font-family: var(--mono); font-size: 10px; fill: var(--ink); }
  .pi-svg .svg-mono { font-family: var(--mono); font-size: 11px; fill: var(--ink-soft); }
  .pi-svg .svg-box { fill: #faf6ed; stroke: #c7c4ba; stroke-width: 1.5; }
  .pi-svg .svg-box.accent { fill: #e8f0f8; stroke: #1f5c8c; }
  .pi-svg .svg-box.copper { fill: #f5ebe0; stroke: #b35a1f; }
  .pi-svg .svg-box.gpu { fill: #efe8f5; stroke: #6b3aa3; }
  .pi-svg .svg-box.asm { fill: #e8f2ec; stroke: #2d6a4f; }
  .pi-svg .svg-box.paper { fill: #f3efe6; stroke: #c7c4ba; }
  .pi-svg .svg-box.muted { fill: #ebe5d8; stroke: #c7c4ba; }
  .pi-svg .svg-arrow { stroke: #1f5c8c; stroke-width: 1.5; marker-end: url(#pi-arr); }
  .toc-group[data-phase="heart"] { border-left-color: var(--accent); background: linear-gradient(135deg, rgba(31,92,140,0.04) 0%, var(--paper) 60%); }
  .toc-group[data-phase="llm"] { border-left-color: var(--gpu); background: linear-gradient(135deg, rgba(107,58,163,0.05) 0%, var(--paper) 60%); }
  .toc-group[data-phase="tui"] { border-left-color: var(--asm); background: linear-gradient(135deg, rgba(45,106,79,0.04) 0%, var(--paper) 60%); }
  .toc-group[data-phase="ext"] { border-left-color: var(--heat); background: linear-gradient(135deg, rgba(195,87,58,0.05) 0%, var(--paper) 60%); }
  .toc-group[data-phase="persist"] { border-left-color: var(--copper); background: linear-gradient(135deg, rgba(179,90,31,0.05) 0%, var(--paper) 60%); }
  .toc-group[data-phase="land"] { border-left-color: var(--gpu-soft); }
  .toc-group[data-phase="card"] { border-left-color: var(--ink-mute); }
  .perf-bar .pb-track { grid-template-columns: repeat(26, 1fr); }
  .perf-bar .pb-cell.lit { transform: translateY(-2px); box-shadow: 0 0 0 2px rgba(31,92,140,0.45); }
  #readProgress {
    position: fixed; top: 0; left: 0; height: 2px; width: 0%;
    background: linear-gradient(90deg, var(--copper), var(--accent));
    z-index: 200; transition: width 0.08s linear;
  }
  .session-tree {
    font-family: var(--mono); font-size: 11px; line-height: 1.7;
    padding: 16px; background: var(--paper-2);
  }
  .session-tree .st-node { padding: 4px 0 4px 20px; border-left: 2px solid var(--rule); margin-left: 8px; }
  .session-tree .st-leaf { color: var(--accent); font-weight: 700; }
  .event-flow { font-family: var(--mono); font-size: 11px; }
  .event-flow .ef-row { display: grid; grid-template-columns: 100px 1fr; gap: 12px; padding: 6px 0; border-bottom: 1px dashed var(--rule-soft); }
  .event-flow .ef-type { color: var(--accent); font-weight: 600; }
  .milestone-table td.owner-user { color: var(--copper); }
  .milestone-table td.owner-model { color: var(--accent); }
  .milestone-table td.owner-loop { color: var(--gpu); }
  .milestone-table td.owner-tool { color: var(--asm); }
  .milestone-table .owner-user { color: var(--copper); }
  .milestone-table .owner-model { color: var(--accent); }
  .milestone-table .owner-loop { color: var(--gpu); }
  .milestone-table .owner-tool { color: var(--asm); }
  .case-study {
    margin: 22px 0; padding: 18px 20px;
    background: var(--paper-2); border: 1px solid var(--rule);
    border-left: 3px solid var(--accent); border-radius: 0 4px 4px 0;
  }
  .case-study .cs-tag {
    font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--accent); font-weight: 700; margin-bottom: 8px;
  }
"""


def extract_css() -> str:
    text = TEMPLATE.read_text(encoding="utf-8")
    start = text.index("<style>") + len("<style>")
    end = text.index("</style>", start)
    css = text[start:end]
    # Patch grid for 26 stations
    css = css.replace("grid-template-columns: repeat(28, 1fr)", "grid-template-columns: repeat(26, 1fr)")
    return css + EXTRA_CSS


def extract_interactive_css() -> str:
    text = TEMPLATE.read_text(encoding="utf-8")
    marker = '<style>\n.ursb-interactive'
    start = text.index(marker) + len("<style>")
    end = text.index("</style>", start)
    return text[start:end]


def head() -> str:
    desc_zh = (
        "你在终端敲下「读取 README.md，用一句话告诉我这个项目做什么」之后，"
        "这串文字穿过 26 道工序、跨 6 个 npm 包、在 3 层消息模型里变形——"
        "对照 earendil-works/pi 生产源码与 pi-textbook 的 15 个 checkpoint 逐行读。"
    )
    desc_en = (
        "After you type read README.md and tell me what this project does in one sentence, "
        "that string passes through 26 stations across six npm packages — "
        "cross-reading earendil-works/pi production source with pi-textbook checkpoints."
    )
    return f"""<!DOCTYPE html>
<html lang="zh-CN" translate="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="google" content="notranslate">
<meta name="referrer" content="strict-origin-when-cross-origin">
<link rel="shortcut icon" href="https://airing.ursb.me/image/favicon.ico">
<link rel="apple-touch-icon" href="https://airing.ursb.me/image/favicon.ico">
<link rel="icon" href="https://airing.ursb.me/image/favicon.ico">
<meta name="description" content="{desc_zh}">
<meta name="author" content="Airing">
<meta property="og:title" content="{TITLE_ZH} — Pi Agent 源码全景">
<meta property="og:description" content="CLI → AgentSession → agentLoop → pi-ai → tools → JSONL → TUI diff · 真源码逐行。">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:url" content="https://ursb.me/immersive/{SLUG}/">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ursb.me · Airing">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE_ZH}">
<meta name="twitter:description" content="{desc_en}">
<meta name="twitter:image" content="{OG_IMAGE}">
<meta name="twitter:creator" content="@airingursb">
<title>{TITLE_ZH} — Pi Agent 源码全景</title>
<style>
{extract_css()}
</style>
<script async defer src="https://analytics.ursb.me/script.js" data-website-id="aa8d5a16-df21-4058-a0a8-0191cdd3798d"></script>
<style>
{extract_interactive_css()}
</style>
</head>
<body>
<div id="readProgress" aria-hidden="true"></div>"""


def lang_toggle_and_back() -> str:
    return """
<a class="ursb-backlink" href="https://ursb.me/notes/pi-agent/">← ursb.me</a>
<div class="lang-toggle" role="navigation" aria-label="language">
  <button id="lang-zh" class="active" aria-pressed="true">中</button>
  <span class="sep">/</span>
  <button id="lang-en" aria-pressed="false">EN</button>
</div>"""


def side_toc() -> str:
    items: list[str] = []
    chapter_map = {c[0]: c for c in CHAPTERS}
    prev_phase = None
    for gid, num, pzh, pen, _sub, _cnt, cids in TOC_GROUPS_BG + TOC_GROUPS:
        phase_label = f"{num} · {pzh}" if num not in ("0", "∎", "·") else pzh
        if phase_label != prev_phase and num not in ("0",):
            items.append(
                f'    <li class="ts-divider"><span class="lang-zh-only">{phase_label}</span>'
                f'<span class="lang-en-only">{num} · {pen}</span></li>'
            )
            prev_phase = phase_label
        for cid in cids:
            ch = chapter_map[cid]
            items.append(
                f'    <li data-section="{cid}"><a href="#{cid}">'
                f'<span class="toc-num">{ch[1]}</span>'
                f'<span class="lang-zh-only">{ch[4]}</span>'
                f'<span class="lang-en-only">{ch[5]}</span></a></li>'
            )
    return f"""<nav class="toc-side" aria-label="Side contents">
  <div class="toc-label">CONTENTS</div>
  <ol>
{chr(10).join(items)}
  </ol>
</nav>"""


def pipeline_bar() -> str:
    cells = []
    chapter_map = {c[0]: c for c in CHAPTERS}
    for cid, *_ in CHAPTERS:
        ch = chapter_map[cid]
        cls = PIPELINE_COLORS.get(cid, "p2")
        title = f"C{ch[1]} {ch[4]}"
        cells.append(
            f'        <div class="pb-cell {cls}" data-n="{ch[1]}" data-jump="#{cid}" title="{title}"></div>'
        )
    cells_html = "\n".join(cells)
    return f"""    <div class="perf-bar">
      <div class="pb-title">
        <span class="lang-zh-only">一条用户消息 · 26 个站</span>
        <span class="lang-en-only">One user message · 26 stations</span>
        <span class="pb-pulse">▸ live trace</span>
      </div>
      <div class="pb-track" id="pbTrack">
{cells_html}
      </div>
      <div class="pb-axis">
        <span class="lang-zh-only">回车</span><span class="lang-en-only">Enter</span>
        <span></span><span></span><span></span><span></span><span></span>
        <span class="lang-zh-only">JSONL</span><span class="lang-en-only">JSONL</span>
      </div>
    </div>"""


def hero() -> str:
    return f"""  <header class="hero">
    <div class="meta">
      <span>FIELD&nbsp;NOTE&nbsp;/&nbsp;{FIELD_NOTE}</span>
      <span class="lang-zh-only">Pi Agent · Harness 工程</span>
      <span class="lang-en-only">Pi Agent · Harness Engineering</span>
      <span>{DATE[:4]}</span>
    </div>
    <h1 class="lang-zh-only">一条用户消息在<br><span class="copper">Pi Agent</span>里的<span class="accent">一生</span>。</h1>
    <h1 class="lang-en-only">The <span class="copper">life</span> of one user message<br>inside <span class="accent">Pi Agent</span>.</h1>
    <p class="subtitle lang-zh-only">{SUBTITLE_ZH.replace(" · ", ' <span class="arr">→</span> ')}</p>
    <p class="subtitle lang-en-only">{SUBTITLE_EN.replace(" · ", ' <span class="arr">→</span> ')}</p>
    <p class="deck lang-zh-only">{DECK_ZH}</p>
    <p class="deck lang-en-only">{DECK_EN}</p>
    <div class="byline">
      <span><span class="label">AUTHOR</span><a class="value" href="https://ursb.me" target="_blank" rel="noopener">Airing</a></span>
      <span><span class="label">SOURCE</span><span class="value">earendil-works/pi · hahhforest/pi-textbook</span></span>
      <span><span class="label">FORMAT</span><span class="value">Long Read</span></span>
    </div>

    <aside class="hero-notice">
      <div class="hn-tag">
        <span class="lang-zh-only">这篇要解决什么</span>
        <span class="lang-en-only">What this is for</span>
      </div>
      <p class="hn-body lang-zh-only">主线 prompt 固定为：<strong>「读取 README.md，用一句话告诉我这个项目做什么」</strong>——与 pi-textbook 序章相同。这不是 Pi 的使用教程，而是<strong>把一条用户消息从终端回车追到 JSONL 落盘</strong>的源码级 walkthrough。对照生产仓库 <code>earendil-works/pi</code> 与教学仓库 <code>hahhforest/pi-textbook</code> 的 15 个 checkpoint，每一章对应一层真实抽象。</p>
      <p class="hn-body lang-en-only">The through-line prompt is fixed: <strong>«read README.md and tell me what this project does in one sentence»</strong> — same as the pi-textbook prologue. This is not a Pi user guide but a <strong>source-level walkthrough from Enter to JSONL on disk</strong>. Cross-reading production <code>earendil-works/pi</code> with <code>hahhforest/pi-textbook</code>'s 15 checkpoints — each chapter maps to one real abstraction layer.</p>
    </aside>

    <aside class="tldr">
      <div class="tldr-tag">
        <span class="lang-zh-only">主线 · 七个里程碑</span>
        <span class="lang-en-only">Through-line · seven milestones</span>
      </div>
      <div class="tldr-steps">
        <div class="tldr-step">
          <div class="tldr-step-n">01</div>
          <div class="tldr-step-name lang-zh-only">用户消息</div>
          <div class="tldr-step-name lang-en-only">user_message</div>
          <div class="tldr-step-hint">owner=user</div>
        </div>
        <div class="tldr-step">
          <div class="tldr-step-n">02</div>
          <div class="tldr-step-name lang-zh-only">第一次 model</div>
          <div class="tldr-step-name lang-en-only">model_start</div>
          <div class="tldr-step-hint">turn=1 · toolUse</div>
        </div>
        <div class="tldr-step">
          <div class="tldr-step-n">03</div>
          <div class="tldr-step-name lang-zh-only">read 工具调用</div>
          <div class="tldr-step-name lang-en-only">tool_start</div>
          <div class="tldr-step-hint">call_1 · README</div>
        </div>
        <div class="tldr-step">
          <div class="tldr-step-n">04</div>
          <div class="tldr-step-name lang-zh-only">最终回答</div>
          <div class="tldr-step-name lang-en-only">assistant stop</div>
          <div class="tldr-step-hint">turn=2 · stopReason=stop</div>
        </div>
      </div>
      <div class="tldr-skip">
        <span class="lang-zh-only">已经懂 agent 基础? 直接跳到 → <a href="#c7">AgentSession</a> · <a href="#c10">runLoop 双环</a> · <a href="#c14">pi-ai</a> · <a href="#c17">TUI diff</a> · <a href="#c22">JSONL 会话树</a> · <a href="#c24">vs Claude Code</a></span>
        <span class="lang-en-only">Know agent basics? Skip to → <a href="#c7">AgentSession</a> · <a href="#c10">runLoop twin loops</a> · <a href="#c14">pi-ai</a> · <a href="#c17">TUI diff</a> · <a href="#c22">JSONL session tree</a> · <a href="#c24">vs Claude Code</a></span>
      </div>
    </aside>

{pipeline_bar()}
  </header>"""


def toc_v2() -> str:
    chapter_map = {c[0]: c for c in CHAPTERS}
    groups_html: list[str] = []
    all_groups = TOC_GROUPS_BG + TOC_GROUPS
    for gid, num, pzh, pen, sub, cnt, cids in all_groups:
        chips = []
        for cid in cids:
            ch = chapter_map[cid]
            special = " tc-special" if ch[8] else ""
            chips.append(
                f'        <a href="#{cid}" class="toc-chip{special}"><span class="tc-num">{ch[1]}</span>'
                f'<div class="tc-name"><span class="lang-zh-only">{ch[4]}</span>'
                f'<span class="lang-en-only">{ch[5]}</span>'
                f'<span class="tc-en">{ch[7]}</span></div></a>'
            )
        groups_html.append(
            f"""    <div class="toc-group" data-phase="{gid}">
      <div class="toc-group-head">
        <div class="tg-num">{num}</div>
        <div class="tg-name lang-zh-only">{pzh}</div>
        <div class="tg-name lang-en-only">{pen}</div>
        <div class="tg-count">{cnt}</div>
      </div>
      <div class="tg-en">{sub}</div>
      <div class="toc-chips">
{chr(10).join(chips)}
      </div>
    </div>"""
        )
    return f"""  <nav class="toc-v2" aria-label="Contents">
    <div class="tv-head">
      <div class="tv-label lang-zh-only">CONTENTS · 目录</div>
      <div class="tv-label lang-en-only">CONTENTS</div>
      <div class="tv-meta"><span class="tv-now">26</span> <span class="lang-zh-only">章 · 8 个 Phase + Coda</span><span class="lang-en-only">chapters · 8 phases + coda</span></div>
    </div>
    <div class="tv-sub lang-zh-only">「<em>读取 README.md，用一句话告诉我这个项目做什么</em>」· 26 个站。点任意一格跳转。</div>
    <div class="tv-sub lang-en-only">«<em>read README.md and tell me what this project does in one sentence</em>» · 26 stations. Click any chip.</div>

{chr(10).join(groups_html)}
  </nav>"""


def chapter_section(cid: str, body: str) -> str:
    ch = next(c for c in CHAPTERS if c[0] == cid)
    phase = ch[2].upper()
    if phase == "CODA":
        phase = "CODA"
    elif ch[2] in ("引子", "背景"):
        phase = ch[2].upper() if ch[2] == "引子" else "BACKGROUND"
    else:
        phase = ch[3].upper()
    return f"""  <section class="chap" id="{cid}">
    <div class="chap-num">CHAPTER&nbsp;{ch[1]}&nbsp;·&nbsp;{phase}</div>
    <h2 class="chap-title lang-zh-only">{ch[4]}</h2>
    <h2 class="chap-title lang-en-only">{ch[5]}</h2>
    <p class="chap-en lang-zh-only">{ch[6]}</p>
    <p class="chap-en lang-en-only">{ch[7]}</p>
{body}
  </section>"""


def footer() -> str:
    return f"""  <footer class="footer">
    <div class="ft-rule"><span class="ft-mark">END · FIELD NOTE {FIELD_NOTE}</span></div>
    <p class="lang-zh-only">这是 Field Note 系列的第十篇。<strong>姐妹篇</strong>:</p>
    <p class="lang-en-only">Tenth in the Field Note series. <strong>Sister pieces</strong>:</p>
    <div class="ft-links">
      <a href="https://ursb.me/immersive/llm-inference-life/">LLM 推理 · 28 站</a>
      <a href="https://ursb.me/immersive/chromium-renderer/">Chromium · 渲染管线</a>
      <a href="https://ursb.me/immersive/react-internals/">React · setState 一生</a>
      <a href="https://ursb.me/immersive/quickjs/">QuickJS · 一行 JS</a>
    </div>
    <p class="lang-zh-only" style="margin-top:24px;font-style:italic;color:var(--ink-mute);">"一条用户消息看起来只是终端里的一行字——它真正做的事情，是在六个 npm 包里穿过 26 道工序，在 JSONL 会话树上留下一个可 fork 的节点，然后被 TUI 用 CSI 2026 差分渲染成你看到的 token 流。"</p>
    <p class="lang-en-only" style="margin-top:24px;font-style:italic;color:var(--ink-mute);">"A user message looks like one line in the terminal. What it really does: pass through 26 stations across six npm packages, leave a forkable node on the JSONL session tree, then get differential-rendered into the token stream you see via CSI 2026."</p>
    <p style="margin-top:28px;">© 2026 <a href="https://ursb.me">Airing</a> · <span class="lang-zh-only">本文为 Field Note 长文,欢迎转载注明出处</span><span class="lang-en-only">long-form Field Note, attribution appreciated</span></p>
  </footer>"""


def interactive_footer() -> str:
    text = TEMPLATE.read_text(encoding="utf-8")
    start = text.index('<section class="ursb-interactive">')
    end = text.index("</html>")
    chunk = text[start:end]
    chunk = chunk.replace("note/llm-inference-life", "note/pi-agent")
    chunk = chunk.replace("llm-lang", "pi-agent-lang")
    return chunk


def scripts() -> str:
    cp_rows = []
    for num, phase, title, artifact, goal in TEXTBOOK_CHECKPOINTS:
        cp_rows.append(f"      <tr><td>{num}</td><td>{phase}</td><td>{title}</td><td><code>{artifact}</code></td><td>{goal}</td></tr>")
    return """
<script>
(function() {
  var zh = document.getElementById('lang-zh');
  var en = document.getElementById('lang-en');
  function setLang(lang) {
    if (lang === 'en') {
      document.body.classList.add('lang-en');
      document.documentElement.lang = 'en';
      en.classList.add('active'); en.setAttribute('aria-pressed', 'true');
      zh.classList.remove('active'); zh.setAttribute('aria-pressed', 'false');
    } else {
      document.body.classList.remove('lang-en');
      document.documentElement.lang = 'zh-CN';
      zh.classList.add('active'); zh.setAttribute('aria-pressed', 'true');
      en.classList.remove('active'); en.setAttribute('aria-pressed', 'false');
    }
    try { localStorage.setItem('pi-agent-lang', lang); } catch (e) {}
  }
  zh.addEventListener('click', function() { setLang('zh'); });
  en.addEventListener('click', function() { setLang('en'); });
  try {
    var saved = localStorage.getItem('pi-agent-lang');
    if (saved === 'en') setLang('en');
  } catch (e) {}
})();

(function() {
  var bar = document.getElementById('readProgress');
  if (!bar) return;
  function update() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

(function() {
  var cells = document.querySelectorAll('#pbTrack .pb-cell');
  if (!cells.length) return;
  var i = -1;
  function tick() {
    cells.forEach(function(c, idx) { c.classList.toggle('lit', idx <= i); });
    i++;
    if (i >= cells.length + 3) i = -1;
    setTimeout(tick, 380);
  }
  tick();
  cells.forEach(function(c) {
    c.addEventListener('click', function() {
      var target = document.querySelector(c.dataset.jump || '');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

(function () {
  var sideItems = Array.prototype.map.call(
    document.querySelectorAll('.toc-side li[data-section]'),
    function (li) { return { node: li, el: document.getElementById(li.dataset.section) }; }
  ).filter(function (o) { return o.el; });
  if (!sideItems.length) return;
  function update() {
    var offset = window.innerHeight * 0.32;
    var activeIdx = 0;
    for (var i = 0; i < sideItems.length; i++) {
      if (sideItems[i].el.getBoundingClientRect().top - offset < 0) activeIdx = i;
    }
    var activeId = sideItems[activeIdx].el.id;
    sideItems.forEach(function (o) {
      o.node.classList.toggle('active', o.el.id === activeId);
    });
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
</script>
"""
