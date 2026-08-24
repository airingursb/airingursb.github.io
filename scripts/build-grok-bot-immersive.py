#!/usr/bin/env python3
"""Generate immersive grok-bot agent system article from llm-inference-life template."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "public/immersive/llm-inference-life/index.html"
OUT = ROOT / "public/immersive/grok-bot-agents/index.html"

# Reuse CSS/JS shell from template (head through body open, footer scripts)
template = TEMPLATE.read_text(encoding="utf-8")

# Split at container start and footer
start_marker = '<div class="container">'
footer_marker = '<section class="ursb-interactive">'
start_idx = template.index(start_marker)
footer_idx = template.index(footer_marker)

head = template[:start_idx]
footer = template[footer_idx:]

# Patch meta in head
head = head.replace(
    "一次 LLM 推理的一生 — 一个 prompt 在 llama.cpp 里走过的 28 个站",
    "一条消息的一生 — Grok Bot Agent 系统与多 Agent 协作全景",
)
head = head.replace(
    'content="你敲下 prompt 按回车之后这 5 个 token 在 llama.cpp 里要走过 28 个站',
    'content="你按下回车之后，一条用户消息如何在 Grok Bot 0.18 里穿过四层进程、spawn 子 Agent、持久化 blob 状态、并在多 Agent 协作中回到屏幕',
)
head = head.replace("llm-inference-life", "grok-bot-agents")
head = head.replace("LLM 推理工程", "Agent 系统工程")
head = head.replace("LLM Inference", "Agent Systems")
head = head.replace("og/llm-inference-life.png", "og/grok-bot-agents.png")

# Side TOC
side_toc = '''
<nav class="toc-side" aria-label="Table of contents">
  <div class="toc-label lang-zh-only">目录</div>
  <div class="toc-label lang-en-only">Contents</div>
  <ol>
    <li class="ts-divider"><span class="lang-zh-only">I · 骨骼</span><span class="lang-en-only">I · Skeleton</span></li>
    <li data-section="c1"><a href="#c1"><span class="toc-num">01</span><span class="lang-zh-only">两个公式</span><span class="lang-en-only">Two formulas</span></a></li>
    <li data-section="c2"><a href="#c2"><span class="toc-num">02</span><span class="lang-zh-only">四层进程</span><span class="lang-en-only">Four layers</span></a></li>
    <li data-section="c3"><a href="#c3"><span class="toc-num">03</span><span class="lang-zh-only">Agent 数据模型</span><span class="lang-en-only">Agent data model</span></a></li>
    <li class="ts-divider"><span class="lang-zh-only">II · 单 Agent 回合</span><span class="lang-en-only">II · Single-agent turn</span></li>
    <li data-section="c4"><a href="#c4"><span class="toc-num">04</span><span class="lang-zh-only">Turn 执行链</span><span class="lang-en-only">Turn execution</span></a></li>
    <li data-section="c5"><a href="#c5"><span class="toc-num">05</span><span class="lang-zh-only">AnysphereAgent</span><span class="lang-en-only">AnysphereAgent</span></a></li>
    <li data-section="c6"><a href="#c6"><span class="toc-num">06</span><span class="lang-zh-only">工具与 MCP</span><span class="lang-en-only">Tools & MCP</span></a></li>
    <li class="ts-divider"><span class="lang-zh-only">III · 多 Agent</span><span class="lang-en-only">III · Multi-agent</span></li>
    <li data-section="c7"><a href="#c7"><span class="toc-num">07</span><span class="lang-zh-only">Task 子 Agent</span><span class="lang-en-only">Task subagents</span></a></li>
    <li data-section="c8"><a href="#c8"><span class="toc-num">08</span><span class="lang-zh-only">子 Agent 类型谱</span><span class="lang-en-only">Subagent catalog</span></a></li>
    <li data-section="c9"><a href="#c9"><span class="toc-num">09</span><span class="lang-zh-only">Multitask Executor</span><span class="lang-en-only">Multitask executor</span></a></li>
    <li data-section="c10"><a href="#c10"><span class="toc-num">10</span><span class="lang-zh-only">后台与唤醒</span><span class="lang-en-only">Background & wake</span></a></li>
    <li data-section="c11"><a href="#c11"><span class="toc-num">11</span><span class="lang-zh-only">Cloud Agent</span><span class="lang-en-only">Cloud agents</span></a></li>
    <li data-section="c12"><a href="#c12"><span class="toc-num">12</span><span class="lang-zh-only">Group Room</span><span class="lang-en-only">Group rooms</span></a></li>
    <li class="ts-divider"><span class="lang-zh-only">IV · 记忆与同步</span><span class="lang-en-only">IV · Memory & sync</span></li>
    <li data-section="c13"><a href="#c13"><span class="toc-num">13</span><span class="lang-zh-only">Summarization</span><span class="lang-en-only">Summarization</span></a></li>
    <li data-section="c14"><a href="#c14"><span class="toc-num">14</span><span class="lang-zh-only">Agent Store Sync</span><span class="lang-en-only">Store sync</span></a></li>
    <li class="ts-divider"><span class="lang-zh-only">V · 全景</span><span class="lang-en-only">V · Panorama</span></li>
    <li data-section="c15"><a href="#c15"><span class="toc-num">15</span><span class="lang-zh-only">Inference Router</span><span class="lang-en-only">Inference router</span></a></li>
    <li data-section="c16"><a href="#c16"><span class="toc-num">16</span><span class="lang-zh-only">一条消息的 16 站</span><span class="lang-en-only">16 stations</span></a></li>
  </ol>
</nav>
'''

toc_start = template.index('<nav class="toc-side"')
toc_end = template.index('</nav>', toc_start) + len('</nav>')
head = head[:toc_start] + side_toc + head[toc_end:]

# Patch footer POST_SLUG
footer = footer.replace("note/llm-inference-life", "note/grok-bot-agents")

BODY = r'''
<div class="container">

  <header class="hero">
    <div class="meta">
      <span>FIELD&nbsp;NOTE&nbsp;/&nbsp;15</span>
      <span class="lang-zh-only">Agent 系统工程</span>
      <span class="lang-en-only">Agent Systems</span>
      <span>2026</span>
    </div>
    <h1 class="lang-zh-only">一条<span class="copper">消息</span>的<span class="accent">一生</span> —<br>Grok Bot <span class="gpu">Agent</span> 全景。</h1>
    <h1 class="lang-en-only">The <span class="copper">life</span> of one <span class="accent">message</span> —<br>Grok Bot <span class="gpu">agents</span> unpacked.</h1>
    <p class="subtitle lang-zh-only">renderer <span class="arr">→</span> coordinator <span class="arr">→</span> host <span class="arr">→</span> box-exec <span class="arr">→</span> Task subagent <span class="arr">→</span> blob checkpoint</p>
    <p class="subtitle lang-en-only">renderer <span class="arr">→</span> coordinator <span class="arr">→</span> host <span class="arr">→</span> box-exec <span class="arr">→</span> Task subagent <span class="arr">→</span> blob checkpoint</p>
    <p class="deck lang-zh-only">基于 <a href="https://github.com/b-nnett/grok-bot-0.18-reconstructed" style="color:var(--accent);border-bottom:1px solid var(--rule)">grok-bot-0.18-reconstructed</a> 源码，拆解 Grok Bot（Sand）桌面 Agent 的进程边界、状态机、子 Agent 协作与记忆压缩——16 章，每章对应真实 TypeScript / Protobuf 路径。</p>
    <p class="deck lang-en-only">From the <a href="https://github.com/b-nnett/grok-bot-0.18-reconstructed" style="color:var(--accent);border-bottom:1px solid var(--rule)">grok-bot-0.18-reconstructed</a> sources: process boundaries, state machines, subagent collaboration, and memory compaction in Grok Bot (Sand) — 16 chapters, each tied to real TypeScript / Protobuf paths.</p>
    <div class="byline">
      <span><span class="label">AUTHOR</span><a class="value" href="https://ursb.me" target="_blank" rel="noopener">Airing</a></span>
      <span><span class="label">SOURCE</span><span class="value">Grok Bot 0.18 · reconstructed</span></span>
      <span><span class="label">FORMAT</span><span class="value">Long Read</span></span>
    </div>

    <aside class="hero-notice">
      <div class="hn-tag"><span class="lang-zh-only">阅读前提</span><span class="lang-en-only">Before you read</span></div>
      <p class="hn-body lang-zh-only">这不是「怎么用 Grok Bot」的使用手册。仓库是社区对 <strong>0.18.0 macOS 发行版</strong>的逆向重建（非官方 monorepo），但 <code>source/</code> 下的 TypeScript 足够读懂 Agent 架构。本文聚焦 <em>Agent 运行时</em>与 <em>多 Agent 协作</em>，UI 仍沿用 shipped renderer，大脑在 <code>host/</code> + <code>packages/agent*</code>。</p>
      <p class="hn-body lang-en-only">This is not a "how to use Grok Bot" manual. The repo is a community reconstruction of the <strong>0.18.0 macOS release</strong> (not the official monorepo), but <code>source/</code> TypeScript is enough to read the agent architecture. Focus: <em>agent runtime</em> and <em>multi-agent collaboration</em>. UI stays on the shipped renderer; the brain lives in <code>host/</code> + <code>packages/agent*</code>.</p>
    </aside>

    <aside class="tldr">
      <div class="tldr-tag"><span class="lang-zh-only">主线 · 4 句话</span><span class="lang-en-only">Through-line · 4 sentences</span></div>
      <div class="tldr-steps">
        <div class="tldr-step"><div class="tldr-step-n">01</div><div class="tldr-step-name lang-zh-only">四层壳</div><div class="tldr-step-name lang-en-only">Four shells</div><div class="tldr-step-hint">main · coordinator · host · box-exec</div></div>
        <div class="tldr-step"><div class="tldr-step-n">02</div><div class="tldr-step-name lang-zh-only">Blob 状态</div><div class="tldr-step-name lang-en-only">Blob state</div><div class="tldr-step-hint">ConversationStateStructure</div></div>
        <div class="tldr-step"><div class="tldr-step-n">03</div><div class="tldr-step-name lang-zh-only">Task 分叉</div><div class="tldr-step-name lang-en-only">Task fork</div><div class="tldr-step-hint">subagent tree + lineage</div></div>
        <div class="tldr-step"><div class="tldr-step-n">04</div><div class="tldr-step-name lang-zh-only">压缩记忆</div><div class="tldr-step-name lang-en-only">Compact memory</div><div class="tldr-step-hint">SummarizationOrchestrator</div></div>
      </div>
    </aside>

    <div class="perf-bar">
      <div class="pb-title"><span class="lang-zh-only">一条用户消息 · 16 个站</span><span class="lang-en-only">One user message · 16 stations</span><span class="pb-pulse">▸ trace</span></div>
      <div class="pb-track" id="pbTrack" style="grid-template-columns:repeat(16,1fr)">
        <div class="pb-cell p1" data-n="1" title="sendPrompt"></div>
        <div class="pb-cell p1" data-n="2" title="coordinator"></div>
        <div class="pb-cell p2" data-n="3" title="gateway SSE"></div>
        <div class="pb-cell p2" data-n="4" title="turn-execution"></div>
        <div class="pb-cell p2" data-n="5" title="SandAgentRunner"></div>
        <div class="pb-cell p3" data-n="6" title="restore state"></div>
        <div class="pb-cell p3" data-n="7" title="summarize?"></div>
        <div class="pb-cell p3" data-n="8" title="prompt assembly"></div>
        <div class="pb-cell p4" data-n="9" title="tool loop"></div>
        <div class="pb-cell p4" data-n="10" title="box-exec"></div>
        <div class="pb-cell p5" data-n="11" title="Task spawn"></div>
        <div class="pb-cell p5" data-n="12" title="subagent run"></div>
        <div class="pb-cell p6" data-n="13" title="interaction delta"></div>
        <div class="pb-cell p6" data-n="14" title="checkpoint"></div>
        <div class="pb-cell p7" data-n="15" title="transcript SSE"></div>
        <div class="pb-cell pc" data-n="16" title="renderer"></div>
      </div>
      <div class="pb-axis"><span>user</span><span></span><span>host</span><span></span><span>subagent</span><span></span><span>UI</span></div>
    </div>
  </header>

  <nav class="toc-v2" aria-label="Contents">
    <div class="tv-head">
      <div class="tv-label lang-zh-only">CONTENTS · 目录</div>
      <div class="tv-label lang-en-only">CONTENTS</div>
      <div class="tv-meta"><span class="tv-now">16</span> <span class="lang-zh-only">章</span><span class="lang-en-only">chapters</span></div>
    </div>
    <div class="toc-group" data-phase="bg">
      <div class="toc-group-head"><div class="tg-num">I</div><div class="tg-name lang-zh-only">骨骼 · 数据</div><div class="tg-name lang-en-only">Skeleton · data</div><div class="tg-count">3</div></div>
      <div class="toc-chips">
        <a href="#c1" class="toc-chip"><span class="tc-num">01</span><div class="tc-name"><span class="lang-zh-only">两个公式</span><span class="tc-en">two formulas</span></div></a>
        <a href="#c2" class="toc-chip"><span class="tc-num">02</span><div class="tc-name"><span class="lang-zh-only">四层进程</span><span class="tc-en">four layers</span></div></a>
        <a href="#c3" class="toc-chip tc-special"><span class="tc-num">03</span><div class="tc-name"><span class="lang-zh-only">Agent 数据模型</span><span class="tc-en">agent data model</span></div></a>
      </div>
    </div>
    <div class="toc-group" data-phase="att">
      <div class="toc-group-head"><div class="tg-num">II</div><div class="tg-name lang-zh-only">单 Agent 回合</div><div class="tg-name lang-en-only">Single-agent turn</div><div class="tg-count">3</div></div>
      <div class="toc-chips">
        <a href="#c4" class="toc-chip"><span class="tc-num">04</span><div class="tc-name"><span class="lang-zh-only">Turn 执行链</span></div></a>
        <a href="#c5" class="toc-chip tc-special"><span class="tc-num">05</span><div class="tc-name"><span class="lang-zh-only">AnysphereAgent</span></div></a>
        <a href="#c6" class="toc-chip"><span class="tc-num">06</span><div class="tc-name"><span class="lang-zh-only">工具与 MCP</span></div></a>
      </div>
    </div>
    <div class="toc-group" data-phase="var">
      <div class="toc-group-head"><div class="tg-num">III</div><div class="tg-name lang-zh-only">多 Agent 协作</div><div class="tg-name lang-en-only">Multi-agent</div><div class="tg-count">6</div></div>
      <div class="toc-chips">
        <a href="#c7" class="toc-chip tc-special"><span class="tc-num">07</span><div class="tc-name"><span class="lang-zh-only">Task 子 Agent</span></div></a>
        <a href="#c8" class="toc-chip"><span class="tc-num">08</span><div class="tc-name"><span class="lang-zh-only">子 Agent 类型谱</span></div></a>
        <a href="#c9" class="toc-chip tc-special"><span class="tc-num">09</span><div class="tc-name"><span class="lang-zh-only">Multitask Executor</span></div></a>
        <a href="#c10" class="toc-chip"><span class="tc-num">10</span><div class="tc-name"><span class="lang-zh-only">后台与唤醒</span></div></a>
        <a href="#c11" class="toc-chip"><span class="tc-num">11</span><div class="tc-name"><span class="lang-zh-only">Cloud Agent</span></div></a>
        <a href="#c12" class="toc-chip"><span class="tc-num">12</span><div class="tc-name"><span class="lang-zh-only">Group Room</span></div></a>
      </div>
    </div>
    <div class="toc-group" data-phase="out">
      <div class="toc-group-head"><div class="tg-num">IV–V</div><div class="tg-name lang-zh-only">记忆 · 路由 · 全景</div><div class="tg-count">4</div></div>
      <div class="toc-chips">
        <a href="#c13" class="toc-chip"><span class="tc-num">13</span><div class="tc-name"><span class="lang-zh-only">Summarization</span></div></a>
        <a href="#c14" class="toc-chip"><span class="tc-num">14</span><div class="tc-name"><span class="lang-zh-only">Agent Store Sync</span></div></a>
        <a href="#c15" class="toc-chip"><span class="tc-num">15</span><div class="tc-name"><span class="lang-zh-only">Inference Router</span></div></a>
        <a href="#c16" class="toc-chip tc-special"><span class="tc-num">16</span><div class="tc-name"><span class="lang-zh-only">16 站全链路</span></div></a>
      </div>
    </div>
  </nav>

'''

# Chapter content - will be appended from separate string file for maintainability
CHAPTERS = Path(__file__).with_name("grok-bot-immersive-chapters.html")
if not CHAPTERS.exists():
    raise SystemExit(f"Missing {CHAPTERS}")

body = BODY + CHAPTERS.read_text(encoding="utf-8") + "\n</div>\n\n"

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(head + body + footer, encoding="utf-8")
print(f"Wrote {OUT} ({OUT.stat().st_size // 1024} KB)")
