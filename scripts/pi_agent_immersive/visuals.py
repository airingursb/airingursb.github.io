"""SVG and HTML visualization blocks for Pi Agent immersive article."""
from __future__ import annotations

from _html_helpers import fig


def svg_wrap(inner: str, viewbox: str = "0 0 720 280") -> str:
    defs = """
  <defs>
    <marker id="pi-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#1f5c8c"/>
    </marker>
  </defs>"""
    return f'<svg viewBox="{viewbox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" class="pi-svg">{defs}{inner}</svg>'


def viz_harness_spectrum() -> str:
    inner = """
  <defs>
    <linearGradient id="g-spec" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#767c87"/>
      <stop offset="50%" stop-color="#1f5c8c"/>
      <stop offset="100%" stop-color="#2d6a4f"/>
    </linearGradient>
  </defs>
  <text x="24" y="28" class="svg-label">SEALED PRODUCT</text>
  <text x="620" y="28" text-anchor="end" class="svg-label">OPEN HARNESS</text>
  <rect x="24" y="40" width="672" height="10" rx="5" fill="url(#g-spec)" opacity="0.85"/>
  <circle cx="120" cy="45" r="14" fill="#faf6ed" stroke="#767c87" stroke-width="2"/>
  <text x="120" y="49" text-anchor="middle" class="svg-tiny">CC</text>
  <circle cx="280" cy="45" r="14" fill="#faf6ed" stroke="#767c87" stroke-width="2"/>
  <text x="280" y="49" text-anchor="middle" class="svg-tiny">Cur</text>
  <circle cx="560" cy="45" r="18" fill="#1f5c8c" stroke="#15171c" stroke-width="2"/>
  <text x="560" y="50" text-anchor="middle" fill="#faf6ed" class="svg-tiny" font-weight="700">Pi</text>
  <rect x="40" y="80" width="200" height="56" rx="4" class="svg-box muted"/>
  <text x="140" y="104" text-anchor="middle" class="svg-body">MCP · Sub-agents</text>
  <text x="140" y="122" text-anchor="middle" class="svg-mute">baked in</text>
  <rect x="260" y="80" width="200" height="56" rx="4" class="svg-box muted"/>
  <text x="360" y="104" text-anchor="middle" class="svg-body">IDE · Cloud sync</text>
  <text x="360" y="122" text-anchor="middle" class="svg-mute">editor lock-in</text>
  <rect x="480" y="72" width="200" height="72" rx="4" class="svg-box accent"/>
  <text x="580" y="100" text-anchor="middle" class="svg-body">JSONL tree</text>
  <text x="580" y="118" text-anchor="middle" class="svg-body">TS extensions</text>
  <text x="580" y="136" text-anchor="middle" class="svg-mute">agent-loop.ts readable</text>
  <path d="M140 136 L140 168 L580 168 L580 144" fill="none" class="svg-arrow"/>
  <text x="360" y="190" text-anchor="middle" class="svg-mute">Pi trades features for observability</text>
"""
    return fig(
        "Harness vs Product 光谱：密封产品在左，可组合 harness 在右；Pi 落在终端原生、JSONL 可读的一侧。",
        "Harness vs product spectrum: sealed products left, composable harness right; Pi sits on the terminal-native, JSONL-readable side.",
        f'<div class="pi-fig">{svg_wrap(inner)}</div>',
    )


