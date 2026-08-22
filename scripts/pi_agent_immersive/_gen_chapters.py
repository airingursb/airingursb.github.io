#!/usr/bin/env python3
"""One-shot generator for chapters_content.py — run and delete."""
from pathlib import Path

OUT = Path(__file__).parent / "chapters_content.py"


def src_stack(tag: str, path: str, lines: list[str]) -> str:
    body = "\n".join(f'      <span class="src-line">{l}</span>' for l in lines)
    return f"""    <div class="src-stack">
      <div class="src-h">
        <span>SOURCE &nbsp;·&nbsp; {path}</span>
        <span class="src-tag">{tag}</span>
      </div>
{body}
    </div>"""


def stage_purpose(rows: list[tuple[str, str, str, str]]) -> str:
    rs = []
    for k_zh, k_en, v_zh, v_en in rows:
        rs.append(
            f"""      <div class="sp-row">
        <div class="sp-key"><span class="lang-zh-only">{k_zh}</span><span class="lang-en-only">{k_en}</span></div>
        <div class="sp-val"><span class="lang-zh-only">{v_zh}</span><span class="lang-en-only">{v_en}</span></div>
      </div>"""
        )
    return "    <div class=\"stage-purpose\">\n" + "\n".join(rs) + "\n    </div>"


def note(zh: str, en: str, copper: bool = False) -> str:
    cls = "note copper" if copper else "note"
    return f"""    <div class="{cls}">
      <span class="lang-zh-only">{zh}</span>
      <span class="lang-en-only">{en}</span>
    </div>"""


def formula(title_zh: str, title_en: str, lines: list[str], out_zh: str, out_en: str) -> str:
    conds = "\n".join(f'      <span class="cond">{l}</span>' for l in lines)
    return f"""    <div class="formula">
      <div class="ftitle"><span class="lang-zh-only">{title_zh}</span><span class="lang-en-only">{title_en}</span></div>
{conds}
      <div class="out"><span class="lang-zh-only">{out_zh}</span><span class="lang-en-only">{out_en}</span></div>
    </div>"""


def ladder(items: list[tuple[str, str]]) -> str:
    steps = []
    for i, (zh, en) in enumerate(items, 1):
        steps.append(
            f"""      <div class="ladder-step">
        <div class="ladder-num">{i:02d}</div>
        <div class="ladder-body"><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></div>
      </div>"""
        )
    return "    <div class=\"ladder\">\n" + "\n".join(steps) + "\n    </div>"


def keynums(items: list[tuple[str, str, str, str, str]]) -> str:
    ks = []
    for n, label_zh, label_en, desc_zh, desc_en in items:
        ks.append(
            f"""      <div class="keynum">
        <div class="kn-val">{n}</div>
        <div class="kn-label"><span class="lang-zh-only">{label_zh}</span><span class="lang-en-only">{label_en}</span></div>
        <div class="kn-desc"><span class="lang-zh-only">{desc_zh}</span><span class="lang-en-only">{desc_en}</span></div>
      </div>"""
        )
    return "    <div class=\"keynum-row\">\n" + "\n".join(ks) + "\n    </div>"


def pull(zh: str, en: str) -> str:
    return f"""    <blockquote class="pull copper">
      <span class="lang-zh-only">{zh}</span>
      <span class="lang-en-only">{en}</span>
      <cite>Field Note · 10</cite>
    </blockquote>"""


def cmp_table(headers: list[str], rows: list[list[str]]) -> str:
    ths = "".join(f"<th>{h}</th>" for h in headers)
    trs = []
    for row in rows:
        tds = "".join(f"<td>{c}</td>" for c in row)
        trs.append(f"      <tr>{tds}</tr>")
    return f"""    <table class="cmp">
      <thead><tr>{ths}</tr></thead>
      <tbody>
{chr(10).join(trs)}
      </tbody>
    </table>"""


def fig(caption_zh: str, caption_en: str, inner: str = '<div class="fig-placeholder">diagram</div>') -> str:
    return f"""    <figure>
      <div class="figbox">{inner}</div>
      <figcaption>
        <span class="figid">FIG</span>
        <span class="lang-zh-only">{caption_zh}</span>
        <span class="lang-en-only">{caption_en}</span>
      </figcaption>
    </figure>"""


def h3(zh: str, en: str) -> str:
    return f'    <h3 class="sub"><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></h3>'


def h4(zh: str, en: str) -> str:
    return f'    <h4 class="sub2"><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></h4>'


def para(zh: str, en: str) -> str:
    return f"""    <div class="lang-zh-only"><p>{zh}</p></div>
    <div class="lang-en-only"><p>{en}</p></div>"""


