import { useState } from 'react';

interface MemoryLayer {
  name: string;
  tags: { label: string; color: string }[];
  description: string;
  annotation?: string;
  highlight?: boolean;
  scope: string;
}

const layers: MemoryLayer[] = [
  {
    name: 'CLAUDE.md',
    tags: [
      { label: '用户编写', color: '#c09a3e' },
      { label: '始终加载', color: '#4a9a6a' },
    ],
    description:
      '由用户控制的编码风格、偏好、SOP 等层面的配置文件。当与 CC 开启会话时，Claude.md 文件内容会立即被加载。当 Claude 遍历层级文件夹结构时，可以加载多个 Claude.md 文件。',
    annotation: '不做摘要，不做引用。原始文本直接注入。',
    scope: '跨会话 / 全局级别',
  },
  {
    name: '会话记忆',
    tags: [{ label: 'FEATURE-GATED', color: '#b05050' }],
    description:
      '一种结构化的 markdown，由后台 Agent 在对话进行过程中动态构建和更新。它的最终使用者并非用户，而是一种压缩策略。当对话接近上下文窗口 85% 时，对话内容会被总结，这一过程将实时进行。',
    annotation: 'gated behind tengu_session_memory',
    scope: '单次会话 / 当前会话内',
  },
  {
    name: '对话聊天历史',
    tags: [{ label: 'cost: zero', color: '#808080' }],
    description:
      '以 JSONL 格式存储的对话中所有用户 query 和 Claude 回复的记录。可以通过 /export 命令导出这份记忆。每个项目上限为 100 条。大型粘贴内容会经过哈希处理并单独存储，以保持日志的简洁性。',
    annotation: '最普通的一层',
    scope: '单次会话 / 当前会话内',
  },
  {
    name: '团队记忆',
    tags: [],
    description: '通过服务器同步在用户间共享。上传前会进行密钥扫描。',
    annotation: 'boring. 不是讨论的重点。',
    scope: '跨会话 / 全局级别',
  },
  {
    name: '自动记忆',
    tags: [{ label: '本文的重点', color: '#b05050' }],
    description:
      '这是 CC 从多次对话中学习用户信息的地方：角色、偏好、项目上下文以及外部系统的指引。存储为本地 .md 文件，带有 YAML frontmatter。',
    annotation: '4 种类型: user / feedback / project / ref',
    highlight: true,
    scope: '跨会话 / 全局级别',
  },
];

export default function MemoryLayers() {
  const [activeLayer, setActiveLayer] = useState<number | null>(4);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Memory 5 层架构
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            Memory 5 层架构
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            点击各层查看详细说明
          </div>
        </div>

        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {/* Scope labels */}
          <div style={{ display: 'flex', gap: 0 }}>
            <div style={{
              writingMode: 'vertical-rl', textOrientation: 'mixed',
              fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.1em',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingRight: 8, width: 32,
            }}>
              单次会话
            </div>
            <div style={{ flex: 1 }}>
              {layers.map((layer, i) => {
                const isActive = activeLayer === i;
                const borderColor = layer.highlight ? '#b05050' : 'var(--c-border)';
                const activeBorder = layer.highlight ? '#b05050' : '#c09a3e';
                return (
                  <div key={layer.name} style={{ marginBottom: 8 }}>
                    {i === 3 && (
                      <div style={{
                        borderTop: '2px dashed var(--c-border)',
                        margin: '12px 0',
                        position: 'relative',
                      }}>
                        <span style={{
                          position: 'absolute', top: -9, left: 0,
                          fontSize: 10, color: 'var(--text-secondary)',
                          background: 'var(--c-bg, #fff)', padding: '0 6px',
                        }}>
                          ↓ 跨会话 / 全局级别
                        </span>
                      </div>
                    )}
                    <div
                      onClick={() => setActiveLayer(isActive ? null : i)}
                      style={{
                        padding: '14px 18px',
                        border: `1.5px solid ${isActive ? activeBorder : borderColor}`,
                        borderRadius: isActive ? '10px 10px 0 0' : 10,
                        background: layer.highlight
                          ? (isActive ? '#fdf0ef' : '#fdf8f6')
                          : (isActive ? '#fdf9ed' : 'transparent'),
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 15, fontWeight: 700,
                          color: layer.highlight ? '#b05050' : 'var(--c-text)',
                        }}>
                          {layer.highlight && <span style={{ marginRight: 6 }}>■</span>}
                          {layer.name}
                        </span>
                        {layer.tags.map(tag => (
                          <span key={tag.label} style={{
                            fontSize: 11, color: tag.color,
                            border: `1px solid ${tag.color}40`,
                            borderRadius: 4, padding: '2px 8px',
                            fontWeight: 500,
                          }}>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {isActive && (
                      <div style={{
                        padding: '14px 18px',
                        border: `1.5px solid ${layer.highlight ? '#b05050' : activeBorder}`,
                        borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                        background: layer.highlight ? '#fdf8f6' : '#fdf9ed',
                      }}>
                        <div style={{
                          fontSize: 13.5, lineHeight: 1.8,
                          color: 'var(--c-text)',
                        }}>
                          {layer.description}
                        </div>
                        {layer.annotation && (
                          <div style={{
                            marginTop: 10, textAlign: 'right',
                            fontSize: 12, fontStyle: 'italic',
                            color: layer.highlight ? '#b05050' : '#c09a3e',
                          }}>
                            {layer.annotation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Storage path */}
          <div style={{
            marginTop: 16, padding: '10px 14px',
            background: 'var(--c-bg, #fff)',
            border: '1px solid var(--c-border)',
            borderRadius: 8, textAlign: 'center',
          }}>
            <code style={{ fontSize: 13, color: 'var(--c-text)' }}>
              ~/.claude/projects/&lt;slug&gt;/memory/
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