def viz_seven_milestones() -> str:
    steps = [
        ("01", "user_message", "user", 48),
        ("02", "model_start", "model", 148),
        ("03", "assistant", "model", 248),
        ("04", "tool_start", "loop", 348),
        ("05", "tool_result", "tool", 448),
        ("06", "model_start", "model", 548),
        ("07", "assistant", "model", 648),
    ]
    colors = {"user": "#b35a1f", "model": "#1f5c8c", "loop": "#6b3aa3", "tool": "#2d6a4f"}
    nodes = ""
    for num, typ, owner, x in steps:
        c = colors[owner]
        nodes += f'''
  <circle cx="{x}" cy="120" r="22" fill="{c}" opacity="0.15" stroke="{c}" stroke-width="2"/>
  <text x="{x}" y="116" text-anchor="middle" class="svg-tiny" fill="{c}" font-weight="700">{num}</text>
  <text x="{x}" y="130" text-anchor="middle" class="svg-micro">{typ.replace("_", " ")[:12]}</text>
  <text x="{x}" y="158" text-anchor="middle" class="svg-mute">{owner}</text>'''
    inner = f"""
  <line x1="70" y1="120" x2="650" y2="120" stroke="#c7c4ba" stroke-width="2"/>
  {nodes}
  <text x="48" y="52" class="svg-label">pi-textbook checkpoint 00 · README read trace</text>
  <rect x="230" y="190" width="260" height="58" rx="4" class="svg-box paper"/>
  <text x="360" y="212" text-anchor="middle" class="svg-body">toolCallId = call_1</text>
  <text x="360" y="232" text-anchor="middle" class="svg-mute">request (03) ↔ result (05) must pair</text>
"""
    return fig(
        "七个里程碑：owner 分工——user 定目标，model 推理，loop 调度，tool 返回环境事实。",
        "Seven milestones: owner roles — user sets goal, model reasons, loop dispatches, tool returns environment facts.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 260")}</div>',
    )


STATIONS_22: list[tuple[str, str, str, str]] = [
    ("01", "CLI 解析", "cli.ts argv", "intake"),
    ("02", "main 启动", "main.ts boot", "intake"),
    ("03", "Session", "session factory", "intake"),
    ("04", "AGENTS.md", "context stack", "intake"),
    ("05", "prompt 入队", "prompt queued", "heart"),
    ("06", "agent_start", "agent_start", "heart"),
    ("07", "turn_start", "turn_start", "heart"),
    ("08", "convertToLlm", "→ Message[]", "llm"),
    ("09", "streamSimple", "pi-ai stream", "llm"),
    ("10", "text_delta", "token stream", "llm"),
    ("11", "toolcall_δ", "tool assembly", "llm"),
    ("12", "toolUse", "read request", "heart"),
    ("13", "executeTool", "tool dispatch", "heart"),
    ("14", "read README", "filesystem I/O", "tool"),
    ("15", "tool_result", "tool result", "tool"),
    ("16", "stream #2", "turn 2 model", "llm"),
    ("17", "assistant stop", "final answer", "llm"),
    ("18", "message_end", "message_end", "heart"),
    ("19", "JSONL append", "JSONL write", "persist"),
    ("20", "TUI diff", "diff render", "terminal"),
    ("21", "extensions", "extension hooks", "terminal"),
    ("22", "compaction", "context check", "persist"),
]

PHASE_COLORS = {
    "intake": "#767c87",
    "heart": "#1f5c8c",
    "llm": "#6b3aa3",
    "tool": "#2d6a4f",
    "terminal": "#3873a3",
    "persist": "#b35a1f",
}


def station_track() -> str:
    cells = []
    for num, zh, en, phase in STATIONS_22:
        color = PHASE_COLORS[phase]
        cells.append(
            f"""      <div class="st-cell" data-phase="{phase}" style="--st-color:{color}">
        <div class="st-num">{num}</div>
        <div class="st-name"><span class="lang-zh-only">{zh}</span><span class="lang-en-only">{en}</span></div>
        <div class="st-phase">{phase}</div>
      </div>"""
        )
    return f"""    <div class="station-track" role="list" aria-label="22 stations">
      <div class="st-rail">
{chr(10).join(cells)}
      </div>
    </div>"""


