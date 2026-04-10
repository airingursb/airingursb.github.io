import { useEffect, useRef } from 'react';

const W = 900;
const H = 680;
const FLOW_SPEED = 40;

const palette = {
  capability: { fill: '#e8f5ee', stroke: '#4a9a6a', text: '#2a6a4a' },
  security:   { fill: '#fdf3e0', stroke: '#c09a3e', text: '#7a5a10' },
  collab:     { fill: '#e8f0fa', stroke: '#4a80b0', text: '#2a5080' },
  infra:      { fill: '#f0f0f0', stroke: '#a0a0a0', text: '#505050' },
  harness:    { fill: '#f0e8fa', stroke: '#7a60b0', text: '#4a3070' },
  loop:       { fill: '#fde8d8', stroke: '#c06030', text: '#804020' },
};

const strings = {
  zh: {
    title: 'OpenHarness (oh) — Agent Harness 架构全景',
    subtitle: '用 3% 的代码量实现 Claude Code 80% 的核心能力',
    harnessDefinition: 'Harness = Tools + Knowledge + Observation + Action + Permissions',
    loopTitle: 'Agent Loop（核心循环）',
    loopLine1: 'Query → LLM Stream → Tool Call → Permission Check',
    loopLine2: '→ Hook → Execute → Result → Loop',
    loopLabel: 'loop',
    layers: [
      {
        name: '能力层',
        boxes: [
          { label: 'Tools (43+)', sub: 'File, Shell, Web, MCP' },
          { label: 'Skills（按需知识）', sub: '40+ .md 技能文件' },
          { label: 'Plugins（插件）', sub: '兼容 claude-code' },
        ],
      },
      {
        name: '安全 / 控制层',
        boxes: [
          { label: 'Permissions', sub: 'Default / Auto / Plan' },
          { label: 'Hooks（生命周期）', sub: 'Pre/Post ToolUse' },
          { label: 'Commands (54)', sub: '/help /commit /plan …' },
        ],
      },
      {
        name: '协作 / 扩展层',
        boxes: [
          { label: 'MCP 协议', sub: '外部工具集成' },
          { label: 'Memory（记忆）', sub: '跨会话持久化' },
          { label: 'Coordinator', sub: '多 Agent 协作' },
        ],
      },
      {
        name: '基础设施层',
        boxes: [
          { label: 'Config（配置）', sub: '多层级设置迁移' },
          { label: 'React TUI', sub: 'Ink 终端交互界面' },
        ],
      },
    ],
  },
  en: {
    title: 'OpenHarness (oh) — Agent Harness Overview',
    subtitle: '3% of the code, 80% of Claude Code\'s core capabilities',
    harnessDefinition: 'Harness = Tools + Knowledge + Observation + Action + Permissions',
    loopTitle: 'Agent Loop (core loop)',
    loopLine1: 'Query → LLM Stream → Tool Call → Permission Check',
    loopLine2: '→ Hook → Execute → Result → Loop',
    loopLabel: 'loop',
    layers: [
      {
        name: 'Capability Layer',
        boxes: [
          { label: 'Tools (43+)', sub: 'File, Shell, Web, MCP' },
          { label: 'Skills (on-demand knowledge)', sub: '40+ .md skill files' },
          { label: 'Plugins', sub: 'Compatible with claude-code' },
        ],
      },
      {
        name: 'Safety / Control Layer',
        boxes: [
          { label: 'Permissions', sub: 'Default / Auto / Plan' },
          { label: 'Hooks (lifecycle)', sub: 'Pre/Post ToolUse' },
          { label: 'Commands (54)', sub: '/help /commit /plan …' },
        ],
      },
      {
        name: 'Collaboration / Extension Layer',
        boxes: [
          { label: 'MCP Protocol', sub: 'External tool integration' },
          { label: 'Memory', sub: 'Cross-session persistence' },
          { label: 'Coordinator', sub: 'Multi-agent collaboration' },
        ],
      },
      {
        name: 'Infrastructure Layer',
        boxes: [
          { label: 'Config', sub: 'Multi-level settings migration' },
          { label: 'React TUI', sub: 'Ink-based terminal UI' },
        ],
      },
    ],
  },
} as const;

