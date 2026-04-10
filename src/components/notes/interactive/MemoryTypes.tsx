import { useState } from 'react';

const strings = {
  zh: {
    headerLabel: '四种记忆类型',
    title: '四种记忆类型',
    subtitle: '本质上是为 Agent 检索提供的标签',
    whenToSaveLabel: '何时保存：',
    exampleLabel: '示例：',
    indexFileLabel: 'MEMORY.md（索引文件）：',
    indexRows: [
      '- [用户档案](user_profile.md) — 后端工程师，5年 Python 经验',
      '- [测试规范](feedback_testing.md) — 集成测试中禁止 mock 数据库',
      '- [认证重写](project_auth.md) — 合规需求驱动，截止 2026-04-15',
      '- [Bug追踪](reference_linear.md) — 流水线 bug 在 Linear INGEST 项目',
    ],
    memoryFileLabel: 'feedback_testing.md（单个记忆文件）：',
    memoryFileName: '测试规范',
    memoryFileDesc: '集成测试必须使用真实数据库连接，禁止使用mock',
    types: [
      {
        type: 'user',
        label: '用户',
        subtitle: '角色、领域、偏好',
        hook: '你是谁',
        description: '记录用户的角色、目标、职责和专业知识。帮助 Agent 在未来的对话中根据用户画像量身定制行为。',
        whenToSave: '当得知用户角色、偏好、职责或专业知识的任何细节时',
        example: '用户是数据科学家，当前关注可观测性/日志系统',
      },
      {
        type: 'feedback',
        label: '反馈',
        subtitle: '修正与确认方法',
        hook: '你希望 CC 怎么做',
        description: '用户给出的关于工作方式的指导——包括应避免什么和应继续做什么。同时记录成功和失败：修正容易注意到，确认更安静——要留意它们。',
        whenToSave: '用户纠正你的做法（"不要那样"）或确认一个非显而易见的做法（"没错就是这样"）时',
        example: '集成测试必须使用真实数据库连接，禁止使用 mock',
      },
      {
        type: 'project',
        label: '项目',
        subtitle: '截止日期、决策',
        hook: '代码和 Git 看不到的',
        description: '关于进行中的工作、目标、计划、Bug 或事件的信息，无法从代码或 Git 历史中推导。始终将相对日期转换为绝对日期。',
        whenToSave: '当得知谁在做什么、为什么做、截止时间是什么时候',
        example: '认证中间件重写是法规/合规需求驱动，截止日期 2026-04-15',
      },
      {
        type: 'ref',
        label: '参考',
        subtitle: '代码库外的关注',
        hook: '外部系统的指引',
        description: '指向外部系统中信息所在位置的指针。让 Agent 记住到哪里查找项目目录之外的最新信息。',
        whenToSave: '当得知外部系统中资源的位置及其用途时',
        example: '流水线相关 bug 在 Linear 的 INGEST 项目中追踪',
      },
    ],
  },
  en: {
    headerLabel: 'Four Memory Types',
    title: 'Four Memory Types',
    subtitle: 'Essentially labels that support agent retrieval',
    whenToSaveLabel: 'When to save: ',
    exampleLabel: 'Example: ',
    indexFileLabel: 'MEMORY.md (index file):',
    indexRows: [
      '- [User Profile](user_profile.md) — Backend engineer, 5 years of Python experience',
      '- [Testing Rules](feedback_testing.md) — No mocking the database in integration tests',
      '- [Auth Rewrite](project_auth.md) — Driven by compliance, deadline 2026-04-15',
      '- [Bug Tracking](reference_linear.md) — Pipeline bugs tracked in Linear INGEST project',
    ],
    memoryFileLabel: 'feedback_testing.md (single memory file):',
    memoryFileName: 'Testing Rules',
    memoryFileDesc: 'Integration tests must use real database connections; no mocking',
    types: [
      {
        type: 'user',
        label: 'User',
        subtitle: 'Role, domain, preferences',
        hook: 'Who you are',
        description: "Records the user's role, goals, responsibilities, and expertise. Helps the Agent tailor its behavior to the user profile in future conversations.",
        whenToSave: "When you learn any detail about the user's role, preferences, responsibilities, or expertise",
        example: 'User is a data scientist currently focused on observability / logging systems',
      },
      {
        type: 'feedback',
        label: 'Feedback',
        subtitle: 'Corrections and confirmations',
        hook: 'How you want CC to work',
        description: "Guidance from the user about how to work — including what to avoid and what to keep doing. Record both successes and failures: corrections are easy to notice, confirmations are quieter — watch for them.",
        whenToSave: 'When the user corrects you ("not like that") or confirms a non-obvious approach ("yes, exactly")',
        example: 'Integration tests must use a real database connection; mocking is forbidden',
      },
      {
        type: 'project',
        label: 'Project',
        subtitle: 'Deadlines, decisions',
        hook: 'What code and Git cannot see',
        description: 'Information about ongoing work, goals, plans, bugs, or incidents that cannot be derived from code or Git history. Always convert relative dates to absolute dates.',
        whenToSave: 'When you learn who is doing what, why, and by when',
        example: 'The auth middleware rewrite is driven by compliance, deadline 2026-04-15',
      },
      {
        type: 'ref',
        label: 'Reference',
        subtitle: 'Concerns outside the codebase',
        hook: 'Pointers to external systems',
        description: 'Pointers to where information lives in external systems. Lets the Agent remember where to look for up-to-date information outside the project directory.',
        whenToSave: 'When you learn where a resource lives in an external system and what it is for',
        example: 'Pipeline-related bugs are tracked in the INGEST project on Linear',
      },
    ],
  },
} as const;