def viz_22_stations_panorama() -> str:
    """Full 22-station snake timeline SVG — the main C02 panorama."""
    # Row 1: 01-11, Row 2: 12-22
    row1 = STATIONS_22[:11]
    row2 = STATIONS_22[11:]
    nodes = ""
    paths = ""
    x0, y1, y2 = 48, 95, 195
    dx = 88
    prev = None
    for i, (num, zh, _en, phase) in enumerate(row1):
        x = x0 + i * dx
        c = PHASE_COLORS[phase]
        label = zh[:10] if len(zh) > 10 else zh
        nodes += f'''
  <rect x="{x-28}" y="{y1-28}" width="56" height="56" rx="4" fill="{c}" opacity="0.12" stroke="{c}" stroke-width="1.5"/>
  <text x="{x}" y="{y1-8}" text-anchor="middle" class="svg-tiny" fill="{c}" font-weight="700">{num}</text>
  <text x="{x}" y="{y1+10}" text-anchor="middle" class="svg-micro">{label}</text>'''
        if prev:
            paths += f'<line x1="{prev[0]+28}" y1="{y1}" x2="{x-28}" y2="{y1}" stroke="#c7c4ba" stroke-width="1.5"/>'
        prev = (x, y1)
    # connector 11 → 12
    x11 = x0 + 10 * dx
    x12 = x0
    mid_y = (y1 + y2) // 2
    paths += (
        f'<path d="M{x11+28} {y1} L{x11+52} {y1} L{x11+52} {mid_y} '
        f'L{x12-52} {mid_y} L{x12-52} {y2-28} L{x12-28} {y2-28}" '
        f'fill="none" stroke="#c7c4ba" stroke-width="1.5"/>'
    )
    prev = None
    for i, (num, zh, _en, phase) in enumerate(row2):
        x = x0 + i * dx
        c = PHASE_COLORS[phase]
        label = zh[:10] if len(zh) > 10 else zh
        nodes += f'''
  <rect x="{x-28}" y="{y2-28}" width="56" height="56" rx="4" fill="{c}" opacity="0.12" stroke="{c}" stroke-width="1.5"/>
  <text x="{x}" y="{y2-8}" text-anchor="middle" class="svg-tiny" fill="{c}" font-weight="700">{num}</text>
  <text x="{x}" y="{y2+10}" text-anchor="middle" class="svg-micro">{label}</text>'''
        if prev:
            paths += f'<line x1="{prev[0]+28}" y1="{y2}" x2="{x-28}" y2="{y2}" stroke="#c7c4ba" stroke-width="1.5"/>'
        prev = (x, y2)
    # phase legend
    legend = ""
    lx = 48
    for phase, color in PHASE_COLORS.items():
        legend += f'<rect x="{lx}" y="248" width="10" height="10" fill="{color}" opacity="0.5"/>'
        legend += f'<text x="{lx+14}" y="257" class="svg-micro">{phase}</text>'
        lx += 72
    inner = f"""
  <text x="48" y="32" class="svg-label">22 stations · snake timeline · one user message</text>
  <text x="48" y="52" class="svg-mute">Enter → … → JSONL on disk</text>
  {paths}
  {nodes}
  {legend}
"""
    return fig(
        "22 站全景：从 CLI 解析到 compaction 检查的完整蛇形时间线，颜色按 Phase 编码。",
        "22-station panorama: snake timeline from CLI parse to compaction check, color-coded by phase.",
        f'<div class="pi-fig panorama">{svg_wrap(inner, "0 0 1000 270")}</div>',
    )


def viz_stations_flow() -> str:
    """Compact 22-station flow grouped by phase."""
    groups = [
        ("入口", "#767c87", ["CLI", "main", "Session", "AGENTS"]),
        ("心脏", "#1f5c8c", ["loop", "stream", "tool", "event"]),
        ("LLM", "#6b3aa3", ["provider", "delta", "auth"]),
        ("终端", "#2d6a4f", ["TUI", "Editor"]),
        ("持久化", "#b35a1f", ["JSONL", "compact"]),
    ]
    x = 24
    rects = ""
    for label, color, items in groups:
        w = 28 * len(items) + 36
        rects += f'<rect x="{x}" y="70" width="{w}" height="88" rx="4" fill="{color}" opacity="0.08" stroke="{color}" stroke-width="1.5"/>'
        rects += f'<text x="{x + w/2}" y="58" text-anchor="middle" class="svg-label" fill="{color}">{label}</text>'
        for i, it in enumerate(items):
            rects += f'<rect x="{x + 18 + i*28}" y="98" width="22" height="44" rx="2" fill="#faf6ed" stroke="{color}" stroke-width="1"/>'
            rects += f'<text x="{x + 29 + i*28}" y="126" text-anchor="middle" class="svg-micro">{it}</text>'
        x += w + 16
    inner = f"""
  <text x="24" y="28" class="svg-label">22 stations · grouped by phase (C02 map)</text>
  {rects}
  <path d="M 60 200 L 660 200" stroke="#c7c4ba" stroke-dasharray="4 3"/>
  <text x="360" y="230" text-anchor="middle" class="svg-mute">Enter → JSONL on disk · one user message</text>
"""
    return fig(
        "22 站按 Phase 分组：入口四站、心脏四站、LLM 三站、终端两站、持久化两站——持住这张地图读完全文。",
        "22 stations by phase: intake 4, heart 4, LLM 3, terminal 2, persistence 2 — hold this map through the article.",
        f'<div class="pi-fig wide">{svg_wrap(inner, "0 0 720 250")}</div>',
    )


