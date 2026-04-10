import { useState } from 'react';

const strings = {
  zh: {
    headerLabel: '16 章课程地图',
    title: '5 大分类 · 16 章深度解析',
    hint: '点击分类进入 → 点击章节查看亮点',
    backAll: '返回全景',
    backPrefix: '返回 ',
    chaptersSuffix: ' 章',
    highlightLabel: 'Highlight',
    categories: [
      {
        name: '基础概念',
        nameEn: 'Fundamentals',
        chapters: [
          {
            id: 1, title: 'Prompt', subtitle: '你收到了第一条指令', icon: '💬',
            description: '从用户输入的一句话开始，追踪它如何被解析、包装，最终变成 API 请求的一部分。系统 prompt 从空白到 ~12,000 tokens 的完整装配过程。',
            highlight: 'Section 的注册顺序影响模型的注意力权重分布——越靠前越容易被遵循，所以安全规则总在最前面',
            keyFn: 'getSystemPrompt()',
          },
          {
            id: 14, title: 'System Prompt', subtitle: '我的操作系统是如何装配的', icon: '🧬',
            description: '6 层装配流程：custom/default → memory mechanics → append (CLAUDE.md, hooks)。某些 section 标记为 DANGEROUS_uncached，因为 MCP Server 可在对话中途连接或断开。',
            highlight: 'Memory mechanics prompt 只在同时设置了 custom prompt 和 memory path override 时注入——避免和默认指令冲突',
            keyFn: 'resolveSystemPromptSections()',
          },
          {
            id: 2, title: 'Context', subtitle: '你能看到什么？', icon: '👁',
            description: 'QueryEngine 维护 mutableMessages——整个对话的唯一真相来源。不只是用户消息，还包括 Git 状态、工作区信息、权限拒绝记录等自动注入的上下文。',
            highlight: 'Context 会随对话不断增长，每次工具调用结果都追加进消息数组——直到 auto-compaction 触发',
            keyFn: 'QueryEngine',
          },
        ],
      },
      {
        name: '工具与执行',
        nameEn: 'Tools & Execution',
        chapters: [
          {
            id: 3, title: 'Tools', subtitle: '你有了手和脚', icon: '🛠',
            description: '50+ 工具通过 Feature Flag 和环境检测动态加载。如果已有嵌入式搜索就跳过 GlobTool 避免功能重复。核心工具（AgentTool、BashTool）始终加载，其余按需注入。',
            highlight: '工具选择发生在启动时而非运行时——会话开始后可用工具集就固定了',
            keyFn: 'getAllBaseTools()',
          },
          {
            id: 4, title: 'Agentic Loop', subtitle: '思考、行动、观察、重复', icon: '🔄',
            description: 'async generator 实现的核心循环。每轮：compact → call model → collect tool_use blocks → 权限检查 → 执行 → inject results → 继续。无 tool_use block 时循环终止。',
            highlight: 'auto-compaction 是救命机制：Context 接近上限时自动总结早期内容，让长对话不会崩溃',
            keyFn: 'queryLoop()',
          },
          {
            id: 16, title: 'Message Pipeline', subtitle: '消息如何流过系统', icon: '📨',
            description: '内部 6 种消息类型，API 只接受 user/assistant 两种。管道负责双向转换、截断过长工具结果、处理图片嵌入、确保消息严格交替。',
            highlight: '消息规范化不只是格式转换——还负责截断、嵌入处理、以及确保 user/assistant 严格交替',
            keyFn: '',
          },
          {
            id: 5, title: 'MCP', subtitle: '连接外部世界', icon: '🔌',
            description: 'JSON-RPC 调用外部服务，双重超时保护（SDK + Promise.race），长时间操作每 30 秒输出进度日志。',
            highlight: 'MCP Server 可动态连接/断开，所以相关 System Prompt 标记为 DANGEROUS_uncached',
            keyFn: 'callMCPTool()',
          },
        ],
      },
      {
        name: '记忆与知识',
        nameEn: 'Memory & Knowledge',
        chapters: [
          {
            id: 6, title: 'Memory', subtitle: '持久化的记忆', icon: '🧠',
            description: '三种互斥模式：标准自动记忆（.md + MEMORY.md 索引）、KAIROS 日志、团队记忆。上限 200 行 / 25KB，Sonnet 做相关性过滤。',
            highlight: 'KAIROS 和团队记忆是互斥的（compose conflicts）——两者对记忆的组织方式从根本上不同',
            keyFn: 'loadMemoryPrompt()',
          },
          {
            id: 7, title: 'Codebase Intelligence', subtitle: '代码库的理解与检索', icon: '🔍',
            description: 'ripgrep 驱动的搜索引擎。限制每行 500 字符防止 minified 代码污染，自动排除 .git/ 目录，permission-based ignore patterns 在执行前过滤敏感路径。',
            highlight: '多行匹配需显式启用——跨行正则的性能代价是数量级的，默认只做单行匹配',
            keyFn: 'GrepTool.call()',
          },
        ],
      },
      {
        name: '扩展能力',
        nameEn: 'Extensions',
        chapters: [
          {
            id: 8, title: 'Hooks', subtitle: '自动化的触发器', icon: '⚡',
            description: '在 PreToolUse、PostToolUse、SessionStart、FileChanged 等事件触发自定义逻辑。4 种类型（command/prompt/http/callback），3 个来源（plugins/skills/settings）自动去重。',
            highlight: '不同事件用不同匹配查询——工具事件匹配工具名，文件事件匹配路径，细粒度且精准',
            keyFn: 'getMatchingHooks()',
          },
          {
            id: 9, title: 'Skills', subtitle: '可复用的超能力', icon: '✨',
            description: 'Slash 命令背后的技能系统。关键设计：Fork 模式——复杂技能在独立子 Agent 中运行，完成后只返回结果，避免污染主上下文。',
            highlight: '使用频率被追踪记录，用于智能排序——你最常用的 Slash 命令会出现在更靠前的位置',
            keyFn: 'SkillTool.call()',
          },
          {
            id: 10, title: 'Plugins', subtitle: '打包你的超能力', icon: '📦',
            description: '支持 "name@marketplace" 标识符，可指定或搜索所有已知市场（第一个匹配即停止）。安装分 user / project / local 三个作用域。',
            highlight: '插件市场是可扩展的——第三方可运营自己的 marketplace，只需遵循标准协议',
            keyFn: 'installPluginOp()',
          },
        ],
      },
      {
        name: '协作与治理',
        nameEn: 'Collaboration & Governance',
        chapters: [
          {
            id: 11, title: 'Agents & Subagents', subtitle: '分身术', icon: '👥',
            description: '子 Agent 继承父级上下文（过滤未完成工具调用），获得独立文件状态缓存克隆，可覆盖权限模式和工具集。',
            highlight: '只读 Agent 跳过 CLAUDE.md 注入以节省 tokens——只读操作不需要项目编码规范',
            keyFn: 'runAgent()',
          },
          {
            id: 12, title: 'Permissions & Safety', subtitle: '信任的边界', icon: '🛡',
            description: '7 阶段权限瀑布：deny → ask → tool impl → safety → mode → allow → passthrough-to-ask。每层可做出允许/拒绝/传递三种决定。',
            highlight: 'Safety check 是 bypass-immune——即使 bypass 模式下，访问 .git/ 等危险操作仍必须确认',
            keyFn: 'hasPermissionsToUseToolInner()',
          },
          {
            id: 13, title: 'Configuration', subtitle: '定制你的 Claude Code', icon: '⚙',
            description: '洋葱模型配置层级：settings → CLI args → command → session 逐层覆盖。项目根目录启动时锁定，worktree 切换也不变。',
            highlight: '不同层级的规则是"合并"而非"替换"——session 可添加 allow rules 而不清除 settings 的规则',
            keyFn: 'getAllowRules()',
          },
          {
            id: 15, title: 'Hidden Features', subtitle: '彩蛋与实验性功能', icon: '🔮',
            description: 'KAIROS 持久日志、AutoDream 后台记忆整合、UltraPlan 远程深度规划、Coordinator 多 Agent 编排、Bridge 远程控制、Daemon 后台会话。',
            highlight: 'Daemon 模式通过 Tmux 运行后台 Agent，用邮箱机制通信——真正的 AI 协作者',
            keyFn: '',
          },
        ],
      },
    ],
  },
  en: {
    headerLabel: '16-Chapter Course Map',
    title: '5 Categories · 16 In-Depth Chapters',
    hint: 'Click a category → click a chapter for highlights',
    backAll: 'Back to overview',
    backPrefix: 'Back to ',
    chaptersSuffix: ' chapters',
    highlightLabel: 'Highlight',
    categories: [
      {
        name: 'Fundamentals',
        nameEn: 'Fundamentals',
        chapters: [
          {
            id: 1, title: 'Prompt', subtitle: 'You received your first instruction', icon: '💬',
            description: 'Starting from a single user sentence, trace how it is parsed, wrapped, and finally becomes part of an API request. The full system-prompt assembly from blank to ~12,000 tokens.',
            highlight: "Section registration order shapes the model's attention weighting — the earlier, the more likely to be followed. That is why safety rules always come first.",
            keyFn: 'getSystemPrompt()',
          },
          {
            id: 14, title: 'System Prompt', subtitle: 'How my operating system is assembled', icon: '🧬',
            description: '6-layer assembly: custom/default → memory mechanics → append (CLAUDE.md, hooks). Certain sections are marked DANGEROUS_uncached because MCP servers can connect or disconnect mid-conversation.',
            highlight: 'The memory mechanics prompt is injected only when both a custom prompt and a memory path override are set — to avoid conflicting with the default instructions.',
            keyFn: 'resolveSystemPromptSections()',
          },
          {
            id: 2, title: 'Context', subtitle: 'What can you see?', icon: '👁',
            description: 'QueryEngine maintains mutableMessages — the single source of truth for the entire conversation. Not only user messages, but also auto-injected context like Git state, workspace info, and permission denials.',
            highlight: 'Context grows continuously across the conversation. Every tool result is appended to the message array — until auto-compaction fires.',
            keyFn: 'QueryEngine',
          },
        ],
      },
      {
        name: 'Tools & Execution',
        nameEn: 'Tools & Execution',
        chapters: [
          {
            id: 3, title: 'Tools', subtitle: 'You were given hands and feet', icon: '🛠',
            description: '50+ tools are loaded dynamically via feature flags and environment detection. If embedded search already exists, GlobTool is skipped to avoid duplication. Core tools (AgentTool, BashTool) are always loaded; the rest are injected on demand.',
            highlight: 'Tool selection happens at startup, not runtime — once a session begins, the set of available tools is fixed.',
            keyFn: 'getAllBaseTools()',
          },
          {
            id: 4, title: 'Agentic Loop', subtitle: 'Think, act, observe, repeat', icon: '🔄',
            description: 'The core loop implemented as an async generator. Each turn: compact → call model → collect tool_use blocks → permission check → execute → inject results → continue. The loop terminates when there is no tool_use block.',
            highlight: 'Auto-compaction is a lifesaver: when context approaches the limit, earlier content is summarized automatically so long conversations do not collapse.',
            keyFn: 'queryLoop()',
          },
          {
            id: 16, title: 'Message Pipeline', subtitle: 'How messages flow through the system', icon: '📨',
            description: 'Internally 6 message types; the API only accepts user/assistant. The pipeline handles bidirectional conversion, truncates oversized tool results, processes embedded images, and guarantees strict message alternation.',
            highlight: 'Message normalization is not just format conversion — it also handles truncation, embedding, and guarantees user/assistant strictly alternate.',
            keyFn: '',
          },
          {
            id: 5, title: 'MCP', subtitle: 'Connecting to the outside world', icon: '🔌',
            description: 'JSON-RPC calls to external services with double timeout protection (SDK + Promise.race) and progress logs every 30 seconds for long operations.',
            highlight: 'MCP servers can connect and disconnect dynamically, which is why the related system prompt is marked DANGEROUS_uncached.',
            keyFn: 'callMCPTool()',
          },
        ],
      },
      {
        name: 'Memory & Knowledge',
        nameEn: 'Memory & Knowledge',
        chapters: [
          {
            id: 6, title: 'Memory', subtitle: 'Persistent memory', icon: '🧠',
            description: 'Three mutually exclusive modes: standard auto memory (.md + MEMORY.md index), KAIROS log, and team memory. Capped at 200 lines / 25KB, with Sonnet as the relevance filter.',
            highlight: 'KAIROS and team memory are mutually exclusive (compose conflicts) — they organize memory in fundamentally different ways.',
            keyFn: 'loadMemoryPrompt()',
          },
          {
            id: 7, title: 'Codebase Intelligence', subtitle: 'Understanding and searching the codebase', icon: '🔍',
            description: 'A ripgrep-driven search engine. Lines are capped at 500 characters to prevent minified-code pollution, .git/ is excluded automatically, and permission-based ignore patterns filter sensitive paths before execution.',
            highlight: 'Multiline matching must be opted into — the performance cost of cross-line regex is an order of magnitude higher, so single-line matching is the default.',
            keyFn: 'GrepTool.call()',
          },
        ],
      },
      {
        name: 'Extensions',
        nameEn: 'Extensions',
        chapters: [
          {
            id: 8, title: 'Hooks', subtitle: 'Automation triggers', icon: '⚡',
            description: 'Custom logic fires on events like PreToolUse, PostToolUse, SessionStart, and FileChanged. 4 types (command/prompt/http/callback) across 3 sources (plugins/skills/settings), with automatic de-duplication.',
            highlight: 'Each event uses a different matching query — tool events match tool names, file events match paths — fine-grained and precise.',
            keyFn: 'getMatchingHooks()',
          },
          {
            id: 9, title: 'Skills', subtitle: 'Reusable superpowers', icon: '✨',
            description: 'The skill system behind slash commands. Key design: fork mode — complex skills run in an isolated sub-agent and return only the result, avoiding main-context pollution.',
            highlight: 'Usage frequency is tracked and used for intelligent sorting — your most-used slash commands appear closer to the top.',
            keyFn: 'SkillTool.call()',
          },
          {
            id: 10, title: 'Plugins', subtitle: 'Packaging your superpowers', icon: '📦',
            description: 'Supports the "name@marketplace" identifier, letting you target a specific marketplace or search all known ones (stopping at the first match). Installation has three scopes: user / project / local.',
            highlight: 'The plugin marketplace is extensible — third parties can run their own marketplaces by following the standard protocol.',
            keyFn: 'installPluginOp()',
          },
        ],
      },
      {
        name: 'Collaboration & Governance',
        nameEn: 'Collaboration & Governance',
        chapters: [
          {
            id: 11, title: 'Agents & Subagents', subtitle: 'The art of cloning', icon: '👥',
            description: "Sub-agents inherit the parent's context (filtering out unfinished tool calls), get an independent clone of the file-state cache, and can override the permission mode and tool set.",
            highlight: 'Read-only agents skip CLAUDE.md injection to save tokens — read-only work does not need project coding conventions.',
            keyFn: 'runAgent()',
          },
          {
            id: 12, title: 'Permissions & Safety', subtitle: 'The boundary of trust', icon: '🛡',
            description: 'A 7-stage permission waterfall: deny → ask → tool impl → safety → mode → allow → passthrough-to-ask. Each stage can allow, deny, or pass through.',
            highlight: 'Safety checks are bypass-immune — even in bypass mode, dangerous operations like accessing .git/ still require confirmation.',
            keyFn: 'hasPermissionsToUseToolInner()',
          },
          {
            id: 13, title: 'Configuration', subtitle: 'Customizing your Claude Code', icon: '⚙',
            description: 'An onion-model configuration hierarchy: settings → CLI args → command → session, layered override. The project root is locked at startup and does not change even when switching worktrees.',
            highlight: 'Rules from different layers "merge" rather than "replace" — a session can add allow rules without clearing the ones from settings.',
            keyFn: 'getAllowRules()',
          },
          {
            id: 15, title: 'Hidden Features', subtitle: 'Easter eggs and experimental features', icon: '🔮',
            description: 'KAIROS persistent logs, AutoDream background memory consolidation, UltraPlan remote deep planning, Coordinator multi-agent orchestration, Bridge remote control, Daemon background sessions.',
            highlight: 'Daemon mode runs background agents through Tmux and communicates via a mailbox — a real AI collaborator.',
            keyFn: '',
          },
        ],
      },
    ],
  },
} as const;

