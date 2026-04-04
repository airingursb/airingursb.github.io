import { useEffect, useRef } from 'react';

const W = 900;
const H = 680;
const FLOW_SPEED = 40;

const palette = {
  capability: { fill: '#1a3a2a', stroke: '#4a9a6a', text: '#7dcea0' },
  security:   { fill: '#3a2a10', stroke: '#c09a3e', text: '#f0d080' },
  collab:     { fill: '#162840', stroke: '#4a80b0', text: '#80c0f0' },
  infra:      { fill: '#2a2a2a', stroke: '#808080', text: '#c0c0c0' },
  harness:    { fill: '#2a1a40', stroke: '#7a60b0', text: '#c0a0f0' },
  loop:       { fill: '#3a1a0a', stroke: '#c06030', text: '#f0a060' },
};

interface Box {
  x: number; y: number; w: number; h: number;
  label: string; sub: string;
  color: typeof palette.capability;
}

const harnessBox = { x: 100, y: 40, w: 700, h: 56 };
const loopBox = { x: 160, y: 140, w: 580, h: 80 };

const layers: { name: string; color: typeof palette.capability; boxes: Box[] }[] = [
  {
    name: '能力层',
    color: palette.capability,
    boxes: [
      { x: 60,  y: 280, w: 230, h: 64, label: 'Tools (43+)', sub: 'File, Shell, Web, MCP', color: palette.capability },
      { x: 335, y: 280, w: 230, h: 64, label: 'Skills（按需知识）', sub: '40+ .md 技能文件', color: palette.capability },
      { x: 610, y: 280, w: 230, h: 64, label: 'Plugins（插件）', sub: '兼容 claude-code', color: palette.capability },
    ],
  },
  {
    name: '安全 / 控制层',
    color: palette.security,
    boxes: [
      { x: 60,  y: 370, w: 230, h: 64, label: 'Permissions', sub: 'Default / Auto / Plan', color: palette.security },
      { x: 335, y: 370, w: 230, h: 64, label: 'Hooks（生命周期）', sub: 'Pre/Post ToolUse', color: palette.security },
      { x: 610, y: 370, w: 230, h: 64, label: 'Commands (54)', sub: '/help /commit /plan …', color: palette.security },
    ],
  },
  {
    name: '协作 / 扩展层',
    color: palette.collab,
    boxes: [
      { x: 60,  y: 460, w: 230, h: 64, label: 'MCP 协议', sub: '外部工具集成', color: palette.collab },
      { x: 335, y: 460, w: 230, h: 64, label: 'Memory（记忆）', sub: '跨会话持久化', color: palette.collab },
      { x: 610, y: 460, w: 230, h: 64, label: 'Coordinator', sub: '多 Agent 协作', color: palette.collab },
    ],
  },
  {
    name: '基础设施层',
    color: palette.infra,
    boxes: [
      { x: 197, y: 550, w: 230, h: 64, label: 'Config（配置）', sub: '多层级设置迁移', color: palette.infra },
      { x: 472, y: 550, w: 230, h: 64, label: 'React TUI', sub: 'Ink 终端交互界面', color: palette.infra },
    ],
  },
];

