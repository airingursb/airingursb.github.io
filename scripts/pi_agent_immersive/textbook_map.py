"""Cross-reference map between pi-textbook checkpoints and production pi-mono."""

TEXTBOOK_CHECKPOINTS = [
    ("00", "序章", "一次 README 读取的七个里程碑", "prologue.ts", "观察完整闭环"),
    ("01", "协议", "TypeScript 生存集", "events.ts", "tagged union + 运行时校验"),
    ("02", "协议", "EventStream", "event-stream.ts", "过程项与终态同时交付"),
    ("03", "协议", "Message IR", "types.ts", "canonical transcript 三层消息"),
    ("04", "协议", "ScriptedModel", "scripted-model.ts", "离线可复现的模型回合"),
    ("05", "协议", "Provider Adapter", "provider-adapter.ts", "SSE → 统一事件"),
    ("06", "循环", "Tool Contract", "tool-contract", "schema + Registry + executor"),
    ("07", "循环", "Agent Loop", "agent-loop.ts", "两次 model.stream()"),
    ("08", "循环", "Coding Tools", "coding-tools", "read/write/edit/bash"),
    ("09", "状态", "Stateful Agent", "stateful-agent", "steer/follow-up/abort"),
    ("10", "状态", "Session Tree", "session.ts", "JSONL parentId 分支"),
    ("11", "状态", "Context Compaction", "context.ts", "历史不动·上下文重建"),
    ("12", "扩展", "Resources + Extensions", "resources-extensions", "AGENTS.md + hooks"),
    ("13", "扩展", "Composition Root", "composition-root", "Runtime 组装"),
    ("14", "验证", "Eval Capstone", "eval-capstone", "独立评测验收"),
]

PRODUCTION_MAP = {
    "00": "packages/coding-agent/src/main.ts · packages/agent/src/agent-loop.ts",
    "02": "packages/ai/src/utils/event-stream.ts",
    "03": "packages/agent/src/types.ts · packages/coding-agent/src/core/messages.ts",
    "05": "packages/ai/src/api/*.ts · packages/ai/src/models.ts",
    "06": "packages/agent/src/agent-loop.ts · packages/coding-agent/src/core/tools/",
    "07": "packages/agent/src/agent-loop.ts",
    "08": "packages/coding-agent/src/core/tools/index.ts",
    "09": "packages/agent/src/agent.ts",
    "10": "packages/coding-agent/src/core/session-manager.ts",
    "11": "packages/coding-agent/src/core/compaction/",
    "12": "packages/coding-agent/src/core/extensions/ · resource-loader.ts",
    "13": "packages/coding-agent/src/core/agent-session.ts · sdk.ts",
    "14": "packages/evals/",
}

SEVEN_MILESTONES = [
    ("01", "user_message", "user", "读取 README.md，并概括项目"),
    ("02", "model_start", "model", "turn=1"),
    ("03", "assistant_message", "model", "stopReason=toolUse · toolCallId=call_1"),
    ("04", "tool_start", "loop", "调度 read(call_1)"),
    ("05", "tool_result", "tool", "README fixture · toolCallId=call_1"),
    ("06", "model_start", "model", "turn=2"),
    ("07", "assistant_message", "model", "stopReason=stop · 最终回答"),
]
