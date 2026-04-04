import { useState } from 'react';

interface FileEntry {
  name: string;
  size: string;
  role: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  desc: string;
  weight: number;
  files: FileEntry[];
}

const CATEGORIES: Category[] = [
  {
    id: 'core', name: '核心处理', color: '#3b82f6',
    desc: 'Agent Loop、查询生命周期、CLI 入口',
    weight: 5,
    files: [
      { name: 'main.tsx', size: '803KB', role: 'CLI 入口与主进程' },
      { name: 'query.ts', size: '68KB', role: '查询生命周期管理' },
      { name: 'QueryEngine.ts', size: '46KB', role: '核心查询引擎' },
      { name: 'messages.ts', size: '32KB', role: '消息处理与转换' },
    ],
  },
  {
    id: 'tools', name: '工具系统', color: '#22c55e',
    desc: '50+ 内置工具 + 实验性工具',
    weight: 5,
    files: [
      { name: 'AgentTool.ts', size: '233KB', role: '子 Agent 工具（最大文件）' },
      { name: 'BashTool.ts', size: '45KB', role: '命令行执行' },
      { name: 'FileEditTool.ts', size: '38KB', role: '文件编辑与差异' },
      { name: 'GrepTool.ts', size: '12KB', role: '代码搜索 (ripgrep)' },
      { name: 'ReadTool.ts', size: '15KB', role: '文件读取' },
      { name: 'WriteTool.ts', size: '10KB', role: '文件写入' },
    ],
  },
  {
    id: 'mcp', name: 'MCP 协议', color: '#a855f7',
    desc: 'MCP 客户端、认证、配置',
    weight: 4,
    files: [
      { name: 'client.ts', size: '119KB', role: 'MCP 客户端核心' },
      { name: 'auth.ts', size: '88KB', role: 'OAuth 认证流程' },
      { name: 'config.ts', size: '51KB', role: 'MCP 服务器配置' },
      { name: 'transport.ts', size: '28KB', role: '传输层 (stdio/SSE)' },
    ],
  },
  {
    id: 'ui', name: '用户界面', color: '#f59e0b',
    desc: '终端 UI、消息渲染、差异视图',
    weight: 3,
    files: [
      { name: 'MessageRender.tsx', size: '42KB', role: '消息渲染组件' },
      { name: 'DiffView.tsx', size: '35KB', role: '文件差异视图' },
      { name: 'Markdown.tsx', size: '22KB', role: 'Markdown 渲染' },
      { name: 'PermissionUI.tsx', size: '18KB', role: '权限确认弹窗' },
    ],
  },
  {
    id: 'permissions', name: '权限系统', color: '#ef4444',
    desc: '权限瀑布、规则引擎、沙箱',
    weight: 2,
    files: [
      { name: 'permissions.ts', size: '24KB', role: '权限瀑布核心' },
      { name: 'denialTracking.ts', size: '8KB', role: '拒绝追踪' },
      { name: 'sandbox.ts', size: '15KB', role: '沙箱执行环境' },
      { name: 'ruleEngine.ts', size: '12KB', role: '规则匹配引擎' },
    ],
  },
  {
    id: 'memory', name: '记忆系统', color: '#ec4899',
    desc: 'CLAUDE.md、Auto Memory、AutoDream',
    weight: 2,
    files: [
      { name: 'memdir.ts', size: '21KB', role: '记忆目录管理' },
      { name: 'claudemd.ts', size: '14KB', role: 'CLAUDE.md 解析' },
      { name: 'autoDream/', size: '—', role: '自动记忆整合' },
    ],
  },
  {
    id: 'bridge', name: '远程控制', color: '#06b6d4',
    desc: '远程控制、Bridge 协议、传输层',
    weight: 3,
    files: [
      { name: 'bridgeMain.ts', size: '2800+ 行', role: 'Bridge 主进程' },
      { name: 'transports/', size: '—', role: '多种传输实现' },
      { name: 'bridgeClient.ts', size: '18KB', role: 'Bridge 客户端' },
    ],
  },
  {
    id: 'swarm', name: '多智能体', color: '#f97316',
    desc: '团队协调、Tmux/iTerm 后端、收件箱',
    weight: 3,
    files: [
      { name: 'coordinator/', size: '—', role: '团队协调器' },
      { name: 'backends/', size: '—', role: 'Tmux / iTerm 后端' },
      { name: 'mailbox.ts', size: '16KB', role: '队友收件箱' },
      { name: 'swarmConfig.ts', size: '11KB', role: 'Swarm 配置' },
    ],
  },
];

export default function Claude101SourceMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedCat = CATEGORIES.find(c => c.id === selected) ?? null;

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Claude Code 源码结构
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: 0 }}>
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: 'var(--text)', textAlign: 'center',
          }}>
            Claude Code 源码架构
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-secondary)',
            textAlign: 'center', marginTop: 4,
            fontFamily: 'monospace', letterSpacing: '0.3px',
          }}>
            565+ 文件 · 200K+ 行代码 · 54 工具 · 72+ 命令
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px', minHeight: 200 }}>
          {!selectedCat ? (
            /* Grid view */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              maxWidth: 640, margin: '0 auto',
            }}>
              {CATEGORIES.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => setSelected(cat.id)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', gap: 6,
                    padding: '16px 14px',
                    background: `${cat.color}06`,
                    border: `1px solid ${cat.color}15`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}80`;
                    (e.currentTarget as HTMLElement).style.background = `${cat.color}12`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${cat.color}15`;
                    (e.currentTarget as HTMLElement).style.background = `${cat.color}06`;
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cat.color,
                  }} />
                  <div style={{
                    fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                    color: 'var(--c-text)',
                  }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {cat.desc}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Detail view */
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              <button
                onClick={() => setSelected(null)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontFamily: 'monospace', fontSize: 12,
                  color: 'var(--text-secondary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 0', marginBottom: 12,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="10 2 4 8 10 14" />
                </svg>
                返回
              </button>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedCat.color }} />
                <span style={{
                  fontFamily: 'monospace', fontSize: 16, fontWeight: 700,
                  color: 'var(--c-text)',
                }}>
                  {selectedCat.name}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                {selectedCat.desc}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedCat.files.map(file => (
                  <div key={file.name} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 2fr',
                    gap: 12, alignItems: 'center',
                    padding: '10px 14px',
                    background: `${selectedCat.color}06`,
                    borderRadius: 8,
                    borderLeft: `3px solid ${selectedCat.color}`,
                  }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 13, fontWeight: 600,
                      color: 'var(--c-text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {file.name}
                    </span>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 11,
                      color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                    }}>
                      {file.size}
                    </span>
                    <span style={{
                      fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right',
                    }}>
                      {file.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
