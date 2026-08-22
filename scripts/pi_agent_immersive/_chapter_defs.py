"""Chapter HTML definitions for Pi Agent immersive article."""
from __future__ import annotations

from _html_helpers import (
    cmp,
    fig,
    formula,
    h3,
    h4,
    join,
    keynums,
    ladder,
    note,
    p,
    pull,
    sp,
    src,
)

ALL_CHAPTERS: dict[str, str] = {}

ALL_CHAPTERS["c1"] = join(
    p(
        "2025–2026 年的 coding agent 市场被两条路线撕成两半:<strong>密封产品</strong>(Claude Code、Cursor、Windsurf)和<strong>可组合 harness</strong>(Pi、OpenCode、aider 变体)。前者卖「开箱即用的完整体验」——MCP 市场、子 agent、Plan 模式、权限弹窗、IDE 集成全部焊死在一个二进制里。后者卖「你能看见、能改、能 fork 的编排层」。",
        "The 2025–2026 coding-agent market splits into sealed products (Claude Code, Cursor, Windsurf) and composable harnesses (Pi, OpenCode, aider variants). Products ship a complete experience; harnesses ship orchestration you can read, modify, and fork.",
    ),
    sp(
        [
            ("产品思维", "Product mindset", "用户买的是<strong>体验闭环</strong>——从安装到第一次 commit 零配置", "Users buy a <strong>closed loop</strong> — zero config from install to first commit"),
            ("Harness 思维", "Harness mindset", "开发者买的是<strong>可观测编排</strong>——每一层都有源码和测试", "Developers buy <strong>observable orchestration</strong> — every layer has source and tests"),
            ("Pi 的赌注", "Pi's bet", "终端原生 + JSONL 会话树 + TypeScript 扩展 > IDE 锁定", "Terminal-native + JSONL session tree + TS extensions > IDE lock-in"),
            ("代价", "The cost", "没有 MCP 协议层、没有子 agent、没有 Plan 模式——<em>故意不做</em>", "No MCP layer, no sub-agents, no plan mode — <em>intentionally omitted</em>"),
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
    cmp(
        ["", "Claude Code", "Cursor", "Pi"],
        [
            ["定位", "密封 CLI 产品", "密封 IDE 产品", "开源 harness"],
            ["会话格式", "专有", "专有", "JSONL 树"],
            ["扩展", "MCP + 插件", "VS Code 生态", "TypeScript hooks"],
            ["可 fork", "✗", "✗", "✓ pi-mono"],
        ],
    ),
    src(
        "sdk",
        "packages/coding-agent/src/core/sdk.ts",
        [
            '<span class="src-comment">/** CreateAgentSessionOptions — harness entry contract */</span>',
            '<span class="src-kw">export interface</span> <span class="src-cls">CreateAgentSessionOptions</span> {',
            '  <span class="src-arg">cwd</span>?: <span class="src-cls">string</span>;',
            '  <span class="src-arg">model</span>?: <span class="src-cls">Model</span>&lt;<span class="src-cls">any</span>&gt;;',
            '  <span class="src-arg">tools</span>?: <span class="src-cls">string</span>[];',
            '  <span class="src-arg">resourceLoader</span>?: <span class="src-cls">ResourceLoader</span>;',
            '  <span class="src-arg">sessionManager</span>?: <span class="src-cls">SessionManager</span>;',
            "}",
        ],
    ),
    h3("为什么「最小」是特性而不是缺陷", 'Why "minimal" is a feature, not a bug'),
    p(
        "密封产品的复杂度藏在黑盒里:你不知道 steering 消息如何插队、compaction 的精确阈值、tool 并行策略。Pi 把这三件事写进 <code>agent-loop.ts</code> 和 <code>agent-session.ts</code>,用单元测试锁住行为。你可以 fork pi-mono 换工具、写扩展注入 lint、用 <code>--mode rpc</code> 嵌进 CI。",
        "Sealed products hide complexity. Pi writes steering, compaction, and tool parallelism into <code>agent-loop.ts</code> and <code>agent-session.ts</code>, locked by tests. Fork pi-mono, swap tools, inject lint via extensions, embed with <code>--mode rpc</code>.",
    ),
    keynums(
        [
            ("6", "npm 包", "npm packages", "agent-core · ai · tui · coding-agent · protocol · server", "agent-core · ai · tui · coding-agent · protocol · server"),
            ("22", "工序站", "stations", "一条用户消息穿越的完整链路", "full path of one user message"),
            ("40+", "事件类型", "event types", "Extension API 暴露的 hook 面", "hooks exposed by Extension API"),
        ]
    ),
    note(
        "Claude Code 和 Cursor 解决<strong>普通开发者</strong>的问题;Pi 解决<strong>想理解 agent 内部机制</strong>的人的问题。",
        "Claude Code and Cursor serve average developers; Pi serves people who want to understand agent internals.",
        copper=True,
    ),
    pull(
        "产品卖的是答案。<br>Harness 卖的是<strong>能问出下一个问题</strong>的显微镜。",
        "Products sell answers.<br>Harnesses sell the microscope to ask the <strong>next question</strong>.",
    ),
    fig("Harness vs Product 光谱:密封体验在左,可组合层在右,Pi 落在右侧但保持终端原生。", "Harness vs product spectrum: sealed UX left, composable layers right; Pi stays terminal-native."),
)

# Remaining chapters in chapters.py (build_all_chapters)
