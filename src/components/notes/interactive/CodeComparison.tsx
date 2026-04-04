import { useState, useEffect } from 'react';

const stats = [
  { label: '工具覆盖率', value: '98%', color: '#4a9a6a' },
  { label: '代码精简倍数', value: '44x', color: '#4a80b0' },
  { label: '单元测试通过', value: '114', color: '#8b6040' },
  { label: 'CLI 命令', value: '54', color: '#7a60b0' },
];

export default function CodeComparison() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const claudeWidth = 680;
  const ohWidth = animated ? Math.round(claudeWidth * (11733 / 512664)) : 0;

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Code Comparison
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            代码量对比：44x 更轻量
          </div>
        </div>

        {/* Bar comparison */}
        <div style={{ maxWidth: 720, margin: '0 auto 24px' }}>
          {/* Claude Code bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', width: 110, flexShrink: 0 }}>Claude Code</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{
                  height: 36, borderRadius: 6,
                  background: 'linear-gradient(90deg, #d4a0a0, #c08888)',
                  width: animated ? claudeWidth : 0,
                  maxWidth: '100%',
                  transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 12, color: '#6b3030', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    512,664 行 · 1,884 文件 · TypeScript
                  </span>
                </div>
              </div>
            </div>

            {/* OpenHarness bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', width: 110, flexShrink: 0 }}>OpenHarness</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <div style={{
                  height: 36, borderRadius: 6,
                  background: 'linear-gradient(90deg, #7dcea0, #5bb880)',
                  width: animated ? Math.max(ohWidth, 220) : 0,
                  transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
                  display: 'flex', alignItems: 'center', paddingLeft: 12,
                }}>
                  <span style={{ fontSize: 12, color: '#1a5a3a', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    11,733 行 · 163 文件 · Python
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          maxWidth: 720, margin: '0 auto 20px',
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '14px 8px',
              borderRadius: 8, border: `1.5px solid ${s.color}40`,
              background: `${s.color}10`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: 4 }}>
            The model is the agent. The code is the harness.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7 }}>
            by HKUDS · MIT License · Python ≥3.11
          </div>
        </div>
      </div>
    </div>
  );
}
