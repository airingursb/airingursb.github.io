"""HTML shell assembly for DeepSeek Harness immersive article."""
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
from doc_map import DOC_REFERENCES

from compass import chapter_compass

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
  .pi-fig.panorama svg { min-width: 100%; }
  .station-track {
    margin: 20px 0 28px;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--paper);
    overflow: hidden;
  }
  .station-track .st-rail {
    display: grid;
    grid-template-columns: repeat(11, minmax(72px, 1fr));
    gap: 0;
    overflow-x: auto;
    padding: 0;
    scrollbar-width: thin;
  }
  @media (max-width: 900px) {
    .station-track .st-rail { grid-template-columns: repeat(11, 88px); }
  }
  .station-track .st-cell {
    border-right: 1px solid var(--rule-soft);
    border-bottom: 1px solid var(--rule-soft);
    padding: 12px 8px 10px;
    text-align: center;
    background: linear-gradient(180deg, var(--paper) 0%, color-mix(in srgb, var(--st-color) 6%, var(--paper)) 100%);
    min-height: 88px;
  }
  .station-track .st-cell:nth-child(n+12) { border-bottom: none; }
  .station-track .st-num {
    font-family: var(--mono); font-size: 18px; font-weight: 700;
    color: var(--st-color); line-height: 1;
  }
  .station-track .st-name {
    font-family: var(--sans); font-size: 11px; font-weight: 600;
    color: var(--ink); margin-top: 6px; line-height: 1.25;
  }
  .station-track .st-phase {
    font-family: var(--mono); font-size: 8px; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--ink-mute); margin-top: 4px;
  }
  .stage-why-care {
    background: linear-gradient(180deg, #fdfbf3, #faf6ed);
    border: 1px solid var(--rule); border-top: 3px solid var(--accent);
    border-radius: 4px; padding: 18px 22px 16px; margin: 18px 0 22px;
  }
  .stage-why-care .swc-label {
    font-family: var(--mono); font-size: 9px; color: var(--accent);
    letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px;
  }
  .stage-why-care p {
    font-family: var(--serif); font-size: 14px; color: var(--ink-soft);
    line-height: 1.65; margin: 6px 0; display: flex; align-items: baseline; gap: 10px;
  }
  body.lang-en .stage-why-care p { font-family: var(--serif-en); }
  .stage-why-care .swc-pill {
    flex: 0 0 auto; font-family: var(--mono); font-size: 8px; font-weight: 700;
    letter-spacing: 0.1em; text-transform: uppercase; color: #fff;
    background: var(--ink-mute); padding: 2px 7px; border-radius: 2px;
  }
  .stage-why-care .swc-pill.rev { background: var(--accent); }
  .stage-why-care .swc-pill.act { background: var(--copper); }
  .stage-why-care em { color: var(--ink); font-style: normal; font-weight: 600; }
  .stage-banner {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;
    background: var(--paper); border: 1px solid var(--rule);
    border-radius: 4px; overflow: hidden; margin: 28px 0 36px;
  }
  .stage-banner .sb-cell {
    padding: 14px 18px; border-right: 1px solid var(--rule-soft);
  }
  .stage-banner .sb-cell:last-child { border-right: none; }
  .stage-banner .sb-key {
    font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--ink-mute); margin-bottom: 4px;
  }
  .stage-banner .sb-val {
    font-family: var(--sans); font-size: 13.5px; font-weight: 600; color: var(--ink);
  }
  .trace-box {
    margin: 24px 0; padding: 16px 20px;
    background: var(--paper-2); border: 1px dashed var(--accent);
    border-radius: 4px;
  }
  .trace-box .tb-tag {
    font-family: var(--mono); font-size: 9px; letter-spacing: 0.16em;
    color: var(--accent); font-weight: 700; margin-bottom: 8px;
  }
  @media (max-width: 760px) {
    .stage-banner { grid-template-columns: 1fr 1fr; }
    .stage-why-care p { flex-direction: column; gap: 4px; }
  }
  .event-flow {
    border: 1px solid var(--rule); border-radius: 4px;
    background: var(--paper-2); padding: 4px 0;
  }
  .event-flow .ef-row {
    display: grid; grid-template-columns: 140px 1fr; gap: 16px;
    padding: 10px 18px; border-bottom: 1px dashed var(--rule-soft);
    align-items: baseline;
  }
  .event-flow .ef-row:last-child { border-bottom: none; }
  .event-flow .ef-type {
    font-family: var(--mono); font-size: 11px; font-weight: 600;
    color: var(--accent); background: var(--accent-pale, #e8f0f8);
    padding: 3px 8px; border-radius: 3px; display: inline-block;
  }
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
  .case-study .cs-title {
    font-family: var(--serif); font-size: 15px; font-weight: 700;
    margin-bottom: 8px; color: var(--ink);
  }
  body.lang-en .case-study .cs-title { font-family: var(--serif-en); }
  .sec-num {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
    color: var(--accent); font-weight: 700; margin-right: 6px;
  }
  .chap-compass {
    margin: 0 0 28px; padding: 14px 18px;
    background: var(--paper-2); border: 1px solid var(--rule);
    border-left: 3px solid var(--accent); border-radius: 0 4px 4px 0;
  }
  .chap-compass .cc-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
  .chap-compass .cc-row + .cc-row { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--rule-soft); }
  .chap-compass .cc-phase, .chap-compass .cc-chap, .chap-compass .cc-station {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .chap-compass .cc-chap { color: var(--accent); font-weight: 700; }
  .chap-compass .cc-sep { color: var(--ink-mute); }
  .chap-compass .cc-forest-label {
    font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--ink-mute); margin-right: 8px;
  }
  .chap-compass .cc-forest-text { font-size: 13px; color: var(--ink-soft); }
  .chap-compass .cc-links { justify-content: space-between; width: 100%; }
  .chap-compass .cc-nav {
    font-size: 12px; color: var(--ink-soft); text-decoration: none;
    display: inline-flex; align-items: center; gap: 4px; max-width: 42%;
  }
  .chap-compass .cc-nav:hover { color: var(--accent); }
  .chap-compass .cc-nav-num { font-family: var(--mono); font-weight: 700; }
  .chap-compass .cc-back-map {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--copper); text-decoration: none;
  }
  .chap-compass .cc-back-map:hover { text-decoration: underline; }
  .depth-zone {
    margin: 32px 0 0; padding: 20px 0 0;
    border-top: 2px solid var(--rule);
  }
  .depth-zone-label {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em;
    text-transform: uppercase; color: var(--ink-mute); margin-bottom: 20px;
  }
  .depth-zone-label .dz-tag {
    color: var(--copper); font-weight: 700; margin-right: 8px;
  }
  .depth-zone h4.depth-sec {
    font-size: 15px; margin-top: 24px;
  }
  .depth-aside-head {
    margin: 28px 0 12px; padding: 10px 14px;
    background: var(--paper-2); border: 1px solid var(--rule); border-radius: 4px;
  }
  .depth-aside-head .da-tag {
    font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--copper); font-weight: 700;
  }
  .depth-aside-head .da-title { font-size: 14px; font-weight: 600; color: var(--ink); }
  .forest-overview {
    margin: 48px 0 56px; padding: 32px 0 40px;
    border-top: 2px solid var(--ink); border-bottom: 1px solid var(--rule);
  }
  .forest-overview .fo-label {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.22em;
    text-transform: uppercase; color: var(--ink-mute); margin-bottom: 12px;
  }
  .forest-overview .fo-title {
    font-family: var(--serif); font-size: 28px; font-weight: 700;
    margin-bottom: 16px; line-height: 1.2;
  }
  body.lang-en .forest-overview .fo-title { font-family: var(--serif-en); }
  .forest-paths { margin: 28px 0; }
  .forest-paths .fp-head {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--ink-mute); margin-bottom: 14px;
  }
  .forest-paths .fp-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
  }
  @media (max-width: 800px) {
    .forest-paths .fp-grid { grid-template-columns: 1fr; }
  }
  .forest-paths .fp-card {
    display: block; padding: 16px 18px;
    background: var(--paper); border: 1px solid var(--rule);
    border-radius: 4px; text-decoration: none; color: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .forest-paths .fp-card:hover {
    border-color: var(--accent); box-shadow: 0 2px 8px rgba(31,92,140,0.08);
  }
  .forest-paths .fp-card.fp-highlight { border-left: 3px solid var(--accent); }
  .forest-paths .fp-tag {
    font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--copper); margin-bottom: 6px;
  }
  .forest-paths .fp-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
  .forest-paths .fp-desc { font-size: 12px; color: var(--ink-mute); line-height: 1.5; }
  .forest-overview .fo-legend {
    margin-top: 24px; padding: 14px 16px;
    background: var(--paper-2); border-radius: 4px;
    font-size: 12.5px; color: var(--ink-soft); line-height: 1.6;
  }
  .card-filmstrip {
    position: fixed; top: 0; left: 0; right: 0; z-index: 150;
    background: rgba(253,251,243,0.96); border-bottom: 1px solid var(--rule);
    backdrop-filter: blur(8px); transform: translateY(-100%);
    transition: transform 0.25s ease; pointer-events: none;
  }
  .card-filmstrip.is-visible { transform: translateY(0); pointer-events: auto; }
  .card-filmstrip .cf-inner { max-width: var(--max-w, 720px); margin: 0 auto; padding: 6px 16px 8px; }
  .card-filmstrip .cf-header {
    display: flex; justify-content: space-between; align-items: center;
    font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--ink-mute); margin-bottom: 4px;
  }
  .card-filmstrip .cf-header em { color: var(--accent); font-style: normal; font-weight: 700; }
  .card-filmstrip .cf-track {
    display: flex; gap: 4px; overflow-x: auto; padding-bottom: 2px;
    scrollbar-width: thin;
  }
  .card-filmstrip .cf-cell {
    flex: 0 0 auto; min-width: 36px; padding: 4px 6px;
    text-align: center; text-decoration: none; color: var(--ink-mute);
    border: 1px solid transparent; border-radius: 3px;
    font-family: var(--mono); font-size: 10px; transition: all 0.12s;
  }
  .card-filmstrip .cf-cell:hover { border-color: var(--rule); color: var(--ink); }
  .card-filmstrip .cf-cell.active {
    border-color: var(--accent); background: var(--accent-pale, #e8f0f8);
    color: var(--accent); font-weight: 700;
  }
  body.has-filmstrip { padding-top: 52px; }
  body.has-filmstrip .ursb-backlink { top: 58px; }
  .trace-walk {
    margin: 36px 0; padding: 22px 24px 8px;
    border: 2px solid var(--accent); border-radius: 4px;
    background: linear-gradient(135deg, rgba(31,92,140,0.03) 0%, var(--paper) 50%);
  }
  .trace-walk .tw-head {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
    text-transform: uppercase; margin-bottom: 18px; line-height: 1.6;
  }
  .trace-walk .tw-tag {
    display: block; color: var(--accent); font-weight: 700;
    margin-bottom: 6px; letter-spacing: 0.18em;
  }
  .trace-walk .src-stack { margin: 16px 0 20px; }
  .trace-walk .src-ln {
    display: inline-block; width: 44px; text-align: right;
    color: var(--ink-mute); user-select: none; margin-right: 8px;
  }
  .trace-walk .src-hl { font-family: var(--mono); font-size: 12px; }
  .trace-steps { margin: 24px 0; }
  .trace-steps .ts-label {
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--copper); margin-bottom: 10px;
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
        "你在 Web UI 敲下「读取 README.md，用一句话告诉我这个项目做什么」之后，"
        "这串文字穿过 26 道工序、跨 Cordis 插件树与 core spine，在 SessionEvent 日志里变形——"
        "对照 deepseek-ai/deepseek-harness 生产源码与官方 docs 逐行读。"
    )
    desc_en = (
        "After you type read README.md and tell me what this project does in one sentence, "
        "that string passes through 26 stations across the Cordis plugin tree and core spine — "
        "cross-reading deepseek-ai/deepseek-harness production source with official docs."
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
<meta property="og:title" content="{TITLE_ZH} — DSH 源码全景">
<meta property="og:description" content="Cordis → ReactLoopAgent → turn/step → ctx.llm → tools → SessionEvent log · 真源码逐行。">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:url" content="https://ursb.me/immersive/{SLUG}/">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ursb.me · Airing">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{TITLE_ZH}">
<meta name="twitter:description" content="{desc_en}">
<meta name="twitter:image" content="{OG_IMAGE}">
<meta name="twitter:creator" content="@airingursb">
<title>{TITLE_ZH} — DSH 源码全景</title>
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
<a class="ursb-backlink" href="https://ursb.me/notes/dsh/">← ursb.me</a>
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
      <span class="lang-zh-only">DeepSeek Harness · Cordis 插件</span>
      <span class="lang-en-only">DeepSeek Harness · Cordis plugins</span>
      <span>{DATE[:4]}</span>
    </div>
    <h1 class="lang-zh-only">一条用户消息在<br><span class="copper">DeepSeek Harness</span>里的<span class="accent">一生</span>。</h1>
    <h1 class="lang-en-only">The <span class="copper">life</span> of one user message<br>inside <span class="accent">DeepSeek Harness</span>.</h1>
    <p class="subtitle lang-zh-only">{SUBTITLE_ZH.replace(" · ", ' <span class="arr">→</span> ')}</p>
    <p class="subtitle lang-en-only">{SUBTITLE_EN.replace(" · ", ' <span class="arr">→</span> ')}</p>
    <p class="deck lang-zh-only">{DECK_ZH}</p>
    <p class="deck lang-en-only">{DECK_EN}</p>
    <div class="byline">
      <span><span class="label">AUTHOR</span><a class="value" href="https://ursb.me" target="_blank" rel="noopener">Airing</a></span>
      <span><span class="label">SOURCE</span><span class="value">deepseek-ai/deepseek-harness · docs/</span></span>
      <span><span class="label">FORMAT</span><span class="value">Long Read</span></span>
    </div>

    <aside class="hero-notice">
      <div class="hn-tag">
        <span class="lang-zh-only">这篇要解决什么</span>
        <span class="lang-en-only">What this is for</span>
      </div>
      <p class="hn-body lang-zh-only">主线 prompt 固定为：<strong>「读取 README.md，用一句话告诉我这个项目做什么」</strong>——与 Pi 沉浸式文章相同，便于对照。这不是 DSH 的使用教程，而是<strong>把一条用户消息从 Web UI 回车追到 SessionEvent 落盘</strong>的源码级 walkthrough。对照生产仓库 <code>deepseek-ai/deepseek-harness</code> 与 <code>docs/architecture.md</code> 等官方文档，每一章对应一层 Cordis 抽象。</p>
      <p class="hn-body lang-en-only">The through-line prompt is fixed: <strong>«read README.md and tell me what this project does in one sentence»</strong> — same as the Pi immersive article for comparison. This is not a DSH user guide but a <strong>source-level walkthrough from Enter to SessionEvent on disk</strong>. Cross-reading production <code>deepseek-ai/deepseek-harness</code> with official docs like <code>docs/architecture.md</code> — each chapter maps to one Cordis abstraction layer.</p>
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
        <span class="lang-zh-only">已经懂 agent 基础? 直接跳到 → <a href="#c7">ctx.agents</a> · <a href="#c10">ReactLoopAgent</a> · <a href="#c14">ctx.llm</a> · <a href="#c17">Web UI</a> · <a href="#c22">SessionEvent</a> · <a href="#c24">vs Pi</a></span>
        <span class="lang-en-only">Know agent basics? Skip to → <a href="#c7">ctx.agents</a> · <a href="#c10">ReactLoopAgent</a> · <a href="#c14">ctx.llm</a> · <a href="#c17">Web UI</a> · <a href="#c22">SessionEvent</a> · <a href="#c24">vs Pi</a></span>
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


def filmstrip_nav() -> str:
    cells = []
    for ch in CHAPTERS:
        cid, num = ch[0], ch[1]
        cells.append(
            f'      <a href="#{cid}" class="cf-cell" data-chap="{num}">'
            f'<span class="cf-num">{num}</span></a>'
        )
    cells_html = "\n".join(cells)
    return f"""<nav class="card-filmstrip" id="card-filmstrip" aria-label="26 chapters">
  <div class="cf-inner">
    <div class="cf-header">
      <span><span class="lang-zh-only">主线 · 26 章</span><span class="lang-en-only">Through-line · 26 chapters</span></span>
      <span><em id="cf-current">C01</em>&nbsp;/&nbsp;26</span>
    </div>
    <div class="cf-track" id="cf-track">
{cells_html}
    </div>
  </div>
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
{chapter_compass(cid)}
{body}
  </section>"""


def footer() -> str:
    return f"""  <footer class="footer">
    <div class="ft-rule"><span class="ft-mark">END · FIELD NOTE {FIELD_NOTE}</span></div>
    <p class="lang-zh-only">这是 Field Note 系列的第十一篇。<strong>姐妹篇</strong>:</p>
    <p class="lang-en-only">Eleventh in the Field Note series. <strong>Sister pieces</strong>:</p>
    <div class="ft-links">
      <a href="https://ursb.me/immersive/pi-agent/">Pi Agent · 26 站</a>
      <a href="https://ursb.me/immersive/llm-inference-life/">LLM 推理 · 28 站</a>
      <a href="https://ursb.me/immersive/chromium-renderer/">Chromium · 渲染管线</a>
    </div>
    <p class="lang-zh-only" style="margin-top:24px;font-style:italic;color:var(--ink-mute);">"一条用户消息看起来只是聊天框里的一行字——它真正做的事情，是在 Cordis 插件树里穿过 turn/step 边界，在 SessionEvent 日志上留下可 fork 的 seq 链，然后被 Web UI 从 session/event 流式渲染成你看到的 chunk。"</p>
    <p class="lang-en-only" style="margin-top:24px;font-style:italic;color:var(--ink-mute);">"A user message looks like one line in the chat box. What it really does: cross turn/step boundaries in the Cordis plugin tree, leave a forkable seq chain on the SessionEvent log, then get streamed into chunks you see via session/event in the Web UI."</p>
    <p style="margin-top:28px;">© 2026 <a href="https://ursb.me">Airing</a> · <span class="lang-zh-only">本文为 Field Note 长文,欢迎转载注明出处</span><span class="lang-en-only">long-form Field Note, attribution appreciated</span></p>
  </footer>"""


def interactive_footer() -> str:
    text = TEMPLATE.read_text(encoding="utf-8")
    start = text.index('<section class="ursb-interactive">')
    end = text.index("</html>")
    chunk = text[start:end]
    chunk = chunk.replace("note/llm-inference-life", "note/dsh")
    chunk = chunk.replace("llm-lang", "dsh-lang")
    return chunk


def scripts() -> str:
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
    try { localStorage.setItem('dsh-lang', lang); } catch (e) {}
  }
  zh.addEventListener('click', function() { setLang('zh'); });
  en.addEventListener('click', function() { setLang('en'); });
  try {
    var saved = localStorage.getItem('dsh-lang');
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

(function() {
  var filmstrip = document.getElementById('card-filmstrip');
  var cfTrack = document.getElementById('cf-track');
  var cfCurrent = document.getElementById('cf-current');
  if (!filmstrip || !cfTrack) return;
  document.body.classList.add('has-filmstrip');
  var cells = Array.prototype.slice.call(cfTrack.querySelectorAll('.cf-cell'));
  var sections = cells.map(function(c) {
    return { cell: c, el: document.querySelector(c.getAttribute('href')) };
  }).filter(function(o) { return o.el; });

  function updateFilmstrip() {
    var offset = window.innerHeight * 0.25;
    var activeIdx = 0;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.getBoundingClientRect().top - offset < 0) activeIdx = i;
    }
    var active = sections[activeIdx];
    cells.forEach(function(c) { c.classList.remove('active'); });
    if (active) {
      active.cell.classList.add('active');
      if (cfCurrent) cfCurrent.textContent = 'C' + (active.cell.dataset.chap || '');
      active.cell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    filmstrip.classList.toggle('is-visible', window.scrollY > 400);
  }
  window.addEventListener('scroll', updateFilmstrip, { passive: true });
  updateFilmstrip();
})();
</script>
"""
