import { useState } from 'react';

const strings = {
  zh: {
    title: '10 大子系统 · 4 层架构',
    hint: '点击层级和子系统查看详细说明',
    subsystemCountSuffix: '个子系统',
    layers: [
      {
        name: '能力层',
        subsystems: [
          {
            name: 'Tools (43+)',
            subtitle: 'File, Shell, Web, MCP',
            description: '覆盖文件读写（Read / Write / Edit / Glob / Grep）、Shell 执行（Bash）、Web 搜索与抓取、MCP 工具调用等 43+ 种工具。这是 Agent 的"手"——所有与外部世界交互的能力都在这里。OpenHarness 实现了 Claude Code 44 个工具中的 43 个，覆盖率 98%。',
          },
          {
            name: 'Skills（按需知识）',
            subtitle: '40+ .md 技能文件',
            description: '技能系统是一套按需加载的 .md 知识文件。当 Agent 遇到特定场景（如 TDD、调试、代码审查），会加载对应的技能文件来指导行为。这相当于给 Agent 装上了"方法论"——不只是能做，还知道怎么做才好。',
          },
          {
            name: 'Plugins（插件）',
            subtitle: '兼容 claude-code',
            description: '插件系统兼容 Claude Code 的官方插件生态。第三方开发者可以打包自己的工具和技能，以插件形式分发。这让 Harness 的能力可以不断扩展，而不需要修改核心代码。',
          },
        ],
      },
      {
        name: '安全 / 控制层',
        subsystems: [
          {
            name: 'Permissions',
            subtitle: 'Default / Auto / Plan',
            description: '三级权限模式：Default 模式下每次工具调用都需要用户确认；Auto 模式自动批准安全操作；Plan 模式只允许读取和规划，不执行修改。这是 Agent 的"安全边界"——确保 Agent 不会在未经授权的情况下做出危险操作。',
          },
          {
            name: 'Hooks（生命周期）',
            subtitle: 'Pre/Post ToolUse',
            description: '生命周期 Hook 系统，允许在工具调用前后插入自定义逻辑。比如在每次文件写入前自动运行 linter，或在 Git 操作后自动触发 CI。这让用户可以把自己的工作流规则编码到 Agent 的行为中。',
          },
          {
            name: 'Commands (54)',
            subtitle: '/help /commit /plan …',
            description: '54 个 CLI 命令，涵盖帮助（/help）、提交（/commit）、规划（/plan）、记忆管理等。这些命令是用户与 Agent 交互的快捷方式，类似于 IDE 的命令面板。',
          },
        ],
      },
      {
        name: '协作 / 扩展层',
        subsystems: [
          {
            name: 'MCP 协议',
            subtitle: '外部工具集成',
            description: 'Model Context Protocol——标准化的外部工具集成协议。通过 MCP，Agent 可以连接数据库、日历、项目管理工具等任意外部服务。这把 Agent 从"只能操作本地文件"升级到"能与整个工具链协作"。',
          },
          {
            name: 'Memory（记忆）',
            subtitle: '跨会话持久化',
            description: '跨会话的记忆持久化系统。Agent 可以记住用户的偏好、项目上下文、之前的决策和反馈。下次对话时无需重新解释背景，Agent 已经"认识你"了。这是实现长期协作的关键基础设施。',
          },
          {
            name: 'Coordinator',
            subtitle: '多 Agent 协作',
            description: '多 Agent 协作子系统。当任务足够复杂时，可以派生多个子 Agent 并行工作——一个负责搜索代码，一个负责写测试，一个负责审查。Coordinator 负责分配任务、汇总结果、解决冲突。',
          },
        ],
      },
      {
        name: '基础设施层',
        subsystems: [
          {
            name: 'Config（配置）',
            subtitle: '多层级设置迁移',
            description: '多层级的配置系统，支持全局、项目、会话三个层级的设置。配置可以继承和覆盖，并且支持版本迁移。这确保了不同项目可以有不同的 Agent 行为，而不需要每次都重新配置。',
          },
          {
            name: 'React TUI',
            subtitle: 'Ink 终端交互界面',
            description: '基于 React + Ink 的终端 UI 框架。用 React 的组件化思维来构建终端界面——Markdown 渲染、语法高亮、进度条、交互式选择器都是 React 组件。这让终端 UI 的开发体验接近 Web 开发。',
          },
        ],
      },
    ],
  },
  en: {
    title: '10 Subsystems · 4-Layer Architecture',
    hint: 'Click a layer and subsystem for details',
    subsystemCountSuffix: ' subsystems',
    layers: [
      {
        name: 'Capability Layer',
        subsystems: [
          {
            name: 'Tools (43+)',
            subtitle: 'File, Shell, Web, MCP',
            description: 'Covers file I/O (Read / Write / Edit / Glob / Grep), shell execution (Bash), web search and fetch, MCP tool calls — 43+ tools in all. These are the Agent\'s "hands," where every capability to touch the outside world lives. OpenHarness implements 43 of Claude Code\'s 44 tools — 98% coverage.',
          },
          {
            name: 'Skills (On-Demand Knowledge)',
            subtitle: '40+ .md skill files',
            description: 'The skill system is a set of .md knowledge files loaded on demand. When the Agent hits a specific scenario (TDD, debugging, code review), the matching skill file is loaded to guide behavior. It gives the Agent a "methodology" — not just what it can do, but how to do it well.',
          },
          {
            name: 'Plugins',
            subtitle: 'Compatible with claude-code',
            description: "The plugin system is compatible with Claude Code's official plugin ecosystem. Third-party developers can package their own tools and skills and distribute them as plugins, letting the Harness's capabilities grow without touching the core.",
          },
        ],
      },
      {
        name: 'Safety / Control Layer',
        subsystems: [
          {
            name: 'Permissions',
            subtitle: 'Default / Auto / Plan',
            description: 'Three permission modes: Default asks the user to confirm every tool call; Auto automatically approves safe operations; Plan only allows reading and planning, never execution. This is the Agent\'s "safety boundary" — it keeps the Agent from taking dangerous actions without authorization.',
          },
          {
            name: 'Hooks (Lifecycle)',
            subtitle: 'Pre/Post ToolUse',
            description: 'A lifecycle hook system that lets you inject custom logic before and after tool calls. For example, run a linter automatically before every file write, or fire CI after every Git operation. It lets users encode their own workflow rules into the Agent\'s behavior.',
          },
          {
            name: 'Commands (54)',
            subtitle: '/help /commit /plan …',
            description: '54 CLI commands for help (/help), committing (/commit), planning (/plan), memory management, and more. They are shortcuts for interacting with the Agent, similar to an IDE command palette.',
          },
        ],
      },
      {
        name: 'Collaboration / Extension Layer',
        subsystems: [
          {
            name: 'MCP Protocol',
            subtitle: 'External tool integration',
            description: 'Model Context Protocol — a standardized protocol for integrating external tools. Through MCP, the Agent can connect to databases, calendars, project management tools, or any other external service. It upgrades the Agent from "only operating local files" to "collaborating with the entire toolchain."',
          },
          {
            name: 'Memory',
            subtitle: 'Cross-session persistence',
            description: 'A cross-session memory persistence system. The Agent remembers user preferences, project context, past decisions, and feedback. Next time you talk, you do not need to re-explain the background — the Agent already "knows you." It is the key infrastructure for long-term collaboration.',
          },
          {
            name: 'Coordinator',
            subtitle: 'Multi-agent collaboration',
            description: 'The multi-agent collaboration subsystem. When a task is complex enough, sub-agents can be spawned to work in parallel — one searching code, one writing tests, one reviewing. The Coordinator assigns tasks, aggregates results, and resolves conflicts.',
          },
        ],
      },
      {
        name: 'Infrastructure Layer',
        subsystems: [
          {
            name: 'Config',
            subtitle: 'Multi-level settings migration',
            description: 'A multi-level configuration system with global, project, and session tiers. Settings can inherit and override, and version migration is supported. This lets different projects run with different Agent behaviors without reconfiguring from scratch every time.',
          },
          {
            name: 'React TUI',
            subtitle: 'Ink-based terminal UI',
            description: 'A terminal UI framework built on React + Ink. Terminal interfaces are built the React way — Markdown rendering, syntax highlighting, progress bars, interactive pickers are all React components. It makes terminal UI development feel like web development.',
          },
        ],
      },
    ],
  },
} as const;