// layout positions for each layer's boxes (same for both languages)
const layerLayouts = [
  {
    color: palette.capability,
    positions: [
      { x: 60,  y: 280, w: 230, h: 64 },
      { x: 335, y: 280, w: 230, h: 64 },
      { x: 610, y: 280, w: 230, h: 64 },
    ],
  },
  {
    color: palette.security,
    positions: [
      { x: 60,  y: 370, w: 230, h: 64 },
      { x: 335, y: 370, w: 230, h: 64 },
      { x: 610, y: 370, w: 230, h: 64 },
    ],
  },
  {
    color: palette.collab,
    positions: [
      { x: 60,  y: 460, w: 230, h: 64 },
      { x: 335, y: 460, w: 230, h: 64 },
      { x: 610, y: 460, w: 230, h: 64 },
    ],
  },
  {
    color: palette.infra,
    positions: [
      { x: 197, y: 550, w: 230, h: 64 },
      { x: 472, y: 550, w: 230, h: 64 },
    ],
  },
];

const harnessBox = { x: 100, y: 40, w: 700, h: 56 };
const loopBox = { x: 160, y: 140, w: 580, h: 80 };

interface Props {
  lang?: 'zh' | 'en';
}

export default function HarnessArchitecture({ lang = 'zh' }: Props) {
  const s = strings[lang];
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
            {s.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {s.subtitle}
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
            {s.harnessDefinition}
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
            {s.loopTitle}
          </text>
          <text
            x={loopBox.x + loopBox.w / 2} y={loopBox.y + 50}
            textAnchor="middle" fontSize={12}
            fill={palette.loop.text} opacity={0.8}
          >
            {s.loopLine1}
          </text>
          <text
            x={loopBox.x + loopBox.w / 2} y={loopBox.y + 66}
            textAnchor="middle" fontSize={12}
            fill={palette.loop.text} opacity={0.8}
          >
            {s.loopLine2}
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
            {s.loopLabel}
          </text>

          {/* Arrow: Loop → capability layer */}
          <path
            data-flow data-speed={FLOW_SPEED}
            d={`M${W / 2},${loopBox.y + loopBox.h + 2} L${W / 2},${280 - 4}`}
            fill="none" stroke={palette.loop.stroke} strokeWidth={2}
            strokeDasharray="8 5" markerEnd="url(#oh-arrow)"
          />

          {/* Layer boxes */}
          {s.layers.map((layer, li) => {
            const layout = layerLayouts[li];
            return layer.boxes.map((box, bi) => {
              const pos = layout.positions[bi];
              return (
                <g key={`${layer.name}-${bi}`}>
                  <rect
                    x={pos.x} y={pos.y}
                    width={pos.w} height={pos.h}
                    rx={8}
                    fill={layout.color.fill}
                    stroke={layout.color.stroke}
                    strokeWidth={1.5}
                  />
                  <text
                    x={pos.x + pos.w / 2} y={pos.y + 26}
                    textAnchor="middle" fontSize={14} fontWeight={700}
                    fill={layout.color.text}
                  >
                    {box.label}
                  </text>
                  <text
                    x={pos.x + pos.w / 2} y={pos.y + 46}
                    textAnchor="middle" fontSize={12}
                    fill={layout.color.text} opacity={0.7}
                  >
                    {box.sub}
                  </text>
                </g>
              );
            });
          })}

          {/* Legend */}
          {s.layers.map((layer, i) => (
            <g key={layer.name} transform={`translate(${160 + i * 170}, ${H - 30})`}>
              <circle cx={0} cy={0} r={5} fill={layerLayouts[i].color.stroke} />
              <text x={12} y={4} fontSize={12} fill="var(--text-secondary)">{layer.name}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
