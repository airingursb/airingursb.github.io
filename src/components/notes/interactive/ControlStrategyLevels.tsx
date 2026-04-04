import { useState } from 'react';

interface Level {
  name: string;
  subtitle: string;
  color: string;
  bgColor: string;
  description: string;
  aiCoding: string;
}

const levels: Level[] = [
  {
    name: 'Open-loop',
    subtitle: '无反馈',
    color: '#8b6040',
    bgColor: '#fef9ed',
    description: '发出指令后不看结果。像设定洗衣机程序后走开——不管衣服洗没洗干净。',
    aiCoding: '盲目 prompt，不看 AI 输出直接用。',
  },
  {
    name: 'On/Off',
    subtitle: '开关控制',
    color: '#a04030',
    bgColor: '#fdf0ef',
    description: '只有两个状态：全开或全关。恒温器低于阈值就全力加热，高于就完全停止。简单但粗暴，会持续震荡。',
    aiCoding: '看一眼结果，不行就重新生成。没有精细反馈。',
  },
  {
    name: 'PID',
    subtitle: '比例-积分-微分',
    color: '#2d7a4f',
    bgColor: '#edf8f2',
    description: 'P 看"差多少"，I 看"累积偏了多久"，D 看"变化趋势"。三者协作，实现平滑精确的控制。工业控制中 90% 以上场景用的都是 PID。',
    aiCoding: '精细 review + 写 rules + 持续调整 prompt。大多数 AI Coding 场景的最佳实践。',
  },
  {
    name: 'MPC',
    subtitle: '模型预测控制',
    color: '#3870a0',
    bgColor: '#eef4fb',
    description: '内置 Plant 的数学模型，能预测未来 N 步的行为，提前规划最优控制序列。自动驾驶、机器人用的就是这个。',
    aiCoding: '提前规划 context 和架构，预判 AI 可能的失误，主动提供约束条件。',
  },
  {
    name: 'Adaptive / RL',
    subtitle: '自适应 / 强化学习',
    color: '#6b40a0',
    bgColor: '#f3eefb',
    description: 'Plant 的模型本身也在持续学习和更新。系统能适应从未见过的环境变化。',
    aiCoding: '持续积累 CLAUDE.md、迭代工作流、让工具链随项目一起进化。',
  },
];

export default function ControlStrategyLevels() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Control Strategy Evolution
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 560, margin: '0 auto' }}>
          {levels.map((level, i) => {
            const isActive = active === i;
            return (
              <div key={i}>
                {/* level bar */}
                <div
                  onClick={() => setActive(isActive ? null : i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: isActive ? level.bgColor : 'transparent',
                    border: `1.5px solid ${isActive ? level.color : 'var(--border)'}`,
                    borderRadius: isActive ? '10px 10px 0 0' : 10,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {/* level number */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: level.color, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: level.color }}>{level.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{level.subtitle}</span>
                  </div>
                  <span style={{ fontSize: 16, color: 'var(--text-secondary)', transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </div>

                {/* expanded detail */}
                {isActive && (
                  <div style={{
                    padding: '14px 16px 16px',
                    border: `1.5px solid ${level.color}`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    background: level.bgColor,
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.6 }}>
                      {level.description}
                    </p>
                    <div style={{
                      fontSize: 13, color: level.color, fontWeight: 500,
                      padding: '8px 12px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.6)',
                      border: `1px dashed ${level.color}40`,
                    }}>
                      AI Coding 映射：{level.aiCoding}
                    </div>
                  </div>
                )}

                {/* connector line */}
                {i < levels.length - 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                    <div style={{ width: 2, height: 16, background: 'var(--border)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 16 }}>
          点击每一级查看详细说明和 AI Coding 映射
        </p>
      </div>
    </div>
  );
}
