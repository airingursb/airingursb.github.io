import { useState } from 'react';

interface Feature {
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  detail: string;
}

const features: Feature[] = [
  {
    icon: '📖',
    title: '带注释的真实源码',
    description: '每一章都附带 Claude Code 的实际代码片段',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    detail: '不是伪代码，不是简化版——是真正从 Claude Code 源码中提取的关键函数。每行代码旁边都有逐行注释，解释它做了什么、为什么这么做、用了什么设计模式。支持自动播放注释，也可以暂停手动探索。',
  },
  {
    icon: '🎬',
    title: '动画可视化',
    description: 'Agentic Loop、权限瀑布、Prompt 装配等核心流程的动画演示',
    color: '#22c55e',
    bgColor: '#f0fdf4',
    detail: '用 Framer Motion 和 GSAP 构建的交互式动画。Agentic Loop 的 11 步循环动画、Permission Waterfall 的 5 级权限流、System Prompt 的 6 层装配过程——都可以暂停、回放、点击探索。不是静态图表，是可以"玩"的架构图。',
  },
  {
    icon: '🤖',
    title: 'AI 第一人称叙事',
    description: '"你收到了第一条指令"——从 Claude Code 的视角讲述',
    color: '#a855f7',
    bgColor: '#faf5ff',
    detail: '所有内容都从 Claude Code 的第一人称视角撰写。不是"Claude Code 接收到指令"，而是"你收到了第一条指令"。这种叙事方式让读者代入 AI 的角色，理解每个决策背后的逻辑——为什么要检查权限、为什么要分裂子 Agent、为什么要加载记忆。',
  },
  {
    icon: '🌐',
    title: '中英双语',
    description: '全站中英文自由切换，所有内容完整翻译',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    detail: '不是机翻，不是部分翻译——16 章内容、所有 UI 文案、注释文字都有完整的中英文版本。通过自定义 i18n Context 实现，语言选择保存在 localStorage，切换时页面无刷新。',
  },
  {
    icon: '🏝️',
    title: 'Astro 岛屿架构',
    description: '首屏零 JS，交互组件按需加载',
    color: '#ef4444',
    bgColor: '#fef2f2',
    detail: '基于 Astro 6 的 Island Architecture 构建。首屏是纯静态 HTML，无需加载任何 JavaScript。当用户滚动到交互式组件时，React 才开始水合。结果：首次内容绘制极快，同时保留了完整的交互能力。是性能和交互的完美平衡。',
  },
];

export default function Claude101Features() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 核心特色
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 28px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            不只是文档，是交互式学习体验
          </div>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {features.map((f, i) => {
            const isActive = activeFeature === i;
            return (
              <div key={f.title} style={{ marginBottom: 8 }}>
                <div
                  onClick={() => setActiveFeature(isActive ? null : i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px',
                    border: `1.5px solid ${isActive ? f.color : 'var(--c-border)'}`,
                    borderRadius: isActive ? '10px 10px 0 0' : 10,
                    background: isActive ? f.bgColor : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: f.color }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{f.description}</div>
                  </div>
                  <span style={{
                    fontSize: 16, color: 'var(--text-secondary)',
                    transform: isActive ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s',
                  }}>›</span>
                </div>
                {isActive && (
                  <div style={{
                    padding: '14px 18px',
                    border: `1.5px solid ${f.color}`,
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    background: f.bgColor,
                    fontSize: 13.5, lineHeight: 1.8,
                    color: 'var(--c-text)',
                  }}>
                    {f.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