const categoryStyles = [
  { color: '#3b82f6', bgColor: '#eff6ff' },
  { color: '#22c55e', bgColor: '#f0fdf4' },
  { color: '#a855f7', bgColor: '#faf5ff' },
  { color: '#f59e0b', bgColor: '#fffbeb' },
  { color: '#ef4444', bgColor: '#fef2f2' },
];

interface Props {
  lang?: 'zh' | 'en';
}

export default function Claude101ChapterMap({ lang = 'zh' }: Props) {
  const s = strings[lang];
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedCh, setSelectedCh] = useState<number | null>(null);

  const cat = selectedCat !== null ? s.categories[selectedCat] : null;
  const catStyle = selectedCat !== null ? categoryStyles[selectedCat] : null;
  const ch = cat && selectedCh !== null ? cat.chapters[selectedCh] : null;

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · {s.headerLabel}
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
            {s.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
            {s.hint}
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px', minHeight: 280 }}>
          {/* Level 1: Category grid */}
          {!cat && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              maxWidth: 640, margin: '0 auto',
            }}>
              {s.categories.map((c, ci) => {
                const style = categoryStyles[ci];
                return (
                <div
                  key={c.name}
                  onClick={() => { setSelectedCat(ci); setSelectedCh(null); }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', gap: 6,
                    padding: '16px 14px',
                    background: `${style.color}08`,
                    border: `1px solid ${style.color}20`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = style.color;
                    (e.currentTarget as HTMLElement).style.background = `${style.color}12`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${style.color}20`;
                    (e.currentTarget as HTMLElement).style.background = `${style.color}08`;
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: style.color, flexShrink: 0,
                  }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: style.color }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {c.nameEn} · {c.chapters.length}{s.chaptersSuffix}
                  </div>
                </div>
              );})}
            </div>
          )}

          {/* Level 2: Chapter list */}
          {cat && catStyle && !ch && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <button
                onClick={() => { setSelectedCat(null); setSelectedCh(null); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 0', marginBottom: 12,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="10 2 4 8 10 14" />
                </svg>
                {s.backAll}
              </button>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: catStyle.color }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: catStyle.color }}>{cat.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{cat.nameEn}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cat.chapters.map((c, ci) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCh(ci)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px',
                      background: `${catStyle.color}06`,
                      border: `1px solid ${catStyle.color}18`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      borderLeft: `3px solid ${catStyle.color}`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = catStyle.color;
                      (e.currentTarget as HTMLElement).style.background = `${catStyle.color}12`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${catStyle.color}18`;
                      (e.currentTarget as HTMLElement).style.borderLeftColor = catStyle.color;
                      (e.currentTarget as HTMLElement).style.background = `${catStyle.color}06`;
                    }}
                  >
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {c.subtitle}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, color: catStyle.color,
                      border: `1px solid ${catStyle.color}40`, borderRadius: 4,
                      padding: '2px 8px', fontWeight: 500, fontFamily: 'monospace',
                    }}>
                      Ch.{String(c.id).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Level 3: Chapter detail */}
          {cat && catStyle && ch && (
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <button
                onClick={() => setSelectedCh(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 0', marginBottom: 12,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="10 2 4 8 10 14" />
                </svg>
                {s.backPrefix}{cat.name}
              </button>

              {/* Chapter header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 36 }}>{ch.icon}</span>
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)' }}>
                      {ch.title}
                    </span>
                    <span style={{
                      fontSize: 11, color: catStyle.color,
                      border: `1px solid ${catStyle.color}40`, borderRadius: 4,
                      padding: '2px 8px', fontWeight: 500, fontFamily: 'monospace',
                    }}>
                      Ch.{String(ch.id).padStart(2, '0')}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {ch.subtitle}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{
                fontSize: 14, lineHeight: 1.8,
                color: 'var(--c-text)', marginBottom: 16,
              }}>
                {ch.description}
              </div>

              {/* Key function */}
              {ch.keyFn && (
                <div style={{
                  display: 'inline-block',
                  padding: '6px 14px', marginBottom: 16,
                  background: `${catStyle.color}10`, borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 13,
                  color: catStyle.color, border: `1px solid ${catStyle.color}30`,
                  fontWeight: 600,
                }}>
                  {ch.keyFn}
                </div>
              )}

              {/* Highlight */}
              <div style={{
                padding: '14px 18px',
                background: `${catStyle.color}08`,
                borderRadius: 8,
                borderLeft: `4px solid ${catStyle.color}`,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: catStyle.color,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: 6,
                }}>
                  {s.highlightLabel}
                </div>
                <div style={{
                  fontSize: 13.5, lineHeight: 1.7,
                  color: 'var(--c-text)',
                }}>
                  {ch.highlight}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