const layerStyles = [
  { color: '#4a9a6a', bgColor: '#e8f5ee' },
  { color: '#c09a3e', bgColor: '#fdf3e0' },
  { color: '#4a80b0', bgColor: '#e8f0fa' },
  { color: '#808080', bgColor: '#f0f0f0' },
];

interface Props {
  lang?: 'zh' | 'en';
}

export default function SubsystemExplorer({ lang = 'zh' }: Props) {
  const s = strings[lang];
  const [activeLayer, setActiveLayer] = useState<number | null>(0);
  const [activeSub, setActiveSub] = useState<number | null>(null);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Subsystem Explorer
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {s.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {s.hint}
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {s.layers.map((layer, li) => {
            const isLayerActive = activeLayer === li;
            const style = layerStyles[li];
            return (
              <div key={layer.name} style={{ marginBottom: li < s.layers.length - 1 ? 8 : 0 }}>
                {/* Layer header */}
                <div
                  onClick={() => {
                    setActiveLayer(isLayerActive ? null : li);
                    setActiveSub(null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: isLayerActive ? style.bgColor : 'transparent',
                    border: `1.5px solid ${isLayerActive ? style.color : 'var(--border)'}`,
                    borderRadius: isLayerActive ? '10px 10px 0 0' : 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: style.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: style.color, flex: 1 }}>
                    {layer.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {layer.subsystems.length}{s.subsystemCountSuffix}
                  </span>
                  <span style={{
                    fontSize: 16, color: 'var(--text-secondary)',
                    transform: isLayerActive ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }}>▾</span>
                </div>

                {/* Subsystems */}
                {isLayerActive && (
                  <div style={{
                    border: `1.5px solid ${style.color}`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    background: style.bgColor,
                    padding: '8px',
                  }}>
                    {layer.subsystems.map((sub, si) => {
                      const isSubActive = activeSub === si;
                      return (
                        <div key={sub.name} style={{ marginBottom: si < layer.subsystems.length - 1 ? 6 : 0 }}>
                          <div
                            onClick={() => setActiveSub(isSubActive ? null : si)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '10px 12px',
                              borderRadius: isSubActive ? '8px 8px 0 0' : 8,
                              background: isSubActive ? `${style.color}15` : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 600, color: style.color }}>
                              {sub.name}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
                              {sub.subtitle}
                            </span>
                            <span style={{
                              fontSize: 14, color: 'var(--text-secondary)',
                              transform: isSubActive ? 'rotate(90deg)' : 'none',
                              transition: 'transform 0.15s',
                            }}>›</span>
                          </div>

                          {isSubActive && (
                            <div style={{
                              padding: '12px 14px',
                              fontSize: 13.5, lineHeight: 1.7,
                              color: 'var(--text)',
                              background: `${style.color}08`,
                              borderRadius: '0 0 8px 8px',
                              borderTop: `1px solid ${style.color}20`,
                            }}>
                              {sub.description}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
