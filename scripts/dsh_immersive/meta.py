"""Metadata and TOC structure for DeepSeek Harness immersive article."""

SLUG = "dsh"
TITLE_ZH = "一条用户消息在 DeepSeek Harness 里的一生"
TITLE_EN = "The Life of a User Message Inside DeepSeek Harness"
SUBTITLE_ZH = "Cordis plugins → ReactLoopAgent → turn/step → deriveMessages → tools → session log"
SUBTITLE_EN = "Cordis plugins → ReactLoopAgent → turn/step → deriveMessages → tools → session log"
DECK_ZH = (
    "你在终端里敲下一行「读取 README.md，用一句话告诉我这个项目做什么」之后，这串文字要穿过 26 道工序、"
    "跨 Cordis 插件树与 core spine 六个包，在 session log 与 surface 投影里变形，最后才变成流式 chunk、"
    "tool/result 与磁盘上的 SessionEvent JSONL。"
    "对照 deepseek-harness 生产源码，用与 Pi 文章相同的主线 prompt，把 turn/step 边界、"
    "agent/pre-step 瀑布、事件三域、deriveMessages 不变量全摊开。"
)
DECK_EN = (
    "After you type «read README.md and tell me what this project does in one sentence», that string "
    "passes through 26 stations, crosses the Cordis plugin tree and six core-spine packages, morphs across "
    "session log and surface projection, and only then becomes streaming chunks, tool/result events, and "
    "SessionEvent JSONL on disk. Cross-reading deepseek-harness production source with the same through-line "
    "prompt as the Pi article — every turn/step boundary, agent/pre-step waterfall, three event domains, "
    "and deriveMessages invariant laid bare."
)
FIELD_NOTE = "11"
DATE = "2026-08-23"
OG_IMAGE = "https://ursb.me/og/dsh.png"