def viz_monorepo_layers() -> str:
    layers = [
        ("L6", "coding-agent", "CLI · AgentSession · tools", "#1f5c8c"),
        ("L5", "agent-core", "agentLoop · AgentMessage", "#3873a3"),
        ("L4", "pi-ai", "Models · streamSimple", "#6b3aa3"),
        ("L3", "pi-tui", "diff render · Editor", "#2d6a4f"),
        ("L2", "protocol", "JSONL RPC frames", "#b35a1f"),
        ("L1", "server", "CBOR remote", "#767c87"),
    ]
    blocks = ""
    y = 28
    for tag, name, desc, color in layers:
        blocks += f'''
  <rect x="120" y="{y}" width="480" height="36" rx="3" fill="{color}" opacity="0.12" stroke="{color}" stroke-width="1.5"/>
  <text x="140" y="{y+16}" class="svg-tiny" fill="{color}" font-weight="700">{tag}</text>
  <text x="180" y="{y+16}" class="svg-body">{name}</text>
  <text x="180" y="{y+30}" class="svg-mute">{desc}</text>'''
        y += 42
    inner = f"""
  <text x="24" y="18" class="svg-label">pi-mono six-layer cake · dependency flows downward</text>
  {blocks}
  <path d="M360 250 L360 268" stroke="#1f5c8c" marker-end="url(#arr)"/>
  <text x="360" y="285" text-anchor="middle" class="svg-mute">through-line prompt enters at L6</text>
"""
    return fig(
        "六层蛋糕：coding-agent 组装下层；agent-core 不 import pi-ai/compat，由宿主注入 StreamFn。",
        "Six-layer cake: coding-agent composes below; agent-core does not import pi-ai/compat — host injects StreamFn.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 300")}</div>',
    )


def viz_message_layers() -> str:
    inner = """
  <rect x="40" y="50" width="180" height="160" rx="4" class="svg-box accent"/>
  <text x="130" y="78" text-anchor="middle" class="svg-label">CANONICAL</text>
  <text x="130" y="110" text-anchor="middle" class="svg-body">AgentMessage[]</text>
  <text x="130" y="130" text-anchor="middle" class="svg-mute">JSONL transcript</text>
  <text x="130" y="150" text-anchor="middle" class="svg-mute">user · assistant</text>
  <text x="130" y="168" text-anchor="middle" class="svg-mute">toolResult · custom</text>
  <rect x="270" y="50" width="180" height="160" rx="4" class="svg-box copper"/>
  <text x="360" y="78" text-anchor="middle" class="svg-label">LLM PROJECTION</text>
  <text x="360" y="110" text-anchor="middle" class="svg-body">Message[]</text>
  <text x="360" y="130" text-anchor="middle" class="svg-mute">convertToLlm()</text>
  <text x="360" y="150" text-anchor="middle" class="svg-mute">streamSimple boundary</text>
  <rect x="500" y="50" width="180" height="160" rx="4" class="svg-box gpu"/>
  <text x="590" y="78" text-anchor="middle" class="svg-label">TUI PROJECTION</text>
  <text x="590" y="110" text-anchor="middle" class="svg-body">Rendered cells</text>
  <text x="590" y="130" text-anchor="middle" class="svg-mute">Markdown · tool cards</text>
  <path d="M220 130 L270 130" class="svg-arrow"/>
  <path d="M450 130 L500 130" class="svg-arrow"/>
  <text x="245" y="122" class="svg-micro">convert</text>
  <text x="475" y="122" class="svg-micro">render</text>
"""
    return fig(
        "三层投影：transcript 是唯一真相源；LLM 与 TUI 各取所需字段。",
        "Three projections: transcript is single source of truth; LLM and TUI each take needed fields.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 230")}</div>',
    )


