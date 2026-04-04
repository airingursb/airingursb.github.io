const stack = [
  {
    category: '框架',
    items: [
      { name: 'Astro 6', desc: '岛屿架构，零 JS 首屏', color: '#ff5d01' },
      { name: 'React 19', desc: '交互组件，按需水合', color: '#61dafb' },
    ],
  },
  {
    category: '内容',
    items: [
      { name: 'MDX', desc: 'Markdown + React 组件', color: '#fcb32c' },
      { name: 'TypeScript', desc: '严格模式，类型安全', color: '#3178c6' },
    ],
  },
  {
    category: '动画',
    items: [
      { name: 'Framer Motion', desc: 'React 动画库', color: '#e855c3' },
      { name: 'GSAP', desc: '专业级复杂动画', color: '#88ce02' },
    ],
  },
  {
    category: '样式',
    items: [
      { name: 'Tailwind CSS', desc: '原子化 CSS', color: '#38bdf8' },
      { name: 'Rough.js', desc: '手绘风 SVG', color: '#999' },
    ],
  },
];

const stats = [
  { label: '章节', value: '16', color: '#3b82f6' },
  { label: '交互组件', value: '30+', color: '#22c55e' },
  { label: '源码行数', value: '15K+', color: '#a855f7' },
  { label: '语言', value: 'ZH/EN', color: '#f59e0b' },
];

export default function Claude101TechStack() {
  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 技术栈 & 数据
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          maxWidth: 560, margin: '0 auto 24px',
        }}>
          {stats.map(s => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '14px 8px',
              borderRadius: 8, border: `1.5px solid ${s.color}40`,
              background: `${s.color}08`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tech stack grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
          maxWidth: 560, margin: '0 auto',
        }}>
          {stack.map(cat => (
            <div key={cat.category} style={{
              padding: '14px 16px',
              border: '1px solid var(--c-border)',
              borderRadius: 10,
              background: 'transparent',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 10,
              }}>
                {cat.category}
              </div>
              {cat.items.map(item => (
                <div key={item.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 6,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: item.color, flexShrink: 0,
                  }} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
                      {item.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginLeft: 6 }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
