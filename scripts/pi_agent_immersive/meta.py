"""Metadata and TOC structure for Pi Agent immersive article."""

SLUG = "pi-agent"
TITLE_ZH = "一条用户消息在 Pi Agent 里的一生"
TITLE_EN = "The Life of a User Message Inside Pi Agent"
SUBTITLE_ZH = "CLI → AgentSession → agentLoop → pi-ai → tools → JSONL → TUI diff"
SUBTITLE_EN = "CLI → AgentSession → agentLoop → pi-ai → tools → JSONL → TUI diff"
DECK_ZH = (
    "你在终端里敲下一行「读取 README.md，用一句话告诉我这个项目做什么」之后，这串文字要穿过 26 道工序、"
    "跨 6 个 npm 包、在 3 层消息模型里变形，最后才变成屏幕上滚动的 token 和磁盘上的一行 JSONL。"
    "对照 earendil-works/pi 生产源码与 hahhforest/pi-textbook 的 15 个 checkpoint，把每一步的类层级、"
    "事件流、owner 分工、可视化全摊开。"
)
DECK_EN = (
    "After you type «read README.md and tell me what this project does in one sentence», that string "
    "passes through 26 stations, crosses six npm packages, morphs across three message layers, and "
    "only then becomes scrolling tokens on screen and one JSONL line on disk. Cross-reading "
    "earendil-works/pi production source with hahhforest/pi-textbook's 15 checkpoints — every step: "
    "class hierarchy, event flow, owner roles, and diagrams."
)
FIELD_NOTE = "10"
DATE = "2026-08-22"
OG_IMAGE = "https://ursb.me/og/pi-agent.png"

