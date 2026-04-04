const cards = [
  {
    title: '写入',
    color: '#b05050',
    bgColor: '#fdf0ef',
    items: ['格式强制', 'YAML 元数据', '四种固定类型'],
    annotation: '模型不能自选格式',
  },
  {
    title: '检索',
    color: '#4a80b0',
    bgColor: '#e8f0fa',
    items: ['独立模型过滤', 'Sonnet 做筛选', '主模型无法干预'],
    annotation: '主模型碰不到筛选',
  },
  {
    title: '删除',
    color: '#4a9a6a',
    bgColor: '#e8f5ee',
    items: ['无自动触发', '只在整合阶段判断', '不会静默移除'],
    annotation: '记忆只增不减',
  },
  {
    title: '过时',
    color: '#c09a3e',
    bgColor: '#fdf9ed',
    items: ['框架注入警告', '强制标注日期', 'Agent 必须先验证'],
    annotation: '老记忆自带"保质期"',
  },
];

export default function MemorySummary() {
  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 总结
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 14, color: 'var(--text-secondary)',
            fontStyle: 'italic', lineHeight: 1.6,
          }}>
            模型很强大，但 Harness 不信任它在无监督下管理自己的记忆。每一步都有约束。
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          maxWidth: 640, margin: '0 auto',
        }}>
          {cards.map(card => (
            <div key={card.title} style={{
              padding: '16px 14px',
              border: `1.5px solid ${card.color}`,
              borderRadius: 10,
              background: card.bgColor,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: card.color, marginBottom: 10 }}>
                {card.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {card.items.map(item => (
                  <div key={item} style={{ fontSize: 12, color: 'var(--c-text)', lineHeight: 1.5 }}>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 10, paddingTop: 8,
                borderTop: `1px solid ${card.color}30`,
                fontSize: 11, fontStyle: 'italic',
                color: 'var(--text-secondary)',
              }}>
                {card.annotation}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
