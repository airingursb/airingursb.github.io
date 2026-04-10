import { useEffect, useRef } from 'react';

// ---- layout constants ----
const W = 880;
const H = 460;
const ROW_Y = 100; // top row center-y
const BOT_Y = 370; // sensor row center-y
const BOX_W = 160;
const BOX_H = 80;
const CIRCLE_R = 36;

// node positions (cx, cy)
const nodes = {
  goal:       { x: 100,  y: ROW_Y },
  error:      { x: 280,  y: ROW_Y },
  controller: { x: 480,  y: ROW_Y },
  system:     { x: 720,  y: ROW_Y },
  sensor:     { x: 400,  y: BOT_Y },
};

// colors
const palette = {
  goal:       { fill: '#fef9ed', stroke: '#c09a3e', text: '#8b6914' },
  error:      { fill: '#eef0fb', stroke: '#8b94d0', text: '#4b55a0' },
  controller: { fill: '#edf8f2', stroke: '#6dbe92', text: '#2d7a4f' },
  system:     { fill: '#fdf0ef', stroke: '#d68a82', text: '#a04030' },
  sensor:     { fill: '#eef4fb', stroke: '#8bb4d8', text: '#3870a0' },
  feedback:   '#8b6040',
};

// dash animation speed (px / s)
const FLOW_SPEED = 40;

const strings = {
  zh: {
    title: '负反馈控制回路',
    subtitle: '控制论的核心模型',
  },
  en: {
    title: 'Negative feedback control loop',
    subtitle: 'The core model of cybernetics',
  },
} as const;

interface FeedbackLoopProps {
  title?: string;
  subtitle?: string;
  lang?: 'zh' | 'en';
}

