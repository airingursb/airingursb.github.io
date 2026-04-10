const strings = {
  zh: {
    headerLabel: '技术栈 & 数据',
    stack: [
      {
        category: '框架',
        items: [
          { name: 'Astro 6', desc: '岛屿架构，零 JS 首屏' },
          { name: 'React 19', desc: '交互组件，按需水合' },
        ],
      },
      {
        category: '内容',
        items: [
          { name: 'MDX', desc: 'Markdown + React 组件' },
          { name: 'TypeScript', desc: '严格模式，类型安全' },
        ],
      },
      {
        category: '动画',
        items: [
          { name: 'Framer Motion', desc: 'React 动画库' },
          { name: 'GSAP', desc: '专业级复杂动画' },
        ],
      },
      {
        category: '样式',
        items: [
          { name: 'Tailwind CSS', desc: '原子化 CSS' },
          { name: 'Rough.js', desc: '手绘风 SVG' },
        ],
      },
    ],
    stats: [
      { label: '章节', value: '16' },
      { label: '交互组件', value: '30+' },
      { label: '源码行数', value: '15K+' },
      { label: '语言', value: 'ZH/EN' },
    ],
  },
  en: {
    headerLabel: 'Tech Stack & Stats',
    stack: [
      {
        category: 'Framework',
        items: [
          { name: 'Astro 6', desc: 'Islands architecture, zero-JS first paint' },
          { name: 'React 19', desc: 'Interactive components, hydrated on demand' },
        ],
      },
      {
        category: 'Content',
        items: [
          { name: 'MDX', desc: 'Markdown + React components' },
          { name: 'TypeScript', desc: 'Strict mode, type safety' },
        ],
      },
      {
        category: 'Animation',
        items: [
          { name: 'Framer Motion', desc: 'React animation library' },
          { name: 'GSAP', desc: 'Professional-grade animations' },
        ],
      },
      {
        category: 'Styling',
        items: [
          { name: 'Tailwind CSS', desc: 'Atomic CSS' },
          { name: 'Rough.js', desc: 'Hand-drawn SVG' },
        ],
      },
    ],
    stats: [
      { label: 'Chapters', value: '16' },
      { label: 'Interactive Components', value: '30+' },
      { label: 'Lines of Source', value: '15K+' },
      { label: 'Languages', value: 'ZH/EN' },
    ],
  },
} as const;

const stackColors = [
  [{ color: '#ff5d01' }, { color: '#61dafb' }],
  [{ color: '#fcb32c' }, { color: '#3178c6' }],
  [{ color: '#e855c3' }, { color: '#88ce02' }],
  [{ color: '#38bdf8' }, { color: '#999' }],
];

const statColors = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b'];

interface Props {
  lang?: 'zh' | 'en';
}

export default function Claude101TechStack({ lang = 'zh' }: Props) {
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
        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          maxWidth: 560, margin: '0 auto 24px',
        }}>
          {s.stats.map((stat, i) => {
            const color = statColors[i];
            return (
            <div key={stat.label} style={{
              textAlign: 'center', padding: '14px 8px',
              borderRadius: 8, border: `1.5px solid ${color}40`,
              background: `${color}08`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 800, color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{stat.label}</div>
            </div>
          );})}
        </div>

        {/* Tech stack grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
          maxWidth: 560, margin: '0 auto',
        }}>
          {s.stack.map((cat, ci) => (
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
              {cat.items.map((item, ii) => (
                <div key={item.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 6,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: stackColors[ci][ii].color, flexShrink: 0,
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
