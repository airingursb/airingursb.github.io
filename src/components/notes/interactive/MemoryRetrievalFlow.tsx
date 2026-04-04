import { useState } from 'react';

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

function FlowBox({ text, sub, color, bg, annotation }: {
  text: string; sub?: string; color: string; bg: string; annotation?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
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
      {annotation && (
        <div style={{
          position: 'absolute', right: -8, top: '50%', transform: 'translate(100%, -50%)',
          fontSize: 11, fontStyle: 'italic', color: '#b05050',
          whiteSpace: 'nowrap', maxWidth: 140,
        }}>
          {annotation}
        </div>
      )}
    </div>
  );
}

export default function MemoryRetrievalFlow() {
  const [showStaleness, setShowStaleness] = useState(false);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 记忆检索流程
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            如何检索 Memory？
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            如何决定加载哪些记忆？
          </div>
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          {/* Main flow */}
          <FlowBox
            text="MEMORY.md 始终加载到 system prompt"
            sub="索引文件，上限 200 行 / 25KB"
            color="#c09a3e" bg="#fdf9ed"
          />
          <div style={{
            textAlign: 'right', fontSize: 11,
            fontStyle: 'italic', color: 'var(--text-secondary)',
            marginTop: 2,
          }}>
            但单个记忆文件不会
          </div>

          <div style={{
            textAlign: 'center', fontSize: 12,
            color: 'var(--text-secondary)', padding: '6px 0',
          }}>
            ↓ 非阻塞
          </div>

          <div style={{
            padding: '14px 16px',
            border: '1.5px solid #4a80b0',
            borderRadius: 10,
            background: '#e8f0fa',
          }}>
            <div style={{
              textAlign: 'center', fontSize: 14, fontWeight: 700,
              color: '#4a80b0', marginBottom: 12,
            }}>
              Sonnet 相关性过滤器
            </div>
            <div style={{
              textAlign: 'center', fontSize: 11.5,
              color: 'var(--text-secondary)', marginBottom: 12,
              fontStyle: 'italic',
            }}>
              即使主模型是 Opus，过滤仍由 Sonnet 完成
            </div>

            {[
              { step: '①', text: '扫描所有记忆文件的前置元数据', sub: '最多 200 个文件，按最新排序' },
              { step: '②', text: '格式化清单', sub: '[type] filename (timestamp): description' },
              { step: '③', text: '将清单 + 用户查询发送给 Sonnet', sub: '' },
              { step: '④', text: 'Sonnet 返回最相关的前 5 个文件名', sub: '不确定就不选' },
              { step: '⑤', text: '只有这 5 个文件被加载到上下文中', sub: '已展示过的文件会被排除，把名额留给新记忆' },
            ].map((item, i) => (
              <div key={i}>
                {i > 0 && <Arrow color="#4a80b0" />}
                <FlowBox
                  text={`${item.step} ${item.text}`}
                  sub={item.sub || undefined}
                  color="#4a80b0" bg="#dce8f5"
                />
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 12, textAlign: 'center',
            fontSize: 12, fontStyle: 'italic', color: '#c09a3e',
          }}>
            所以 description 字段至关重要，它是 Sonnet 判断相关性时唯一能看到的东西
          </div>

          {/* Staleness section */}
          <div style={{ marginTop: 24 }}>
            <div
              onClick={() => setShowStaleness(!showStaleness)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', padding: '10px 14px',
                border: '1.5px solid #b05050',
                borderRadius: showStaleness ? '10px 10px 0 0' : 10,
                background: '#fdf0ef',
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#b05050', flex: 1 }}>
                较早的记忆以怀疑态度被添加
              </span>
              <span style={{
                fontSize: 16, color: '#b05050',
                transform: showStaleness ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}>▾</span>
            </div>

            {showStaleness && (
              <div style={{
                border: '1.5px solid #b05050', borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                background: '#fdf0ef', padding: '16px',
              }}>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'stretch',
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    flex: '1 1 120px', padding: '10px 14px',
                    border: '1.5px solid #c09a3e', borderRadius: 8,
                    background: '#fdf9ed', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#c09a3e' }}>记忆 &gt; 1 天</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>已有一定年龄</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#b05050' }}>→</div>
                  <div style={{
                    flex: '1 1 140px', padding: '10px 14px',
                    border: '1.5px solid #b05050', borderRadius: 8,
                    background: '#fff', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#b05050' }}>旁边注入一条警告</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      "这条记忆已有 47 天，可能已过时，请先验证"
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#b05050' }}>→</div>
                  <div style={{
                    flex: '1 1 120px', padding: '10px 14px',
                    border: '1.5px solid #4a9a6a', borderRadius: 8,
                    background: '#e8f5ee', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#4a9a6a' }}>Agent 先验证再行动</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>检查文件、grep 函数确认</div>
                  </div>
                </div>
                <div style={{
                  marginTop: 12, textAlign: 'center',
                  fontSize: 12, fontStyle: 'italic', color: 'var(--text-secondary)',
                }}>
                  记忆是观察快照，不是实时状态。引用代码行为或 file:line 前，请对照当前代码验证。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