CHAPTERS = [
    # (id, num, phase_zh, phase_en, title_zh, title_en, subtitle_zh, subtitle_en, special)
    ("c1", "01", "引子", "Prologue", "Harness 不是 Product", "Harness is not a product",
     "agent 产品战争里的第三条路", "a third path in the agent product war", False),
    ("c2", "02", "引子", "Prologue", "一条消息的 turn/step 全景", "turn/step panorama for one message",
     "从回车到 session log 的全景图", "from Enter to session log, the full map", False),
    ("c3", "03", "背景", "Background", "deepseek-harness 家谱", "The deepseek-harness family tree",
     "DeepSeek AI · Cordis · vendor/", "DeepSeek AI · Cordis · vendor/", False),
    ("c4", "04", "背景", "Background", "Core spine 六层", "The core-spine six layers",
     "session · system-prompt · tools · agent · agent-loop · llm", "session · system-prompt · tools · agent · agent-loop · llm", False),
    ("c5", "05", "背景", "Background", "Everything is a plugin", "Everything is a plugin",
     "没有特权核心 · 只有 Cordis 组合", "no privileged core · Cordis composition only", True),
    ("c6", "06", "入口", "Intake", "dsh 启动链", "dsh boot chain",
     "profile → bundle → Loader → ctx", "profile → bundle → Loader → ctx", False),
    ("c7", "07", "入口", "Intake", "ctx.agents 生命周期", "ctx.agents lifecycle",
     "create · resume · dispose · scoped ctx", "create · resume · dispose · scoped ctx", False),
    ("c8", "08", "入口", "Intake", "system-prompt 组装", "System prompt assembly",
     "section waterfall · tool schema 入模", "section waterfall · tool schemas into model", False),
    ("c9", "09", "心脏", "Heart", "Session log 不变量", "Session log invariant",
     "deriveMessages · surfaceOp · model-visible means logged", "deriveMessages · surfaceOp · model-visible means logged", True),
    ("c10", "10", "心脏", "Heart", "ReactLoopAgent 驱动", "ReactLoopAgent driver",
     "wakeDriver · turn/start · step/start", "wakeDriver · turn/start · step/start", True),
    ("c11", "11", "心脏", "Heart", "agent/pre-step 瀑布", "agent/pre-step waterfall",
     "claim inbox · inject context · reject turn", "claim inbox · inject context · reject turn", False),
    ("c12", "12", "心脏", "Heart", "Tool 执行管线", "Tool execution pipeline",
     "executeToolCalls · parallel barrier · model order", "executeToolCalls · parallel barrier · model order", False),
    ("c13", "13", "心脏", "Heart", "三域事件矩阵", "Three-domain event matrix",
     "session · agent · capability events", "session · agent · capability events", False),
    ("c14", "14", "LLM", "LLM", "ctx.llm 适配层", "ctx.llm adapter seam",
     "prepareCall · llm/stream · adapter boundary", "prepareCall · llm/stream · adapter boundary", False),
    ("c15", "15", "LLM", "LLM", "assistant/chunk 流式", "assistant/chunk streaming",
     "BlockAssembler · chunk seq · message finalize", "BlockAssembler · chunk seq · message finalize", False),
    ("c16", "16", "LLM", "LLM", "deriveMessages 闭环", "deriveMessages closed loop",
     "boundaryMessages → request · reconstructability", "boundaryMessages → request · reconstructability", False),
    ("c17", "17", "Web", "Web", "ctx.web 能力缝", "ctx.web capability seam",
     "search · fetch · Service Definition", "search · fetch · Service Definition", True),
    ("c18", "18", "Web", "Web", "tool-web Consumer", "tool-web consumer",
     "模型调网络的最后一站", "last station before the model hits the network", False),
    ("c19", "19", "扩展", "Extensions", "Cordis 插件面", "Cordis plugin surface",
     "inject · Service · Events · effects", "inject · Service · Events · effects", False),
    ("c20", "20", "扩展", "Extensions", "Loader 与 bundle", "Loader and bundle",
     "dsh-base · web-app · headless 层叠", "dsh-base · web-app · headless stack", False),
    ("c21", "21", "扩展", "Extensions", "cordis.patch 组合", "cordis.patch composition",
     "替换任意 plugin row · --dump-config", "replace any plugin row · --dump-config", False),
    ("c22", "22", "持久化", "Persistence", "SessionEvent JSONL", "SessionEvent JSONL",
     "seq 连续 · fork · session/flush", "contiguous seq · fork · session/flush", True),
    ("c23", "23", "持久化", "Persistence", "Compaction 与 surface", "Compaction and surface replace",
     "log 不删 · surface replace 重建上下文", "log kept · surface replace rebuilds context", False),
    ("c24", "24", "全景", "Landscape", "对比 Pi Harness", "vs Pi harness",
     "turn/step vs runLoop 双环", "turn/step vs runLoop twin loops", False),
    ("c25", "25", "全景", "Landscape", "JSON-RPC 与 profiles", "JSON-RPC and profiles",
     "web · headless · Python SDK", "web · headless · Python SDK", False),
    ("c26", "26", "Coda", "Coda", "怎么自己 trace 一轮", "How to trace a turn yourself",
     "session/event · event map · --dump-config", "session/event · event map · --dump-config", False),
]

TOC_GROUPS = [
    ("bg", "0", "引子", "Prologue", "2 chapters · framing", 2, ["c1", "c2"]),
    ("in", "I", "入口", "Intake", "3 chapters · boot to context", 3, ["c6", "c7", "c8"]),
    ("heart", "II", "心脏", "Heart", "5 chapters · ReactLoopAgent", 5, ["c9", "c10", "c11", "c12", "c13"]),
    ("llm", "III", "LLM", "LLM", "3 chapters · ctx.llm", 3, ["c14", "c15", "c16"]),
    ("web", "IV", "Web", "Web", "2 chapters · search & fetch", 2, ["c17", "c18"]),
    ("ext", "V", "扩展", "Extensions", "3 chapters · Cordis plugins", 3, ["c19", "c20", "c21"]),
    ("persist", "VI", "持久化", "Persistence", "2 chapters · JSONL + compaction", 2, ["c22", "c23"]),
    ("land", "VII", "全景", "Landscape", "2 chapters · ecosystem", 2, ["c24", "c25"]),
    ("coda", "∎", "Coda", "Coda", "trace it yourself", 1, ["c26"]),
]

# Background chapters between prologue and intake
TOC_GROUPS_BG = [
    ("card", "·", "背景", "Background", "3 chapters · monorepo", 3, ["c3", "c4", "c5"]),
]
