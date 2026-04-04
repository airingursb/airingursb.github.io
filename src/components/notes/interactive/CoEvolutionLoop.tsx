import { useState, useEffect, useRef } from 'react';

const DASH_SPEED = 35;

interface Stage {
  tag: string;
  tagColor: string;
  title: string;
  description: string;
}

const stages: Stage[] = [
  {
    tag: '你在变',
    tagColor: '#a04030',
    title: '你思考问题的方式变了',
    description:
      '你开始把任务拆成"AI 友好的小块"，更显式地描述架构，用接口和契约而非实现来思考。AI 的能力边界重塑了你的认知风格。',
  },
  {
    tag: '你在变',
    tagColor: '#a04030',
    title: '你沟通的方式变了',
    description:
      '你发展出了一套"prompt 方言"——你知道哪些模式效果好，不自觉地回避歧义，写作变得更结构化、更声明式。AI 训练你学会了说它的语言。',
  },
  {
    tag: 'AI 在变',
    tagColor: '#3870a0',
    title: 'AI 的有效行为被 context 重塑',
    description:
      '你的 CLAUDE.md、system prompt 和积累的 rules 决定了 AI 如何推理你的项目。同一个模型，在不同 codebase 下展现完全不同的"个性"。你在不碰模型权重的情况下重塑了 Controller。',
  },
  {
    tag: 'AI 在变',
    tagColor: '#3870a0',
    title: 'Codebase（Plant）本身在变',
    description:
      'AI 写出的代码让未来的 AI 更容易理解和修改——一致的命名、清晰的模式、完善的类型。Plant 在被 Controller 操作的过程中变得越来越"好控制"。这不是任何一方有意设计的，是从回路中自然涌现的。',
  },
  {
    tag: '涌现',
    tagColor: '#6b40a0',
    title: '没有人规划过这个结果',
    description:
      'Codebase、你的思维方式、AI 的有效行为、团队的工作流——都共同进化成了一个没有任何参与者单独设计过的形态。这就是二阶控制论的标志：系统通过双向反馈自组织。',
  },
];

// SVG diagram dimensions
const DW = 600, DH = 200;

export default function CoEvolutionLoop() {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = svg.querySelectorAll<SVGPathElement>('[data-flow]');
    let raf: number;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (t0 === null) t0 = ts;
      const elapsed = (ts - t0) / 1000;
      paths.forEach((p) => {
        const speed = Number(p.dataset.speed || DASH_SPEED);
        p.style.strokeDashoffset = `${-elapsed * speed}`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · 共同进化：双向塑造
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '20px 28px' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>共同进化：双向塑造</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>没有哪一方是纯粹的"控制器"或"被控对象"</div>
        </div>

        {/* Diagram */}
        <svg ref={svgRef} viewBox={`0 0 ${DW} ${DH}`} style={{ width: '100%', maxWidth: DW, height: 'auto', display: 'block', margin: '0 auto 20px' }}>
          <defs>
            <marker id="ce-arrow-brown" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="#8b6040" />
            </marker>
            <marker id="ce-arrow-blue" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto">
              <path d="M0,0 L7,2.5 L0,5" fill="#3870a0" />
            </marker>
          </defs>

          {/* You box */}
          <rect x={40} y={50} width={160} height={100} rx={10} fill="#fdf0ef" stroke="#d68a82" strokeWidth={1.8} />
          <text x={120} y={90} textAnchor="middle" fontSize={20} fontWeight={700} fill="#a04030">你</text>
          <text x={120} y={112} textAnchor="middle" fontSize={12} fill="#a04030" opacity={0.7}>Harness Engineer</text>

          {/* AI box */}
          <rect x={400} y={50} width={160} height={100} rx={10} fill="#eef4fb" stroke="#8bb4d8" strokeWidth={1.8} />
          <text x={480} y={90} textAnchor="middle" fontSize={20} fontWeight={700} fill="#3870a0">AI</text>
          <text x={480} y={112} textAnchor="middle" fontSize={12} fill="#3870a0" opacity={0.7}>Claude Code / LLM</text>

          {/* Top arrow: You → AI (Prompt, context, rules) */}
          <path data-flow data-speed={DASH_SPEED}
            d={`M200,80 C280,60 320,60 398,80`}
            fill="none" stroke="#8b6040" strokeWidth={2} strokeDasharray="8 5"
            markerEnd="url(#ce-arrow-brown)" />
          <text x={300} y={58} textAnchor="middle" fontSize={11} fill="#8b6040">提示词、上下文、规则</text>

          {/* Bottom arrow: AI → You (Code output, suggestions) */}
          <path data-flow data-speed={DASH_SPEED}
            d={`M400,120 C320,140 280,140 202,120`}
            fill="none" stroke="#3870a0" strokeWidth={2} strokeDasharray="8 5"
            markerEnd="url(#ce-arrow-blue)" />
          <text x={300} y={158} textAnchor="middle" fontSize={11} fill="#3870a0">代码输出、建议</text>

          {/* Left label */}
          <text x={40} y={185} fontSize={11} fill="#a04030">AI 重塑</text>
          <text x={40} y={198} fontSize={11} fill="#a04030">你的思维</text>

          {/* Right label */}
          <text x={560} y={185} fontSize={11} fill="#3870a0" textAnchor="end">你的指令</text>
          <text x={560} y={198} fontSize={11} fill="#3870a0" textAnchor="end">重塑 AI</text>
        </svg>

        {/* Stages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560, margin: '0 auto' }}>
          {stages.map((s, i) => {
            const isActive = active === i;
            return (
              <div
                key={i}
                onClick={() => setActive(isActive ? null : i)}
                style={{
                  border: `1.5px solid ${isActive ? s.tagColor : 'var(--border)'}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  background: isActive ? `${s.tagColor}08` : 'transparent',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: '#fff',
                    background: s.tagColor, padding: '2px 8px', borderRadius: 4,
                    whiteSpace: 'nowrap',
                  }}>
                    {s.tag}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.title}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 14, color: 'var(--text-secondary)', transform: isActive ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </div>
                {isActive && (
                  <p style={{ fontSize: 13, color: 'var(--text)', margin: '10px 0 0', lineHeight: 1.7 }}>
                    {s.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginTop: 14 }}>
          点击每个阶段查看具体的双向塑造机制
        </p>
      </div>
    </div>
  );
}
