import { useState } from 'react';

const strings = {
  zh: {
    headerLabel: 'Claude Code 源码结构',
    title: 'Claude Code 源码架构',
    stats: '565+ 文件 · 200K+ 行代码 · 54 工具 · 72+ 命令',
    backLabel: '返回',
    categories: [
      {
        id: 'core', name: '核心处理',
        desc: 'Agent Loop、查询生命周期、CLI 入口',
        files: [
          { name: 'main.tsx', size: '803KB', role: 'CLI 入口与主进程' },
          { name: 'query.ts', size: '68KB', role: '查询生命周期管理' },
          { name: 'QueryEngine.ts', size: '46KB', role: '核心查询引擎' },
          { name: 'messages.ts', size: '32KB', role: '消息处理与转换' },
        ],
      },
      {
        id: 'tools', name: '工具系统',
        desc: '50+ 内置工具 + 实验性工具',
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
        id: 'mcp', name: 'MCP 协议',
        desc: 'MCP 客户端、认证、配置',
        files: [
          { name: 'client.ts', size: '119KB', role: 'MCP 客户端核心' },
          { name: 'auth.ts', size: '88KB', role: 'OAuth 认证流程' },
          { name: 'config.ts', size: '51KB', role: 'MCP 服务器配置' },
          { name: 'transport.ts', size: '28KB', role: '传输层 (stdio/SSE)' },
        ],
      },
      {
        id: 'ui', name: '用户界面',
        desc: '终端 UI、消息渲染、差异视图',
        files: [
          { name: 'MessageRender.tsx', size: '42KB', role: '消息渲染组件' },
          { name: 'DiffView.tsx', size: '35KB', role: '文件差异视图' },
          { name: 'Markdown.tsx', size: '22KB', role: 'Markdown 渲染' },
          { name: 'PermissionUI.tsx', size: '18KB', role: '权限确认弹窗' },
        ],
      },
      {
        id: 'permissions', name: '权限系统',
        desc: '权限瀑布、规则引擎、沙箱',
        files: [
          { name: 'permissions.ts', size: '24KB', role: '权限瀑布核心' },
          { name: 'denialTracking.ts', size: '8KB', role: '拒绝追踪' },
          { name: 'sandbox.ts', size: '15KB', role: '沙箱执行环境' },
          { name: 'ruleEngine.ts', size: '12KB', role: '规则匹配引擎' },
        ],
      },
      {
        id: 'memory', name: '记忆系统',
        desc: 'CLAUDE.md、Auto Memory、AutoDream',
        files: [
          { name: 'memdir.ts', size: '21KB', role: '记忆目录管理' },
          { name: 'claudemd.ts', size: '14KB', role: 'CLAUDE.md 解析' },
          { name: 'autoDream/', size: '—', role: '自动记忆整合' },
        ],
      },
      {
        id: 'bridge', name: '远程控制',
        desc: '远程控制、Bridge 协议、传输层',
        files: [
          { name: 'bridgeMain.ts', size: '2800+ 行', role: 'Bridge 主进程' },
          { name: 'transports/', size: '—', role: '多种传输实现' },
          { name: 'bridgeClient.ts', size: '18KB', role: 'Bridge 客户端' },
        ],
      },
      {
        id: 'swarm', name: '多智能体',
        desc: '团队协调、Tmux/iTerm 后端、收件箱',
        files: [
          { name: 'coordinator/', size: '—', role: '团队协调器' },
          { name: 'backends/', size: '—', role: 'Tmux / iTerm 后端' },
          { name: 'mailbox.ts', size: '16KB', role: '队友收件箱' },
          { name: 'swarmConfig.ts', size: '11KB', role: 'Swarm 配置' },
        ],
      },
    ],
  },
  en: {
    headerLabel: 'Claude Code Source Layout',
    title: 'Claude Code Source Architecture',
    stats: '565+ files · 200K+ LOC · 54 tools · 72+ commands',
    backLabel: 'Back',
    categories: [
      {
        id: 'core', name: 'Core Processing',
        desc: 'Agent Loop, query lifecycle, CLI entry',
        files: [
          { name: 'main.tsx', size: '803KB', role: 'CLI entry and main process' },
          { name: 'query.ts', size: '68KB', role: 'Query lifecycle management' },
          { name: 'QueryEngine.ts', size: '46KB', role: 'Core query engine' },
          { name: 'messages.ts', size: '32KB', role: 'Message processing and transformation' },
        ],
      },
      {
        id: 'tools', name: 'Tool System',
        desc: '50+ built-in tools + experimental tools',
        files: [
          { name: 'AgentTool.ts', size: '233KB', role: 'Sub-agent tool (largest file)' },
          { name: 'BashTool.ts', size: '45KB', role: 'Command-line execution' },
          { name: 'FileEditTool.ts', size: '38KB', role: 'File editing and diffs' },
          { name: 'GrepTool.ts', size: '12KB', role: 'Code search (ripgrep)' },
          { name: 'ReadTool.ts', size: '15KB', role: 'File reading' },
          { name: 'WriteTool.ts', size: '10KB', role: 'File writing' },
        ],
      },
      {
        id: 'mcp', name: 'MCP Protocol',
        desc: 'MCP client, auth, config',
        files: [
          { name: 'client.ts', size: '119KB', role: 'MCP client core' },
          { name: 'auth.ts', size: '88KB', role: 'OAuth auth flow' },
          { name: 'config.ts', size: '51KB', role: 'MCP server configuration' },
          { name: 'transport.ts', size: '28KB', role: 'Transport layer (stdio/SSE)' },
        ],
      },
      {
        id: 'ui', name: 'User Interface',
        desc: 'Terminal UI, message render, diff view',
        files: [
          { name: 'MessageRender.tsx', size: '42KB', role: 'Message render component' },
          { name: 'DiffView.tsx', size: '35KB', role: 'File diff view' },
          { name: 'Markdown.tsx', size: '22KB', role: 'Markdown rendering' },
          { name: 'PermissionUI.tsx', size: '18KB', role: 'Permission confirmation dialog' },
        ],
      },
      {
        id: 'permissions', name: 'Permission System',
        desc: 'Permission waterfall, rule engine, sandbox',
        files: [
          { name: 'permissions.ts', size: '24KB', role: 'Permission waterfall core' },
          { name: 'denialTracking.ts', size: '8KB', role: 'Denial tracking' },
          { name: 'sandbox.ts', size: '15KB', role: 'Sandbox execution environment' },
          { name: 'ruleEngine.ts', size: '12KB', role: 'Rule matching engine' },
        ],
      },
      {
        id: 'memory', name: 'Memory System',
        desc: 'CLAUDE.md, Auto Memory, AutoDream',
        files: [
          { name: 'memdir.ts', size: '21KB', role: 'Memory directory management' },
          { name: 'claudemd.ts', size: '14KB', role: 'CLAUDE.md parsing' },
          { name: 'autoDream/', size: '—', role: 'Auto memory consolidation' },
        ],
      },
      {
        id: 'bridge', name: 'Remote Control',
        desc: 'Remote control, Bridge protocol, transport layer',
        files: [
          { name: 'bridgeMain.ts', size: '2800+ lines', role: 'Bridge main process' },
          { name: 'transports/', size: '—', role: 'Multiple transport implementations' },
          { name: 'bridgeClient.ts', size: '18KB', role: 'Bridge client' },
        ],
      },
      {
        id: 'swarm', name: 'Multi-Agent',
        desc: 'Team coordination, Tmux/iTerm backends, inbox',
        files: [
          { name: 'coordinator/', size: '—', role: 'Team coordinator' },
          { name: 'backends/', size: '—', role: 'Tmux / iTerm backends' },
          { name: 'mailbox.ts', size: '16KB', role: 'Teammate inbox' },
          { name: 'swarmConfig.ts', size: '11KB', role: 'Swarm configuration' },
        ],
      },
    ],
  },
} as const;