def viz_runloop_twin() -> str:
    inner = """
  <rect x="30" y="40" width="660" height="200" rx="6" fill="none" stroke="#1f5c8c" stroke-width="2" stroke-dasharray="8 4"/>
  <text x="50" y="64" class="svg-label" fill="#1f5c8c">OUTER LOOP · follow-up queue</text>
  <rect x="60" y="80" width="600" height="140" rx="4" fill="none" stroke="#b35a1f" stroke-width="2"/>
  <text x="80" y="104" class="svg-label" fill="#b35a1f">INNER LOOP · tools + steering</text>
  <rect x="100" y="120" width="120" height="44" rx="3" class="svg-box accent"/>
  <text x="160" y="148" text-anchor="middle" class="svg-body">stream</text>
  <path d="M220 142 L250 142" class="svg-arrow"/>
  <rect x="250" y="120" width="100" height="44" rx="3" class="svg-box copper"/>
  <text x="300" y="148" text-anchor="middle" class="svg-body">toolUse?</text>
  <path d="M350 142 L380 142" class="svg-arrow"/>
  <rect x="380" y="120" width="100" height="44" rx="3" class="svg-box asm"/>
  <text x="430" y="148" text-anchor="middle" class="svg-body">execute</text>
  <path d="M480 142 L510 142" class="svg-arrow"/>
  <rect x="510" y="120" width="120" height="44" rx="3" class="svg-box accent"/>
  <text x="570" y="148" text-anchor="middle" class="svg-body">stream again</text>
  <path d="M570 164 L570 188 L120 188 L120 164" fill="none" stroke="#b35a1f" stroke-dasharray="4 3"/>
  <text x="360" y="210" text-anchor="middle" class="svg-mute">README prompt: 2× stream · 1× read tool</text>
"""
    return fig(
        "runLoop 双环：外环处理 follow-up；内环处理 tool batch 与 steering 注入。",
        "runLoop twin loops: outer handles follow-up; inner handles tool batch and steering injection.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 250")}</div>',
    )


def viz_session_tree() -> str:
    inner = """
  <circle cx="360" cy="36" r="8" fill="#b35a1f"/>
  <text x="360" y="58" text-anchor="middle" class="svg-body">u-1 · user prompt</text>
  <line x1="360" y1="44" x2="280" y2="88" stroke="#c7c4ba"/>
  <line x1="360" y1="44" x2="480" y2="88" stroke="#c7c4ba"/>
  <rect x="220" y="88" width="120" height="36" rx="3" class="svg-box accent"/>
  <text x="280" y="110" text-anchor="middle" class="svg-micro">a-read · toolUse</text>
  <rect x="420" y="88" width="120" height="36" rx="3" class="svg-box muted"/>
  <text x="480" y="110" text-anchor="middle" class="svg-micro">a-alt · sibling</text>
  <line x1="280" y1="124" x2="280" y2="148" stroke="#c7c4ba"/>
  <rect x="220" y="148" width="120" height="36" rx="3" class="svg-box asm"/>
  <text x="280" y="170" text-anchor="middle" class="svg-micro">r-read · toolResult</text>
  <line x1="280" y1="184" x2="280" y2="208" stroke="#c7c4ba"/>
  <rect x="220" y="208" width="120" height="36" rx="3" class="svg-box accent"/>
  <text x="280" y="230" text-anchor="middle" class="svg-micro">a-final · stop</text>
  <text x="520" y="170" class="svg-mute">pathTo(leaf) →</text>
  <text x="520" y="188" class="svg-mute">u-1→a-read→r-read→a-final</text>
"""
    return fig(
        "JSONL 会话树：parentId 构成有向树；sibling 分支不覆盖旧路径；leafId 选择 active path。",
        "JSONL session tree: parentId forms directed tree; sibling branches don't overwrite; leafId selects active path.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 270")}</div>',
    )