const typeStyles = [
  { color: '#b05050', bgColor: '#fdf0ef' },
  { color: '#c09a3e', bgColor: '#fdf9ed' },
  { color: '#4a80b0', bgColor: '#e8f0fa' },
  { color: '#4a9a6a', bgColor: '#e8f5ee' },
];

interface Props {
  lang?: 'zh' | 'en';
}

export default function MemoryTypes({ lang = 'zh' }: Props) {
  const s = strings[lang];
  const [activeType, setActiveType] = useState<number | null>(null);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · {s.headerLabel}
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {s.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {s.subtitle}
          </div>
        </div>

        {/* Hub diagram */}
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 12, marginBottom: 16,
          }}>
            {s.types.map((t, i) => {
              const style = typeStyles[i];
              return (
              <div
                key={t.type}
                onClick={() => setActiveType(activeType === i ? null : i)}
                style={{
                  padding: '16px',
                  border: `1.5px solid ${activeType === i ? style.color : `${style.color}40`}`,
                  borderRadius: 10,
                  background: activeType === i ? style.bgColor : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: style.color }}>
                  {t.label} ({t.type})
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text)', marginTop: 4 }}>
                  {t.subtitle}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--text-secondary)',
                  marginTop: 6, fontStyle: 'italic',
                }}>
                  {t.hook}
                </div>
              </div>
            );})}
          </div>

          {/* Detail panel */}
          {activeType !== null && (
            <div style={{
              padding: '16px 20px',
              border: `1.5px solid ${typeStyles[activeType].color}`,
              borderRadius: 10,
              background: typeStyles[activeType].bgColor,
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: typeStyles[activeType].color, marginBottom: 10 }}>
                {s.types[activeType].label} ({s.types[activeType].type})
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--c-text)', marginBottom: 12 }}>
                {s.types[activeType].description}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text-secondary)',
                borderTop: `1px solid ${typeStyles[activeType].color}20`,
                paddingTop: 10,
              }}>
                <div><strong>{s.whenToSaveLabel}</strong>{s.types[activeType].whenToSave}</div>
                <div style={{ marginTop: 6 }}>
                  <strong>{s.exampleLabel}</strong>
                  <span style={{ fontStyle: 'italic' }}>{s.types[activeType].example}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MEMORY.md example */}
        <div style={{ maxWidth: 560, margin: '20px auto 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 }}>
            {s.indexFileLabel}
          </div>
          <div style={{
            padding: '12px 16px',
            background: '#f8f6f4',
            borderRadius: 8,
            border: '1px solid var(--c-border)',
            fontFamily: 'monospace',
            fontSize: 12, lineHeight: 1.7,
            color: '#444',
            overflowX: 'auto',
          }}>
            {s.indexRows.map((row, i) => (
              <div key={i}><span style={{ color: '#999' }}>{i + 1}</span>  {row}</div>
            ))}
          </div>
          <div style={{
            marginTop: 8, padding: '10px 14px',
            background: '#f8f6f4', borderRadius: 8,
            border: '1px solid var(--c-border)',
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, color: '#444',
          }}>
            <div style={{ color: '#999', marginBottom: 4 }}>{s.memoryFileLabel}</div>
            <div>---</div>
            <div>name: {s.memoryFileName}</div>
            <div>description: {s.memoryFileDesc}</div>
            <div>type: feedback</div>
            <div>---</div>
          </div>
        </div>
      </div>
    </div>
  );
}