const categoryColors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

interface Props {
  lang?: 'zh' | 'en';
}

export default function Claude101SourceMap({ lang = 'zh' }: Props) {
  const s = strings[lang];
  const [selected, setSelected] = useState<string | null>(null);
  const selectedIdx = selected ? s.categories.findIndex(c => c.id === selected) : -1;
  const selectedCat = selectedIdx >= 0 ? s.categories[selectedIdx] : null;
  const selectedColor = selectedIdx >= 0 ? categoryColors[selectedIdx] : '';

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · {s.headerLabel}
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: 0 }}>
        <div style={{ padding: '24px 28px 0' }}>
          <div style={{
            fontSize: 18, fontWeight: 700,
            color: 'var(--text)', textAlign: 'center',
          }}>
            {s.title}
          </div>
          <div style={{
            fontSize: 12, color: 'var(--text-secondary)',
            textAlign: 'center', marginTop: 4,
            fontFamily: 'monospace', letterSpacing: '0.3px',
          }}>
            {s.stats}
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
              {s.categories.map((cat, i) => {
                const color = categoryColors[i];
                return (
                <div
                  key={cat.id}
                  onClick={() => setSelected(cat.id)}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-start', gap: 6,
                    padding: '16px 14px',
                    background: `${color}06`,
                    border: `1px solid ${color}15`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${color}80`;
                    (e.currentTarget as HTMLElement).style.background = `${color}12`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${color}15`;
                    (e.currentTarget as HTMLElement).style.background = `${color}06`;
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color,
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
              );})}
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
                {s.backLabel}
              </button>

              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: selectedColor }} />
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
                    background: `${selectedColor}06`,
                    borderRadius: 8,
                    borderLeft: `3px solid ${selectedColor}`,
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