def viz_compaction() -> str:
    inner = """
  <text x="24" y="24" class="svg-label">HISTORY (JSONL) — never deleted</text>
  <rect x="24" y="36" width="672" height="48" rx="3" class="svg-box paper"/>
  <text x="40" y="58" class="svg-mono">u1 · a1 · u2 · a2 · u3 · calls · r-read · r-test · a3 · ...</text>
  <text x="40" y="74" class="svg-mute">full append-only log on disk</text>
  <text x="24" y="110" class="svg-label">CONTEXT (model window) — rebuilt per request</text>
  <rect x="24" y="122" width="200" height="48" rx="3" fill="#ebe5d8" stroke="#c7c4ba"/>
  <text x="124" y="152" text-anchor="middle" class="svg-mute">dropped · summarized</text>
  <rect x="240" y="122" width="456" height="48" rx="3" class="svg-box accent"/>
  <text x="260" y="152" class="svg-body">compaction summary + recent suffix (full tool interactions)</text>
  <path d="M360 170 L360 200" class="svg-arrow"/>
  <rect x="200" y="200" width="320" height="40" rx="3" class="svg-box asm"/>
  <text x="360" y="226" text-anchor="middle" class="svg-body">streamSimple(context) · token budget enforced</text>
"""
    return fig(
        "Compaction：历史完整保留在 JSONL；发给模型的 context 按 token 预算重建，早期事实以摘要补回。",
        "Compaction: history stays complete in JSONL; model context rebuilt under token budget with summary for early facts.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 260")}</div>',
    )


def viz_tui_diff() -> str:
    inner = """
  <text x="180" y="28" text-anchor="middle" class="svg-label">FULL REFRESH</text>
  <text x="540" y="28" text-anchor="middle" class="svg-label">CSI 2026 DIFF</text>
  <rect x="40" y="40" width="280" height="160" rx="4" class="svg-box muted"/>
  <rect x="60" y="60" width="240" height="14" fill="#ebe5d8"/>
  <rect x="60" y="78" width="240" height="14" fill="#ebe5d8"/>
  <rect x="60" y="96" width="240" height="14" fill="#ebe5d8"/>
  <rect x="60" y="114" width="240" height="14" fill="#ebe5d8"/>
  <rect x="60" y="132" width="240" height="14" fill="#ebe5d8"/>
  <text x="180" y="185" text-anchor="middle" class="svg-mute">O(screen) · flicker</text>
  <rect x="400" y="40" width="280" height="160" rx="4" class="svg-box accent"/>
  <rect x="420" y="60" width="240" height="14" fill="#faf6ed" opacity="0.4"/>
  <rect x="420" y="78" width="240" height="14" fill="#faf6ed" opacity="0.4"/>
  <rect x="420" y="96" width="240" height="14" fill="#c9dceb" stroke="#1f5c8c"/>
  <rect x="420" y="114" width="240" height="14" fill="#faf6ed" opacity="0.4"/>
  <rect x="420" y="132" width="240" height="14" fill="#faf6ed" opacity="0.4"/>
  <text x="540" y="185" text-anchor="middle" class="svg-mute">O(changed lines) · stable stream</text>
  <text x="540" y="220" text-anchor="middle" class="svg-body">firstChanged → lastChanged only</text>
"""
    return fig(
        "TUI 差分渲染：只重绘变更行区间，流式 token 不触发全屏闪烁。",
        "TUI differential render: redraw only changed line range; streaming tokens avoid full-screen flicker.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 240")}</div>',
    )


