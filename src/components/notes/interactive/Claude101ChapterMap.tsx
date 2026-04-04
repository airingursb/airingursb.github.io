import { useState } from 'react';

interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  highlight: string;
  keyFn?: string;
}

interface Category {
  name: string;
  nameEn: string;
  color: string;
  bgColor: string;
  weight: number;
  chapters: Chapter[];
}

const categories: Category[] = [
  {
    name: '基础概念',
    nameEn: 'Fundamentals',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    weight: 5,
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
    color: '#22c55e',
    bgColor: '#f0fdf4',
    weight: 5,
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
    color: '#a855f7',
    bgColor: '#faf5ff',
    weight: 3,
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
    color: '#f59e0b',
    bgColor: '#fffbeb',
    weight: 4,
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
    color: '#ef4444',
    bgColor: '#fef2f2',
    weight: 5,
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
      },
    ],
  },
];

export default function Claude101ChapterMap() {
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [selectedCh, setSelectedCh] = useState<number | null>(null);

  const cat = selectedCat !== null ? categories[selectedCat] : null;
  const ch = cat && selectedCh !== null ? cat.chapters[selectedCh] : null;

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 16 章课程地图
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', textAlign: 'center' }}>
            5 大分类 · 16 章深度解析
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 4 }}>
            点击分类进入 → 点击章节查看亮点
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
              {categories.map((c, ci) => (
                <div
                  key={c.name}
                  onClick={() => { setSelectedCat(ci); setSelectedCh(null); }}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', gap: 6,
                    padding: '16px 14px',
                    background: `${c.color}08`,
                    border: `1px solid ${c.color}20`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    gridColumn: c.weight >= 5 ? 'span 1' : 'span 1',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = c.color;
                    (e.currentTarget as HTMLElement).style.background = `${c.color}12`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${c.color}20`;
                    (e.currentTarget as HTMLElement).style.background = `${c.color}08`;
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c.color, flexShrink: 0,
                  }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.color }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {c.nameEn} · {c.chapters.length} 章
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Level 2: Chapter list */}
          {cat && !ch && (
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
                返回全景
              </button>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: cat.color }}>{cat.name}</span>
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
                      background: `${cat.color}06`,
                      border: `1px solid ${cat.color}18`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      borderLeft: `3px solid ${cat.color}`,
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = cat.color;
                      (e.currentTarget as HTMLElement).style.background = `${cat.color}12`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}18`;
                      (e.currentTarget as HTMLElement).style.borderLeftColor = cat.color;
                      (e.currentTarget as HTMLElement).style.background = `${cat.color}06`;
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
                      fontSize: 11, color: cat.color,
                      border: `1px solid ${cat.color}40`, borderRadius: 4,
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
          {cat && ch && (
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
                返回 {cat.name}
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
                      fontSize: 11, color: cat.color,
                      border: `1px solid ${cat.color}40`, borderRadius: 4,
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
                  background: `${cat.color}10`, borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 13,
                  color: cat.color, border: `1px solid ${cat.color}30`,
                  fontWeight: 600,
                }}>
                  {ch.keyFn}
                </div>
              )}

              {/* Highlight */}
              <div style={{
                padding: '14px 18px',
                background: `${cat.color}08`,
                borderRadius: 8,
                borderLeft: `4px solid ${cat.color}`,
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: cat.color,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: 6,
                }}>
                  Highlight
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
