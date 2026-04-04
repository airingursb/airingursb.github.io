import { useState } from 'react';

interface Subsystem {
  name: string;
  subtitle: string;
  description: string;
}

interface Layer {
  name: string;
  color: string;
  bgColor: string;
  subsystems: Subsystem[];
}

const layers: Layer[] = [
  {
    name: '能力层',
    color: '#4a9a6a',
    bgColor: '#e8f5ee',
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
    color: '#c09a3e',
    bgColor: '#fdf3e0',
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
    color: '#4a80b0',
    bgColor: '#e8f0fa',
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
    color: '#808080',
    bgColor: '#f0f0f0',
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
];

export default function SubsystemExplorer() {
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
            10 大子系统 · 4 层架构
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            点击层级和子系统查看详细说明
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {layers.map((layer, li) => {
            const isLayerActive = activeLayer === li;
            return (
              <div key={layer.name} style={{ marginBottom: li < layers.length - 1 ? 8 : 0 }}>
                {/* Layer header */}
                <div
                  onClick={() => {
                    setActiveLayer(isLayerActive ? null : li);
                    setActiveSub(null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    background: isLayerActive ? layer.bgColor : 'transparent',
                    border: `1.5px solid ${isLayerActive ? layer.color : 'var(--border)'}`,
                    borderRadius: isLayerActive ? '10px 10px 0 0' : 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: layer.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: layer.color, flex: 1 }}>
                    {layer.name}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {layer.subsystems.length} 个子系统
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
                    border: `1.5px solid ${layer.color}`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    background: layer.bgColor,
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
                              background: isSubActive ? `${layer.color}15` : 'transparent',
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 600, color: layer.color }}>
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
                              background: `${layer.color}08`,
                              borderRadius: '0 0 8px 8px',
                              borderTop: `1px solid ${layer.color}20`,
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