def join(*parts: str) -> str:
    return "\n\n".join(parts)


CHAPTERS: dict[str, str] = {}

CHAPTERS["c1"] = join(
    para(
        "2025–2026 年的 coding agent 市场被两条路线撕成两半:<strong>密封产品</strong>(Claude Code、Cursor、Windsurf)和<strong>可组合 harness</strong>(Pi、OpenCode、aider 变体)。前者卖「开箱即用的完整体验」——MCP 市场、子 agent、Plan 模式、权限弹窗、IDE 集成全部焊死在一个二进制里。后者卖「你能看见、能改、能 fork 的编排层」。",
        "The 2025–2026 coding-agent market splits into sealed products (Claude Code, Cursor, Windsurf) and composable harnesses (Pi, OpenCode, aider variants). Products ship a complete experience; harnesses ship orchestration you can read, modify, and fork.",
    ),
    stage_purpose(
        [
            ("产品思维", "Product mindset", "用户买的是<strong>体验闭环</strong>", "Users buy a <strong>closed loop</strong>"),
            ("Harness 思维", "Harness mindset", "开发者买的是<strong>可观测编排</strong>", "Developers buy <strong>observable orchestration</strong>"),
            ("Pi 的赌注", "Pi's bet", "终端原生 + JSONL 会话树 + TS 扩展", "Terminal-native + JSONL tree + TS extensions"),
            ("代价", "The cost", "没有 MCP、子 agent、Plan 模式——<em>故意不做</em>", "No MCP, sub-agents, plan mode — <em>intentional</em>"),
        ]
    ),
    formula(
        "架构公式",
        "ARCHITECTURE",
        [
            '<span class="term">Product</span> = UX × Integrations × Policy',
            '<span class="term-cu">Harness</span> = AgentLoop × Tools × Session × Extensions',
        ],
        "Pi 选择右边那条等式",
        "Pi chooses the right-hand equation",
    ),
    cmp_table(
        ["", "Claude Code", "Cursor", "Pi"],
        [
            ["定位", "密封 CLI", "密封 IDE", "开源 harness"],
            ["会话", "专有", "专有", "JSONL 树"],
            ["扩展", "MCP", "VS Code", "TypeScript hooks"],
            ["可 fork", "✗", "✗", "✓"],
        ],
    ),
    src_stack(
        "sdk",
        "packages/coding-agent/src/core/sdk.ts",
        [
            '<span class="src-kw">export interface</span> <span class="src-cls">CreateAgentSessionOptions</span> {',
            '  <span class="src-arg">cwd</span>?: <span class="src-cls">string</span>;',
            '  <span class="src-arg">model</span>?: <span class="src-cls">Model</span>&lt;<span class="src-cls">any</span>&gt;;',
            '  <span class="src-arg">tools</span>?: <span class="src-cls">string</span>[];',
            '  <span class="src-arg">resourceLoader</span>?: <span class="src-cls">ResourceLoader</span>;',
            '  <span class="src-arg">sessionManager</span>?: <span class="src-cls">SessionManager</span>;',
            "}",
        ],
    ),
    h3("为什么「最小」是特性", 'Why "minimal" is a feature'),
    para(
        "密封产品的复杂度藏在黑盒里。Pi 把 steering、compaction、tool 并行策略写进 <code>agent-loop.ts</code> 和 <code>agent-session.ts</code>,用单元测试锁住行为。你可以 fork pi-mono 换工具、写扩展注入 lint 规则、用 <code>--mode rpc</code> 嵌进 CI。",
        "Sealed products hide complexity. Pi writes steering, compaction, and tool parallelism into <code>agent-loop.ts</code> and <code>agent-session.ts</code>, locked by tests. Fork pi-mono, swap tools, inject lint rules via extensions, embed with <code>--mode rpc</code>.",
    ),
    keynums(
        [
            ("6", "npm 包", "packages", "monorepo 分层", "monorepo layers"),
            ("22", "工序", "stations", "用户消息全链路", "full message path"),
            ("40+", "事件", "events", "Extension hook 面", "extension hooks"),
        ]
    ),
    note(
        "Claude Code 和 Cursor 解决普通开发者问题;Pi 解决想理解 agent 内部机制的人的问题。",
        "Claude Code and Cursor serve average developers; Pi serves people who want to understand agent internals.",
        copper=True,
    ),
    pull(
        "产品卖的是答案。<br>Harness 卖的是<strong>显微镜</strong>。",
        "Products sell answers.<br>Harnesses sell the <strong>microscope</strong>.",
    ),
    fig("Harness vs Product 光谱", "Harness vs product spectrum"),
)

# Due to size, remaining chapters generated inline in write step
print("Building", len(CHAPTERS), "chapters so far")
