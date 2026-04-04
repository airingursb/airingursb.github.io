import { useState } from 'react';

type Phase = 'extract' | 'consolidate' | 'delete';

interface PhaseInfo {
  id: Phase;
  title: string;
  color: string;
  bgColor: string;
}

const phases: PhaseInfo[] = [
  { id: 'extract', title: '阶段一：逐轮提取', color: '#c09a3e', bgColor: '#fdf9ed' },
  { id: 'consolidate', title: '阶段二：定期整合', color: '#4a80b0', bgColor: '#e8f0fa' },
  { id: 'delete', title: '阶段三：记忆删除', color: '#b05050', bgColor: '#fdf0ef' },
];

function Arrow({ color = 'var(--c-border)' }: { color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 0', color,
    }}>
      <svg width="16" height="20" viewBox="0 0 16 20">
        <path d="M8 0 L8 14 M3 10 L8 16 L13 10" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}

function FlowBox({ text, sub, color, bg }: { text: string; sub?: string; color: string; bg: string }) {
  return (
    <div style={{
      padding: '12px 16px',
      border: `1.5px solid ${color}`,
      borderRadius: 8,
      background: bg,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{text}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DiamondBox({ text, yesLabel, noLabel, color }: { text: string; yesLabel: string; noLabel: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', position: 'relative', padding: '8px 0' }}>
      <div style={{
        display: 'inline-block', padding: '10px 20px',
        border: `1.5px solid ${color}`,
        borderRadius: 8, background: '#fff',
        transform: 'rotate(0deg)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{text}</div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 11, color: 'var(--text-secondary)', marginTop: 4,
        padding: '0 20%',
      }}>
        <span>{noLabel}</span>
        <span>{yesLabel}</span>
      </div>
    </div>
  );
}

export default function MemoryWriteFlow() {
  const [activePhase, setActivePhase] = useState<Phase>('extract');

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 记忆写入流程
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            如何写入记忆？
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            三个阶段：提取 → 整合 → 删除
          </div>
        </div>

        {/* Phase tabs */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center',
          marginBottom: 20, flexWrap: 'wrap',
        }}>
          {phases.map(p => (
            <button
              key={p.id}
              onClick={() => setActivePhase(p.id)}
              style={{
                padding: '8px 16px', borderRadius: 20,
                border: `1.5px solid ${activePhase === p.id ? p.color : 'var(--c-border)'}`,
                background: activePhase === p.id ? p.bgColor : 'transparent',
                color: activePhase === p.id ? p.color : 'var(--c-text)',
                fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {p.title}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {activePhase === 'extract' && (
            <div>
              <FlowBox
                text="后台 Agent 浏览最近 N 条消息"
                color="#c09a3e" bg="#fdf9ed"
              />
              <Arrow color="#c09a3e" />
              <FlowBox
                text="接收现有记忆，避免重复创建"
                color="#c09a3e" bg="#fdf9ed"
              />
              <Arrow color="#c09a3e" />
              <div style={{ textAlign: 'center', position: 'relative', padding: '8px 0' }}>
                <div style={{
                  display: 'inline-block', padding: '10px 24px',
                  border: '1.5px solid #c09a3e', borderRadius: 8,
                  background: '#fff',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#c09a3e' }}>值得记住?</div>
                </div>
              </div>
              <div style={{
                display: 'flex', gap: 12, marginTop: 8,
              }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#4a9a6a', marginBottom: 4, fontWeight: 600 }}>yes</div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <FlowBox text="新建记忆文件" sub="或更新已有文件" color="#4a9a6a" bg="#e8f5ee" />
                    <Arrow color="#4a9a6a" />
                    <FlowBox text="写入索引 MEMORY.md" sub="目录表 + 单行摘要，方便后续检索" color="#4a9a6a" bg="#e8f5ee" />
                  </div>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 4, fontWeight: 600 }}>no</div>
                  <FlowBox text="skip" color="#999" bg="#f5f5f5" />
                </div>
              </div>
            </div>
          )}

          {activePhase === 'consolidate' && (
            <div>
              <FlowBox
                text="触发条件"
                sub="距上次整合 ≥ 24 小时 且 ≥ 5 个会话"
                color="#4a80b0" bg="#e8f0fa"
              />
              <Arrow color="#4a80b0" />
              <div style={{
                textAlign: 'center', fontSize: 12,
                color: 'var(--text-secondary)', padding: '2px 0',
              }}>
                触发后 → <strong>autoDream</strong>（分叉子 Agent）
              </div>
              <div style={{
                fontSize: 11, fontStyle: 'italic', color: '#b05050',
                textAlign: 'right', marginBottom: 4,
              }}>
                gated: tengu_onyx_plover
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { step: '①', text: '读取 MEMORY.md，浏览现有主题文件', sub: '了解当前记忆全貌' },
                  { step: '②', text: '从日志和会话记录中收集近期信号', sub: '通过关键词精准检索，从不全量读取' },
                  { step: '③', text: '合并新信息到现有文件', sub: '相对日期 → 绝对日期；删除与当前代码库矛盾的事实' },
                  { step: '④', text: '修剪记忆', sub: '移除失效的索引条目，缩短冗长内容；解决文件间矛盾' },
                ].map((item, i) => (
                  <div key={i}>
                    {i > 0 && <Arrow color="#4a80b0" />}
                    <FlowBox
                      text={`${item.step} ${item.text}`}
                      sub={item.sub}
                      color="#4a80b0" bg="#e8f0fa"
                    />
                  </div>
                ))}
              </div>
              <Arrow color="#4a80b0" />
              <FlowBox text="done" color="#808080" bg="#f5f5f5" />
              <div style={{
                marginTop: 10, textAlign: 'center',
                fontSize: 12, fontStyle: 'italic', color: 'var(--text-secondary)',
              }}>
                使用通用读写工具，通过锁文件防止跨会话并发整合
              </div>
            </div>
          )}

          {activePhase === 'delete' && (
            <div>
              <div style={{
                padding: '20px',
                border: '1.5px solid #b05050',
                borderRadius: 10,
                background: '#fdf0ef',
                lineHeight: 1.8,
                fontSize: 13.5,
                color: 'var(--c-text)',
              }}>
                <p style={{ margin: '0 0 12px' }}>
                  记忆没有过期时间，也不会定时自动清理。
                </p>
                <p style={{ margin: '0 0 12px' }}>
                  唯一的删除方式是 Claude Code Agent 在<strong style={{ color: '#b05050' }}>整合过程</strong>中主动判断：
                  比如某条记忆和代码库已经对不上了，或者和其他记忆产生了矛盾。
                </p>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#b05050' }}>
                  换句话说，记忆只会越写越精，但绝不会在你不知情的情况下消失。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
