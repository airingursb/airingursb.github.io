const strings = {
  zh: {
    headerLabel: 'Memory 安全机制',
    title: 'Memory 安全：三层防护',
    safeWrite: '安全写入',
    footer: '堵死一切"借记忆功能偷偷写到不该写的地方"的可能',
    layers: [
      {
        title: '第一层',
        subtitle: '全局锁定',
        desc: '存储路径只能全局改',
        annotation: '项目不能改路径，防止恶意仓库劫持',
      },
      {
        title: '第二层',
        subtitle: '路径校验',
        desc: '拦截越权路径',
        annotation: '用 .. 往上跳？拦截。指向根目录？拦截',
      },
      {
        title: '第三层',
        subtitle: '沙箱白名单',
        desc: '名单外直接拒绝',
        annotation: 'Agent 在沙箱中运行，写入操作逐一校验',
      },
    ],
  },
  en: {
    headerLabel: 'Memory Security',
    title: 'Memory Security: Three-Layer Defense',
    safeWrite: 'Safe Write',
    footer: 'Blocks every attempt to "sneak a write through the memory feature"',
    layers: [
      {
        title: 'Layer 1',
        subtitle: 'Global Lockdown',
        desc: 'Storage path only changeable globally',
        annotation: 'Projects cannot change the path, preventing hijack by malicious repos',
      },
      {
        title: 'Layer 2',
        subtitle: 'Path Validation',
        desc: 'Blocks escaping paths',
        annotation: 'Climbing up with ..? Blocked. Pointing at root? Blocked',
      },
      {
        title: 'Layer 3',
        subtitle: 'Sandbox Allowlist',
        desc: 'Outside the list, rejected',
        annotation: 'Agent runs in a sandbox; every write is checked one by one',
      },
    ],
  },
} as const;

const layerStyles = [
  { color: '#c09a3e', bg: '#fdf9ed' },
  { color: '#4a80b0', bg: '#e8f0fa' },
  { color: '#4a9a6a', bg: '#e8f5ee' },
];

interface Props {
  lang?: 'zh' | 'en';
}

export default function MemorySecurityFlow({ lang = 'zh' }: Props) {
  const s = strings[lang];
  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · {s.headerLabel}
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {s.title}
          </div>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Security layers */}
          <div style={{
            display: 'flex', gap: 0, alignItems: 'stretch',
            flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {s.layers.map((layer, i) => {
              const style = layerStyles[i];
              return (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && (
                  <div style={{ padding: '0 6px', color: 'var(--c-border)', fontSize: 20 }}>→</div>
                )}
                <div style={{
                  padding: '16px 20px',
                  border: `1.5px solid ${style.color}`,
                  borderRadius: 10,
                  background: style.bg,
                  textAlign: 'center',
                  minWidth: 130,
                  flex: '1 1 130px',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: style.color }}>{layer.title}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', marginTop: 4 }}>{layer.subtitle}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{layer.desc}</div>
                </div>
              </div>
            );})}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ padding: '0 6px', color: 'var(--c-border)', fontSize: 20 }}>→</div>
              <div style={{
                padding: '16px 20px',
                border: '1.5px solid #808080',
                borderRadius: 10,
                background: '#f5f5f5',
                textAlign: 'center',
                minWidth: 80,
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4a9a6a' }}>{s.safeWrite}</div>
              </div>
            </div>
          </div>

          {/* Annotations */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12, marginTop: 12, paddingRight: 90,
          }}>
            {s.layers.map((layer, i) => (
              <div key={i} style={{
                fontSize: 11, color: 'var(--text-secondary)',
                textAlign: 'center', fontStyle: 'italic',
              }}>
                {layer.annotation}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 16, textAlign: 'center',
            fontSize: 13, fontStyle: 'italic', color: '#b05050',
            fontWeight: 500,
          }}>
            {s.footer}
          </div>
        </div>
      </div>
    </div>
  );
}
