"""Article-level forest overview — see the trees and the forest."""
from __future__ import annotations

from _html_helpers import fig, join, p
from visuals import svg_wrap


def viz_forest_map() -> str:
    """8-phase × 26-chapter master map (React C05 style)."""
    inner = """
  <text x="360" y="22" text-anchor="middle" class="svg-label">一条用户消息 · 8 PHASES · 26 CHAPTERS</text>

  <!-- phase columns -->
  <rect x="16" y="36" width="88" height="200" rx="3" class="svg-box muted"/>
  <text x="60" y="54" text-anchor="middle" class="svg-micro" font-weight="700">0 引子</text>
  <text x="60" y="72" text-anchor="middle" class="svg-tiny">C01–02</text>
  <text x="60" y="100" text-anchor="middle" class="svg-body">心智</text>
  <text x="60" y="118" text-anchor="middle" class="svg-body">22 站图</text>

  <rect x="108" y="36" width="72" height="200" rx="3" class="svg-box paper"/>
  <text x="144" y="54" text-anchor="middle" class="svg-micro" font-weight="700">· 背景</text>
  <text x="144" y="72" text-anchor="middle" class="svg-tiny">C03–05</text>

  <rect x="184" y="36" width="72" height="200" rx="3" class="svg-box accent"/>
  <text x="220" y="54" text-anchor="middle" class="svg-micro" font-weight="700">I 入口</text>
  <text x="220" y="72" text-anchor="middle" class="svg-tiny">C06–08</text>
  <text x="220" y="100" text-anchor="middle" class="svg-body">dsh web</text>
  <text x="220" y="118" text-anchor="middle" class="svg-body">ctx.*</text>

  <rect x="260" y="36" width="88" height="200" rx="3" fill="#fde8e4" stroke="#c3573a" stroke-width="1.5"/>
  <text x="304" y="54" text-anchor="middle" class="svg-micro" font-weight="700" fill="#c3573a">II 心脏</text>
  <text x="304" y="72" text-anchor="middle" class="svg-tiny">C09–13</text>
  <text x="304" y="100" text-anchor="middle" class="svg-body">turn/step</text>
  <text x="304" y="118" text-anchor="middle" class="svg-body">tools</text>
  <text x="304" y="136" text-anchor="middle" class="svg-body">events</text>

  <rect x="352" y="36" width="72" height="200" rx="3" class="svg-box gpu"/>
  <text x="388" y="54" text-anchor="middle" class="svg-micro" font-weight="700">III LLM</text>
  <text x="388" y="72" text-anchor="middle" class="svg-tiny">C14–16</text>

  <rect x="428" y="36" width="72" height="200" rx="3" class="svg-box asm"/>
  <text x="464" y="54" text-anchor="middle" class="svg-micro" font-weight="700">IV Web</text>
  <text x="464" y="72" text-anchor="middle" class="svg-tiny">C17–18</text>

  <rect x="504" y="36" width="72" height="200" rx="3" class="svg-box copper"/>
  <text x="540" y="54" text-anchor="middle" class="svg-micro" font-weight="700">V 扩展</text>
  <text x="540" y="72" text-anchor="middle" class="svg-tiny">C19–21</text>

  <rect x="580" y="36" width="60" height="200" rx="3" class="svg-box muted"/>
  <text x="610" y="54" text-anchor="middle" class="svg-micro" font-weight="700">VI</text>
  <text x="610" y="72" text-anchor="middle" class="svg-tiny">C22–23</text>

  <rect x="644" y="36" width="60" height="200" rx="3" class="svg-box paper"/>
  <text x="674" y="54" text-anchor="middle" class="svg-micro" font-weight="700">VII</text>
  <text x="674" y="72" text-anchor="middle" class="svg-tiny">C24–25</text>

  <!-- through-line arrow -->
  <path d="M40 250 L680 250" stroke="#1f5c8c" stroke-width="2" marker-end="url(#pi-arr)"/>
  <text x="360" y="272" text-anchor="middle" class="svg-mute">Enter → turn/start → read → tool/result → deriveMessages → session log</text>

  <!-- highlight heart -->
  <rect x="268" y="148" width="72" height="28" rx="2" fill="none" stroke="#c3573a" stroke-width="2" stroke-dasharray="4 2"/>
  <text x="304" y="166" text-anchor="middle" class="svg-micro" fill="#c3573a">主线最密区</text>
"""
    return fig(
        "森林图：8 个 Phase 把 26 章串成一条线；Phase II（心脏）是 ReactLoopAgent 与工具执行最密集的区域。",
        "Forest map: 8 phases string 26 chapters; Phase II (Heart) is the densest ReactLoopAgent + tool region.",
        f'<div class="pi-fig wide panorama">{svg_wrap(inner, "0 0 720 290")}</div>',
    )