export default function FeedbackLoop({
  title,
  subtitle,
  lang = 'zh',
}: FeedbackLoopProps) {
  const s = strings[lang];
  const resolvedTitle = title ?? s.title;
  const resolvedSubtitle = subtitle ?? s.subtitle;
  const svgRef = useRef<SVGSVGElement>(null);

  // animate dash offset
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
          Interactive · Diagram
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 0', overflow: 'hidden' }}>
        {/* title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>{resolvedTitle}</div>
          {resolvedSubtitle && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
              {resolvedSubtitle}
            </div>
          )}
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            {/* arrow markers */}
            <marker id="arrow-dark" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={palette.goal.stroke} />
            </marker>
            <marker id="arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={palette.error.stroke} />
            </marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={palette.controller.stroke} />
            </marker>
            <marker id="arrow-brown" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={palette.feedback} />
            </marker>
          </defs>

          {/* ===== CONNECTION PATHS (dashed, animated) ===== */}

          {/* Goal → Error */}
          <path
            data-flow
            data-speed={FLOW_SPEED}
            d={`M${nodes.goal.x + BOX_W / 2 + 4},${ROW_Y} L${nodes.error.x - CIRCLE_R - 6},${ROW_Y}`}
            fill="none"
            stroke={palette.goal.stroke}
            strokeWidth={2.2}
            strokeDasharray="10 6"
            markerEnd="url(#arrow-dark)"
          />

          {/* Error → Controller */}
          <path
            data-flow
            data-speed={FLOW_SPEED}
            d={`M${nodes.error.x + CIRCLE_R + 4},${ROW_Y} L${nodes.controller.x - BOX_W / 2 - 6},${ROW_Y}`}
            fill="none"
            stroke={palette.controller.stroke}
            strokeWidth={2.2}
            strokeDasharray="10 6"
            markerEnd="url(#arrow-green)"
          />

          {/* Controller → System */}
          <path
            data-flow
            data-speed={FLOW_SPEED}
            d={`M${nodes.controller.x + BOX_W / 2 + 4},${ROW_Y} L${nodes.system.x - BOX_W / 2 - 6},${ROW_Y}`}
            fill="none"
            stroke={palette.controller.stroke}
            strokeWidth={2.2}
            strokeDasharray="10 6"
            markerEnd="url(#arrow-green)"
          />

          {/* System → down → Sensor (right side, going down then left) */}
          <path
            data-flow
            data-speed={FLOW_SPEED}
            d={`M${nodes.system.x},${ROW_Y + BOX_H / 2 + 4} L${nodes.system.x},${BOT_Y} L${nodes.sensor.x + BOX_W / 2 + 6},${BOT_Y}`}
            fill="none"
            stroke={palette.feedback}
            strokeWidth={2.2}
            strokeDasharray="10 6"
            markerEnd="url(#arrow-brown)"
          />

          {/* Sensor → up to Error (feedback) */}
          <path
            data-flow
            data-speed={FLOW_SPEED}
            d={`M${nodes.sensor.x - BOX_W / 2},${BOT_Y} L${nodes.error.x},${BOT_Y} L${nodes.error.x},${ROW_Y + CIRCLE_R + 6}`}
            fill="none"
            stroke={palette.error.stroke}
            strokeWidth={2.2}
            strokeDasharray="10 6"
            markerEnd="url(#arrow-blue)"
          />

          {/* ===== LABELS on paths ===== */}
          {/* "+" near Error top-right */}
          <text x={nodes.error.x + 14} y={ROW_Y - CIRCLE_R - 8} fontSize={16} fontWeight={600} fill={palette.goal.stroke} textAnchor="middle">+</text>
          {/* "−" below Error */}
          <text x={nodes.error.x - 14} y={ROW_Y + CIRCLE_R + 20} fontSize={16} fontWeight={600} fill={palette.error.text} textAnchor="middle">−</text>
          {/* "Output" label */}
          <text x={nodes.system.x + 50} y={ROW_Y - BOX_H / 2 - 8} fontSize={13} fill={palette.feedback} textAnchor="middle">Output</text>
          {/* "Actual state" label */}
          <text x={nodes.system.x - 50} y={BOT_Y - 40} fontSize={13} fill={palette.feedback} textAnchor="start">Actual state</text>
          {/* "Feedback signal" label */}
          <text x={nodes.error.x + 56} y={BOT_Y - 50} fontSize={13} fill={palette.error.text} textAnchor="middle">Feedback signal</text>

          {/* ===== NODES ===== */}

          {/* Goal box */}
          <rect
            x={nodes.goal.x - BOX_W / 2}
            y={ROW_Y - BOX_H / 2}
            width={BOX_W}
            height={BOX_H}
            rx={8}
            fill={palette.goal.fill}
            stroke={palette.goal.stroke}
            strokeWidth={1.5}
          />
          <text x={nodes.goal.x} y={ROW_Y - 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={palette.goal.text}>Goal</text>
          <text x={nodes.goal.x} y={ROW_Y + 16} textAnchor="middle" fontSize={13} fill={palette.goal.text} opacity={0.7}>Reference</text>

          {/* Error circle */}
          <circle cx={nodes.error.x} cy={ROW_Y} r={CIRCLE_R} fill={palette.error.fill} stroke={palette.error.stroke} strokeWidth={1.5} />
          <text x={nodes.error.x} y={ROW_Y - 4} textAnchor="middle" fontSize={16} fontWeight={700} fill={palette.error.text}>E</text>
          <text x={nodes.error.x} y={ROW_Y + 14} textAnchor="middle" fontSize={12} fill={palette.error.text}>Error</text>

          {/* Controller box */}
          <rect
            x={nodes.controller.x - BOX_W / 2}
            y={ROW_Y - BOX_H / 2}
            width={BOX_W}
            height={BOX_H}
            rx={8}
            fill={palette.controller.fill}
            stroke={palette.controller.stroke}
            strokeWidth={1.5}
          />
          <text x={nodes.controller.x} y={ROW_Y - 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={palette.controller.text}>Controller</text>
          <text x={nodes.controller.x} y={ROW_Y + 16} textAnchor="middle" fontSize={13} fill={palette.controller.text} opacity={0.7}>Decide action</text>

          {/* System box */}
          <rect
            x={nodes.system.x - BOX_W / 2}
            y={ROW_Y - BOX_H / 2}
            width={BOX_W}
            height={BOX_H}
            rx={8}
            fill={palette.system.fill}
            stroke={palette.system.stroke}
            strokeWidth={1.5}
          />
          <text x={nodes.system.x} y={ROW_Y - 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={palette.system.text}>System</text>
          <text x={nodes.system.x} y={ROW_Y + 16} textAnchor="middle" fontSize={13} fill={palette.system.text} opacity={0.7}>Actual process</text>

          {/* Sensor box */}
          <rect
            x={nodes.sensor.x - BOX_W / 2}
            y={BOT_Y - BOX_H / 2}
            width={BOX_W}
            height={BOX_H}
            rx={8}
            fill={palette.sensor.fill}
            stroke={palette.sensor.stroke}
            strokeWidth={1.5}
          />
          <text x={nodes.sensor.x} y={BOT_Y - 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={palette.sensor.text}>Sensor</text>
          <text x={nodes.sensor.x} y={BOT_Y + 16} textAnchor="middle" fontSize={13} fill={palette.sensor.text} opacity={0.7}>Measure output</text>
        </svg>
      </div>
    </div>
  );
}