def viz_extension_hooks() -> str:
    inner = """
  <rect x="280" y="20" width="160" height="44" rx="4" class="svg-box accent"/>
  <text x="360" y="48" text-anchor="middle" class="svg-body">AgentSession</text>
  <line x1="360" y1="64" x2="360" y2="88" stroke="#c7c4ba"/>
  <rect x="240" y="88" width="240" height="36" rx="3" class="svg-box copper"/>
  <text x="360" y="110" text-anchor="middle" class="svg-body">ExtensionRunner</text>
  <line x1="120" y1="124" x2="600" y2="124" stroke="#c7c4ba"/>
  <rect x="60" y="140" width="110" height="56" rx="3" class="svg-box paper"/>
  <text x="115" y="172" text-anchor="middle" class="svg-micro">session_start</text>
  <rect x="190" y="140" width="110" height="56" rx="3" class="svg-box paper"/>
  <text x="245" y="172" text-anchor="middle" class="svg-micro">tool_call</text>
  <rect x="320" y="140" width="110" height="56" rx="3" class="svg-box paper"/>
  <text x="375" y="172" text-anchor="middle" class="svg-micro">before_compact</text>
  <rect x="450" y="140" width="110" height="56" rx="3" class="svg-box paper"/>
  <text x="505" y="172" text-anchor="middle" class="svg-micro">registerTool</text>
  <rect x="580" y="140" width="110" height="56" rx="3" class="svg-box paper"/>
  <text x="635" y="172" text-anchor="middle" class="svg-micro">message_update</text>
"""
    return fig(
        "Extension 钩子：ExtensionRunner 在 AgentSession 生命周期注入，无需 MCP 同进程协议。",
        "Extension hooks: ExtensionRunner injects at AgentSession lifecycle — no MCP same-process protocol.",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 220")}</div>',
    )


def viz_textbook_map() -> str:
    rows = ""
    y = 44
    for cp, phase, title, _, _ in [
        ("00", "0", "Prologue", "", ""),
        ("03", "I", "Message IR", "", ""),
        ("07", "II", "Agent Loop", "", ""),
        ("10", "III", "Session Tree", "", ""),
        ("11", "III", "Compaction", "", ""),
        ("14", "IV", "Eval", "", ""),
    ]:
        rows += f'<text x="48" y="{y}" class="svg-micro" fill="#1f5c8c">cp {cp}</text>'
        rows += f'<text x="100" y="{y}" class="svg-body">{title}</text>'
        rows += f'<line x1="90" y1="{y-4}" x2="680" y2="{y-4}" stroke="#ebe5d8"/>'
        y += 32
    inner = f"""
  <text x="24" y="24" class="svg-label">pi-textbook · 15 checkpoints → production pi-mono</text>
  {rows}
  <text x="360" y="250" text-anchor="middle" class="svg-mute">each checkpoint = one testable abstraction layer</text>
"""
    return fig(
        "pi-textbook 15 checkpoint 与生产代码的映射关系（节选）。",
        "pi-textbook 15 checkpoints mapped to production code (excerpt).",
        f'<div class="pi-fig">{svg_wrap(inner, "0 0 720 270")}</div>',
    )


def viz_event_swimlane() -> str:
    lanes = [("user", "#b35a1f", 40), ("model", "#1f5c8c", 140), ("loop", "#6b3aa3", 240), ("tool", "#2d6a4f", 340)]
    inner = '<text x="24" y="22" class="svg-label">AgentEvent swimlane · README through-line</text>'
    for name, color, y in lanes:
        inner += f'<text x="24" y="{y+16}" class="svg-micro" fill="{color}">{name}</text>'
        inner += f'<line x1="70" y1="{y+12}" x2="700" y2="{y+12}" stroke="#ebe5d8"/>'
    events = [
        (90, 40, "user_message"),
        (160, 140, "model_start"),
        (230, 140, "assistant toolUse"),
        (300, 240, "tool_start"),
        (370, 340, "tool_result"),
        (440, 140, "model_start"),
        (510, 140, "assistant stop"),
    ]
    for x, y, label in events:
        inner += f'<rect x="{x}" y="{y}" width="56" height="24" rx="2" fill="#faf6ed" stroke="#c7c4ba"/>'
        inner += f'<text x="{x+28}" y="{y+16}" text-anchor="middle" class="svg-micro">{label[:10]}</text>'
    return fig(
        "事件泳道图：同一主线在 user/model/loop/tool 四条泳道上的时序。",
        "Event swimlane: through-line timing across user/model/loop/tool lanes.",
        f'<div class="pi-fig wide">{svg_wrap(inner, "0 0 720 400")}</div>',
    )