def reading_paths() -> str:
    return """    <div class="forest-paths">
      <div class="fp-head">
        <span class="lang-zh-only">三条阅读路径</span>
        <span class="lang-en-only">Three reading paths</span>
      </div>
      <div class="fp-grid">
        <a href="#c2" class="fp-card">
          <div class="fp-tag lang-zh-only">路径 A · 先看森林</div>
          <div class="fp-tag lang-en-only">Path A · Forest first</div>
          <div class="fp-title lang-zh-only">C02 22 站全景 → 按需跳章</div>
          <div class="fp-title lang-en-only">C02 22-station map → jump as needed</div>
          <div class="fp-desc lang-zh-only">适合已懂 agent 基础、想先建立全局心智模型的读者。</div>
          <div class="fp-desc lang-en-only">For readers who know agent basics and want the global map first.</div>
        </a>
        <a href="#c7" class="fp-card fp-highlight">
          <div class="fp-tag lang-zh-only">路径 B · 直奔心脏</div>
          <div class="fp-tag lang-en-only">Path B · Straight to heart</div>
          <div class="fp-title lang-zh-only">C07 ctx.agents → C10 ReactLoopAgent → C14 ctx.llm</div>
          <div class="fp-title lang-en-only">C07 ctx.agents → C10 ReactLoopAgent → C14 ctx.llm</div>
          <div class="fp-desc lang-zh-only">最短源码路径：从 send() 追到 llm/stream。</div>
          <div class="fp-desc lang-en-only">Shortest source path: send() to llm/stream.</div>
        </a>
        <a href="#c26" class="fp-card">
          <div class="fp-tag lang-zh-only">路径 C · 动手 trace</div>
          <div class="fp-tag lang-en-only">Path C · Hands-on trace</div>
          <div class="fp-title lang-zh-only">dsh web → session/event → --dump-config</div>
          <div class="fp-title lang-en-only">dsh web → session/event → --dump-config</div>
          <div class="fp-desc lang-zh-only">边跑 DSH 边对照本文章节，最后读 C26 自查清单。</div>
          <div class="fp-desc lang-en-only">Run DSH alongside chapters; finish with C26 checklist.</div>
        </a>
      </div>
    </div>"""


def forest_overview_section() -> str:
    """Standalone overview block inserted after TOC, before C01."""
    return f"""  <section class="forest-overview" id="forest-overview">
    <div class="fo-label">
      <span class="lang-zh-only">OVERVIEW · 森林图</span>
      <span class="lang-en-only">OVERVIEW · Forest map</span>
    </div>
    <h2 class="fo-title lang-zh-only">先见森林，再见树木</h2>
    <h2 class="fo-title lang-en-only">See the forest before the trees</h2>
{p(
    "全文 26 章不是平铺的百科条目，而是一条<strong>固定主线 prompt</strong>从 Web UI 回车追到 SessionEvent 落盘的流水线。下面这张图是望远镜：告诉你 Phase 在哪、章节密度在哪、心脏区（ReactLoopAgent + tools）在哪。",
    "All 26 chapters are not a flat encyclopedia — they are a pipeline tracing one <strong>fixed through-line prompt</strong> from Enter to SessionEvent on disk. The diagram below is the telescope: where phases sit, where chapter density peaks, where the heart (ReactLoopAgent + tools) lives.",
)}
{viz_forest_map()}
{reading_paths()}
    <div class="fo-legend">
      <span class="lang-zh-only"><strong>标题层级约定：</strong>每章仅一个 <code>h2</code> 章标题；正文小节为 <code>C07.1</code> 式编号；「深度细读」块内为 <code>C07.4+</code>，FAQ / Case Study 不再占用标题层级。</span>
      <span class="lang-en-only"><strong>Heading convention:</strong> one <code>h2</code> chapter title; body sections numbered <code>C07.1</code>; deep-dive block uses <code>C07.4+</code>; FAQ / Case Study use labels, not headings.</span>
    </div>
  </section>"""
