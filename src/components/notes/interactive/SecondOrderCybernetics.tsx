import { useEffect, useRef } from 'react';

const W = 820;
const H = 520;

// colors
const c = {
  plant: { fill: '#edf8f2', stroke: '#6dbe92', text: '#2d7a4f' },
  sensor: { fill: '#eef4fb', stroke: '#8bb4d8', text: '#3870a0' },
  observer: { fill: '#fdf0ef', stroke: '#d68a82', text: '#a04030' },
  boundary: '#bbb',
  action: '#8b6040',
  note: '#555',
};

const DASH_SPEED = 35;

interface Props {
  lang?: 'zh' | 'en';
}

export default function SecondOrderCybernetics(_props: Props = {}) {
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

  // Layout
  const leftCx = 200, rightCx = 620;
  const topY = 140;

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · First-order vs Second-order
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '16px 0', overflow: 'hidden' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <marker id="soc-arrow-brown" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={c.action} />
            </marker>
            <marker id="soc-arrow-blue" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6" fill={c.sensor.stroke} />
            </marker>
          </defs>

          {/* ===== LEFT: First-order ===== */}
          <text x={leftCx} y={30} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--text, #1a1a1a)">First-order</text>
          <text x={leftCx} y={50} textAnchor="middle" fontSize={12} fill={c.note}>Observer outside the system</text>

          {/* system boundary */}
          <rect x={70} y={70} width={260} height={160} rx={12} fill="none" stroke={c.boundary} strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={80} y={88} fontSize={11} fill={c.boundary}>System boundary</text>

          {/* Plant */}
          <rect x={90} y={110} width={100} height={56} rx={8} fill={c.plant.fill} stroke={c.plant.stroke} strokeWidth={1.5} />
          <text x={140} y={138} textAnchor="middle" fontSize={14} fontWeight={600} fill={c.plant.text}>Plant</text>

          {/* Sensor */}
          <rect x={220} y={110} width={100} height={56} rx={8} fill={c.sensor.fill} stroke={c.sensor.stroke} strokeWidth={1.5} />
          <text x={270} y={138} textAnchor="middle" fontSize={14} fontWeight={600} fill={c.sensor.text}>Sensor</text>

          {/* Plant → Sensor arrow */}
          <path d={`M190,138 L218,138`} fill="none" stroke={c.plant.stroke} strokeWidth={1.5} markerEnd="url(#soc-arrow-blue)" />

          {/* Observer box below */}
          <rect x={130} y={300} width={140} height={56} rx={8} fill={c.observer.fill} stroke={c.observer.stroke} strokeWidth={1.5} />
          <text x={200} y={328} textAnchor="middle" fontSize={14} fontWeight={700} fill={c.observer.text}>Observer</text>

          {/* Sensor → Observer */}
          <path data-flow data-speed={DASH_SPEED}
            d={`M270,166 L270,260 L260,300`}
            fill="none" stroke={c.sensor.stroke} strokeWidth={1.8} strokeDasharray="8 5" markerEnd="url(#soc-arrow-blue)" />

          {/* Observer → Plant */}
          <path data-flow data-speed={DASH_SPEED}
            d={`M140,300 L140,260 L140,170`}
            fill="none" stroke={c.action} strokeWidth={1.8} strokeDasharray="8 5" markerEnd="url(#soc-arrow-brown)" />

          <text x={200} y={395} textAnchor="middle" fontSize={12} fill={c.note} fontStyle="italic">"I observe and control</text>
          <text x={200} y={412} textAnchor="middle" fontSize={12} fill={c.note} fontStyle="italic">the system from outside"</text>

          {/* ===== RIGHT: Second-order ===== */}
          <text x={rightCx} y={30} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--text, #1a1a1a)">Second-order</text>
          <text x={rightCx} y={50} textAnchor="middle" fontSize={12} fill={c.note}>Observer inside the system</text>

          {/* expanded boundary */}
          <rect x={470} y={70} width={300} height={310} rx={12} fill="none" stroke={c.boundary} strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={480} y={88} fontSize={11} fill={c.boundary}>Expanded boundary</text>

          {/* Plant */}
          <rect x={490} y={110} width={110} height={56} rx={8} fill={c.plant.fill} stroke={c.plant.stroke} strokeWidth={1.5} />
          <text x={545} y={138} textAnchor="middle" fontSize={14} fontWeight={600} fill={c.plant.text}>Plant</text>

          {/* Sensor */}
          <rect x={640} y={110} width={110} height={56} rx={8} fill={c.sensor.fill} stroke={c.sensor.stroke} strokeWidth={1.5} />
          <text x={695} y={138} textAnchor="middle" fontSize={14} fontWeight={600} fill={c.sensor.text}>Sensor</text>

          {/* Plant → Sensor */}
          <path d={`M600,138 L638,138`} fill="none" stroke={c.plant.stroke} strokeWidth={1.5} markerEnd="url(#soc-arrow-blue)" />

          {/* Observer inside boundary */}
          <rect x={570} y={260} width={150} height={70} rx={8} fill={c.observer.fill} stroke={c.observer.stroke} strokeWidth={1.5} />
          <text x={645} y={290} textAnchor="middle" fontSize={14} fontWeight={700} fill={c.observer.text}>Observer</text>
          <text x={645} y={308} textAnchor="middle" fontSize={11} fill={c.observer.text} opacity={0.7}>Also a participant</text>

          {/* Sensor → Observer */}
          <path data-flow data-speed={DASH_SPEED}
            d={`M695,166 L695,220 L690,258`}
            fill="none" stroke={c.sensor.stroke} strokeWidth={1.8} strokeDasharray="8 5" markerEnd="url(#soc-arrow-blue)" />

          {/* Observer → Plant (normal control) */}
          <path data-flow data-speed={DASH_SPEED}
            d={`M580,260 L545,220 L545,170`}
            fill="none" stroke={c.action} strokeWidth={1.8} strokeDasharray="8 5" markerEnd="url(#soc-arrow-brown)" />

          {/* Observation changes Plant — dashed feedback arrow */}
          <path data-flow data-speed={25}
            d={`M570,280 L510,280 L510,170`}
            fill="none" stroke={c.observer.stroke} strokeWidth={1.8} strokeDasharray="4 4" markerEnd="url(#soc-arrow-brown)" opacity={0.7} />
          <text x={485} y={240} fontSize={11} fill={c.observer.text} textAnchor="end">Observation</text>
          <text x={485} y={254} fontSize={11} fill={c.observer.text} textAnchor="end">changes Plant</text>

          <text x={rightCx} y={415} textAnchor="middle" fontSize={12} fill={c.note} fontStyle="italic">"My observation itself</text>
          <text x={rightCx} y={432} textAnchor="middle" fontSize={12} fill={c.note} fontStyle="italic">shapes what I observe"</text>

          {/* ===== Bottom: Key shift ===== */}
          <rect x={240} y={460} width={340} height={48} rx={10} fill="none" stroke="var(--border, #e8e8e6)" strokeWidth={1.5} />
          <text x={410} y={480} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--text, #1a1a1a)">Key shift</text>
          <text x={410} y={498} textAnchor="middle" fontSize={12} fill={c.note}>From "controlling a system" to "participating in a system"</text>
        </svg>
      </div>
    </div>
  );
}
