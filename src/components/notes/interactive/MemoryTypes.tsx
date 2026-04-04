import { useState } from 'react';

interface MemoryType {
  type: string;
  label: string;
  color: string;
  bgColor: string;
  subtitle: string;
  hook: string;
  description: string;
  whenToSave: string;
  example: string;
}

const types: MemoryType[] = [
  {
    type: 'user',
    label: '用户',
    color: '#b05050',
    bgColor: '#fdf0ef',
    subtitle: '角色、领域、偏好',
    hook: '你是谁',
    description: '记录用户的角色、目标、职责和专业知识。帮助 Agent 在未来的对话中根据用户画像量身定制行为。',
    whenToSave: '当得知用户角色、偏好、职责或专业知识的任何细节时',
    example: '用户是数据科学家，当前关注可观测性/日志系统',
  },
  {
    type: 'feedback',
    label: '反馈',
    color: '#c09a3e',
    bgColor: '#fdf9ed',
    subtitle: '修正与确认方法',
    hook: '你希望 CC 怎么做',
    description: '用户给出的关于工作方式的指导——包括应避免什么和应继续做什么。同时记录成功和失败：修正容易注意到，确认更安静——要留意它们。',
    whenToSave: '用户纠正你的做法（"不要那样"）或确认一个非显而易见的做法（"没错就是这样"）时',
    example: '集成测试必须使用真实数据库连接，禁止使用 mock',
  },
  {
    type: 'project',
    label: '项目',
    color: '#4a80b0',
    bgColor: '#e8f0fa',
    subtitle: '截止日期、决策',
    hook: '代码和 Git 看不到的',
    description: '关于进行中的工作、目标、计划、Bug 或事件的信息，无法从代码或 Git 历史中推导。始终将相对日期转换为绝对日期。',
    whenToSave: '当得知谁在做什么、为什么做、截止时间是什么时候',
    example: '认证中间件重写是法规/合规需求驱动，截止日期 2026-04-15',
  },
  {
    type: 'ref',
    label: '参考',
    color: '#4a9a6a',
    bgColor: '#e8f5ee',
    subtitle: '代码库外的关注',
    hook: '外部系统的指引',
    description: '指向外部系统中信息所在位置的指针。让 Agent 记住到哪里查找项目目录之外的最新信息。',
    whenToSave: '当得知外部系统中资源的位置及其用途时',
    example: '流水线相关 bug 在 Linear 的 INGEST 项目中追踪',
  },
];

export default function MemoryTypes() {
  const [activeType, setActiveType] = useState<number | null>(null);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 四种记忆类型
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            四种记忆类型
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            本质上是为 Agent 检索提供的标签
          </div>
        </div>

        {/* Hub diagram */}
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 12, marginBottom: 16,
          }}>
            {types.map((t, i) => (
              <div
                key={t.type}
                onClick={() => setActiveType(activeType === i ? null : i)}
                style={{
                  padding: '16px',
                  border: `1.5px solid ${activeType === i ? t.color : `${t.color}40`}`,
                  borderRadius: 10,
                  background: activeType === i ? t.bgColor : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: t.color }}>
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
            ))}
          </div>

          {/* Detail panel */}
          {activeType !== null && (
            <div style={{
              padding: '16px 20px',
              border: `1.5px solid ${types[activeType].color}`,
              borderRadius: 10,
              background: types[activeType].bgColor,
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: types[activeType].color, marginBottom: 10 }}>
                {types[activeType].label} ({types[activeType].type})
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--c-text)', marginBottom: 12 }}>
                {types[activeType].description}
              </div>
              <div style={{
                fontSize: 12, color: 'var(--text-secondary)',
                borderTop: `1px solid ${types[activeType].color}20`,
                paddingTop: 10,
              }}>
                <div><strong>何时保存：</strong>{types[activeType].whenToSave}</div>
                <div style={{ marginTop: 6 }}>
                  <strong>示例：</strong>
                  <span style={{ fontStyle: 'italic' }}>{types[activeType].example}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MEMORY.md example */}
        <div style={{ maxWidth: 560, margin: '20px auto 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 }}>
            MEMORY.md（索引文件）：
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
            <div><span style={{ color: '#999' }}>1</span>  - [用户档案](user_profile.md) — 后端工程师，5年 Python 经验</div>
            <div><span style={{ color: '#999' }}>2</span>  - [测试规范](feedback_testing.md) — 集成测试中禁止 mock 数据库</div>
            <div><span style={{ color: '#999' }}>3</span>  - [认证重写](project_auth.md) — 合规需求驱动，截止 2026-04-15</div>
            <div><span style={{ color: '#999' }}>4</span>  - [Bug追踪](reference_linear.md) — 流水线 bug 在 Linear INGEST 项目</div>
          </div>
          <div style={{
            marginTop: 8, padding: '10px 14px',
            background: '#f8f6f4', borderRadius: 8,
            border: '1px solid var(--c-border)',
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, color: '#444',
          }}>
            <div style={{ color: '#999', marginBottom: 4 }}>feedback_testing.md（单个记忆文件）：</div>
            <div>---</div>
            <div>name: 测试规范</div>
            <div>description: 集成测试必须使用真实数据库连接，禁止使用mock</div>
            <div>type: feedback</div>
            <div>---</div>
          </div>
        </div>
      </div>
    </div>
  );
}