CHAPTERS = [
    # (id, num, phase_zh, phase_en, title_zh, title_en, subtitle_zh, subtitle_en, special)
    ("c1", "01", "引子", "Prologue", "Harness 不是 Product", "Harness is not a product",
     "agent 产品战争里的第三条路", "a third path in the agent product war", False),
    ("c2", "02", "引子", "Prologue", "一条消息的 22 站", "22 stations for one message",
     "从回车到 JSONL 的全景图", "from Enter to JSONL, the full map", False),
    ("c3", "03", "背景", "Background", "pi-mono 家谱", "The pi-mono family tree",
     "Mario Zechner 与 earendil-works", "Mario Zechner and earendil-works", False),
    ("c4", "04", "背景", "Background", "六层蛋糕", "The six-layer cake",
     "agent-core · ai · tui · coding-agent", "agent-core · ai · tui · coding-agent", False),
    ("c5", "05", "背景", "Background", "故意不做的功能", "Intentionally missing features",
     "No MCP · No sub-agents · No plan mode", "No MCP · No sub-agents · No plan mode", True),
    ("c6", "06", "入口", "Intake", "CLI 启动链", "CLI boot chain",
     "cli.ts → main.ts → createAgentSession", "cli.ts → main.ts → createAgentSession", False),
    ("c7", "07", "入口", "Intake", "AgentSession 编排", "AgentSession orchestration",
     "唯一的中枢调度器", "the single orchestration hub", False),
    ("c8", "08", "入口", "Intake", "AGENTS.md 上下文栈", "The AGENTS.md context stack",
     "从 ~/.pi 到项目根的指令叠加", "instructions stacked from ~/.pi to project root", False),
    ("c9", "09", "心脏", "Heart", "两层消息模型", "Two-layer message model",
     "AgentMessage ≠ Message", "AgentMessage ≠ Message", True),
    ("c10", "10", "心脏", "Heart", "runLoop 双环", "The runLoop twin loops",
     "outer follow-up · inner tool batch", "outer follow-up · inner tool batch", True),
    ("c11", "11", "心脏", "Heart", "Steering 与 Follow-up", "Steering and follow-up",
     "运行中插队与结束后续", "mid-run injection and post-stop follow-up", False),
    ("c12", "12", "心脏", "Heart", "Tool 执行管线", "Tool execution pipeline",
     "parallel vs sequential · length 截断", "parallel vs sequential · length truncation", False),
    ("c13", "13", "心脏", "Heart", "事件总线", "The event bus",
     "message_update 如何驱动 TUI", "how message_update drives the TUI", False),
    ("c14", "14", "LLM", "LLM", "pi-ai 提供商抽象", "pi-ai provider abstraction",
     "Models · createProvider · streamSimple", "Models · createProvider · streamSimple", False),
    ("c15", "15", "LLM", "LLM", "流式 EventStream", "Streaming EventStream",
     "text_delta · toolcall_delta · done", "text_delta · toolcall_delta · done", False),
    ("c16", "16", "LLM", "LLM", "认证与模型目录", "Auth and model catalog",
     "40+ providers · OAuth · models.generated.ts", "40+ providers · OAuth · models.generated.ts", False),
    ("c17", "17", "终端", "Terminal", "差分渲染 TUI", "Differential-render TUI",
     "CSI 2026 · firstChanged → lastChanged", "CSI 2026 · firstChanged → lastChanged", True),
    ("c18", "18", "终端", "Terminal", "Interactive Mode", "Interactive mode",
     "Editor · Markdown · tool renderers", "Editor · Markdown · tool renderers", False),
    ("c19", "19", "扩展", "Extensions", "Extension API 面", "Extension API surface",
     "registerTool · registerCommand · events", "registerTool · registerCommand · events", False),
    ("c20", "20", "扩展", "Extensions", "ExtensionRunner", "ExtensionRunner",
     "jiti 加载 · 事件合并 · hook 注入", "jiti load · event merge · hook injection", False),
    ("c21", "21", "扩展", "Extensions", "Pi Packages", "Pi packages",
     "npm · git · 可分享的 harness 能力", "npm · git · shareable harness capabilities", False),
    ("c22", "22", "持久化", "Persistence", "JSONL 会话树", "JSONL session tree",
     "parentId · leafId · fork", "parentId · leafId · fork", True),
    ("c23", "23", "持久化", "Persistence", "Compaction 与 Harness", "Compaction and harness",
     "上下文压缩 · SQLite lanes", "context compression · SQLite lanes", False),
    ("c24", "24", "全景", "Landscape", "对比 Claude Code / Cursor", "vs Claude Code / Cursor",
     "minimal harness 的设计取舍", "design trade-offs of a minimal harness", False),
    ("c25", "25", "全景", "Landscape", "RPC 与 pi-server", "RPC and pi-server",
     "JSONL 进程协议 · CBOR 远程会话", "JSONL process protocol · CBOR remote sessions", False),
    ("c26", "26", "Coda", "Coda", "怎么自己 trace 一轮", "How to trace a turn yourself",
     "--verbose · event log · session file", "--verbose · event log · session file", False),
]

TOC_GROUPS = [
    ("bg", "0", "引子", "Prologue", "2 chapters · framing", 2, ["c1", "c2"]),
    ("in", "I", "入口", "Intake", "3 chapters · CLI to context", 3, ["c6", "c7", "c8"]),
    ("heart", "II", "心脏", "Heart", "5 chapters · agent loop", 5, ["c9", "c10", "c11", "c12", "c13"]),
    ("llm", "III", "LLM", "LLM", "3 chapters · pi-ai", 3, ["c14", "c15", "c16"]),
    ("tui", "IV", "终端", "Terminal", "2 chapters · differential TUI", 2, ["c17", "c18"]),
    ("ext", "V", "扩展", "Extensions", "3 chapters · TypeScript hooks", 3, ["c19", "c20", "c21"]),
    ("persist", "VI", "持久化", "Persistence", "2 chapters · JSONL + harness", 2, ["c22", "c23"]),
    ("land", "VII", "全景", "Landscape", "2 chapters · ecosystem", 2, ["c24", "c25"]),
    ("coda", "∎", "Coda", "Coda", "trace it yourself", 1, ["c26"]),
]

# Background chapters between prologue and intake
TOC_GROUPS_BG = [
    ("card", "·", "背景", "Background", "3 chapters · monorepo", 3, ["c3", "c4", "c5"]),
]