export default function HarnessArchitecture() {
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
        const speed = Number(p.dataset.speed || FLOW_SPEED);
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
          Interactive · Architecture Diagram
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '20px 0', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            OpenHarness (oh) — Agent Harness 架构全景
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            用 3% 的代码量实现 Claude Code 80% 的核心能力
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <marker id="oh-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={palette.loop.stroke} />
            </marker>
          </defs>

          {/* Harness definition box */}
          <rect
            x={harnessBox.x} y={harnessBox.y}
            width={harnessBox.w} height={harnessBox.h}
            rx={10}
            fill={palette.harness.fill}
            stroke={palette.harness.stroke}
            strokeWidth={1.5}
          />
          <text
            x={harnessBox.x + harnessBox.w / 2} y={harnessBox.y + harnessBox.h / 2 + 5}
            textAnchor="middle" fontSize={15} fontWeight={600}
            fill={palette.harness.text}
          >
            Harness = Tools + Knowledge + Observation + Action + Permissions
          </text>

          {/* Arrow: Harness → Loop */}
          <path
            data-flow data-speed={FLOW_SPEED}
            d={`M${W / 2},${harnessBox.y + harnessBox.h + 2} L${W / 2},${loopBox.y - 2}`}
            fill="none" stroke={palette.loop.stroke} strokeWidth={2}
            strokeDasharray="8 5" markerEnd="url(#oh-arrow)"
          />

          {/* Agent Loop box */}
          <rect
            x={loopBox.x} y={loopBox.y}
            width={loopBox.w} height={loopBox.h}
            rx={28}
            fill={palette.loop.fill}
            stroke={palette.loop.stroke}
            strokeWidth={2}
          />
          <text
            x={loopBox.x + loopBox.w / 2} y={loopBox.y + 30}
            textAnchor="middle" fontSize={16} fontWeight={700}
            fill={palette.loop.text}
          >
            Agent Loop（核心循环）
          </text>
          <text
            x={loopBox.x + loopBox.w / 2} y={loopBox.y + 50}
            textAnchor="middle" fontSize={12}
            fill={palette.loop.text} opacity={0.8}
          >
            Query → LLM Stream → Tool Call → Permission Check
          </text>
          <text
            x={loopBox.x + loopBox.w / 2} y={loopBox.y + 66}
            textAnchor="middle" fontSize={12}
            fill={palette.loop.text} opacity={0.8}
          >
            → Hook → Execute → Result → Loop
          </text>

          {/* Loop arrow (circular) */}
          <path
            data-flow data-speed={30}
            d={`M${loopBox.x + loopBox.w + 4},${loopBox.y + 20}
                Q${loopBox.x + loopBox.w + 40},${loopBox.y + loopBox.h / 2}
                ${loopBox.x + loopBox.w + 4},${loopBox.y + loopBox.h - 10}`}
            fill="none" stroke={palette.loop.stroke} strokeWidth={2}
            strokeDasharray="8 5"
          />
          <text
            x={loopBox.x + loopBox.w + 46} y={loopBox.y + loopBox.h / 2 + 4}
            fontSize={13} fill={palette.loop.text} fontWeight={500}
          >
            loop
          </text>

          {/* Arrow: Loop → capability layer */}
          <path
            data-flow data-speed={FLOW_SPEED}
            d={`M${W / 2},${loopBox.y + loopBox.h + 2} L${W / 2},${280 - 4}`}
            fill="none" stroke={palette.loop.stroke} strokeWidth={2}
            strokeDasharray="8 5" markerEnd="url(#oh-arrow)"
          />

          {/* Layer boxes */}
          {layers.map((layer) =>
            layer.boxes.map((box, bi) => (
              <g key={`${layer.name}-${bi}`}>
                <rect
                  x={box.x} y={box.y}
                  width={box.w} height={box.h}
                  rx={8}
                  fill={box.color.fill}
                  stroke={box.color.stroke}
                  strokeWidth={1.5}
                />
                <text
                  x={box.x + box.w / 2} y={box.y + 26}
                  textAnchor="middle" fontSize={14} fontWeight={700}
                  fill={box.color.text}
                >
                  {box.label}
                </text>
                <text
                  x={box.x + box.w / 2} y={box.y + 46}
                  textAnchor="middle" fontSize={12}
                  fill={box.color.text} opacity={0.7}
                >
                  {box.sub}
                </text>
              </g>
            ))
          )}

          {/* Legend */}
          {[
            { label: '能力层', color: palette.capability.stroke },
            { label: '安全 / 控制层', color: palette.security.stroke },
            { label: '协作 / 扩展层', color: palette.collab.stroke },
            { label: '基础设施层', color: palette.infra.stroke },
          ].map((item, i) => (
            <g key={item.label} transform={`translate(${160 + i * 170}, ${H - 30})`}>
              <circle cx={0} cy={0} r={5} fill={item.color} />
              <text x={12} y={4} fontSize={12} fill="var(--text-secondary)">{item.label}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
