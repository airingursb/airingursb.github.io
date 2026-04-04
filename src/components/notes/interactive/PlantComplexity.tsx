import { useState, useMemo } from 'react';

const STEPS = 80;
const AMBIENT = 10;
const TARGET = 28;
const KP = 8;

interface SimParams {
  inertia: number;
  delay: number;
  nonlinearity: number;
  disturbance: number;
}

function simulate({ inertia, delay, nonlinearity, disturbance }: SimParams) {
  const temps: number[] = [];
  const outputs: number[] = new Array(STEPS).fill(0);
  let temp = AMBIENT;
  const delayBuffer: number[] = new Array(Math.max(1, Math.round(delay))).fill(0);

  for (let i = 0; i < STEPS; i++) {
    const error = TARGET - temp;
    let control = KP * error;
    control = Math.max(0, Math.min(12, control));

    // nonlinearity: dead zone + saturation
    if (nonlinearity > 0) {
      const deadZone = nonlinearity * 0.3;
      if (Math.abs(error) < deadZone) control = 0;
      const saturation = 12 - nonlinearity * 0.5;
      control = Math.min(control, Math.max(2, saturation));
    }

    // delay buffer
    delayBuffer.push(control);
    const delayedControl = delayBuffer.shift()!;
    outputs[i] = delayedControl;

    // plant dynamics with inertia
    const effectiveInertia = 1 + inertia * 0.8;
    const dTemp = (delayedControl - 0.3 * (temp - AMBIENT)) / effectiveInertia * 0.3;
    temp += dTemp + disturbance * Math.sin(i * 0.4) * 0.25;
    temps.push(temp);
  }
  return { temps, outputs };
}

const PRESETS: Record<string, { label: string; params: SimParams }> = {
  ideal:    { label: 'Ideal',       params: { inertia: 0, delay: 0, nonlinearity: 0, disturbance: 0 } },
  inertia:  { label: 'High inertia',params: { inertia: 8, delay: 0, nonlinearity: 0, disturbance: 0 } },
  delay:    { label: 'Long delay',  params: { inertia: 0, delay: 8, nonlinearity: 0, disturbance: 0 } },
  nonlin:   { label: 'Nonlinear',   params: { inertia: 0, delay: 0, nonlinearity: 8, disturbance: 0 } },
  real:     { label: 'Real codebase', params: { inertia: 6, delay: 5, nonlinearity: 5, disturbance: 6 } },
};

// chart dimensions
const CW = 600, CH = 220;
const PAD = { top: 16, right: 12, bottom: 32, left: 40 };
const PW = CW - PAD.left - PAD.right;
const PH = CH - PAD.top - PAD.bottom;
const yMin = 5, yMax = 40;

function sx(i: number) { return PAD.left + (i / (STEPS - 1)) * PW; }
function sy(v: number) { return PAD.top + PH - ((v - yMin) / (yMax - yMin)) * PH; }

function path(data: number[]) {
  return data.map((v, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
}

function Slider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 100, fontSize: 13, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>{label}</span>
      <input type="range" min={0} max={max} step={0.5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent, #10b981)' }} />
      <span style={{ width: 32, fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function PlantComplexity() {
  const [params, setParams] = useState<SimParams>(PRESETS.ideal.params);
  const { temps } = useMemo(() => simulate(params), [params]);

  const set = (key: keyof SimParams) => (v: number) => setParams(p => ({ ...p, [key]: v }));

  const ticks = [10, 15, 20, 25, 30, 35];
  const xTicks = [0, 20, 40, 60, 80];

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Plant Complexity Simulator
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '20px 28px' }}>
        <div style={{ maxWidth: 500, margin: '0 auto 16px' }}>
          <Slider label="Inertia" value={params.inertia} max={10} onChange={set('inertia')} />
          <Slider label="Delay" value={params.delay} max={10} onChange={set('delay')} />
          <Slider label="Nonlinearity" value={params.nonlinearity} max={10} onChange={set('nonlinearity')} />
          <Slider label="Disturbance" value={params.disturbance} max={10} onChange={set('disturbance')} />
        </div>

        {/* preset buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {Object.entries(PRESETS).map(([key, { label, params: p }]) => (
            <button key={key} onClick={() => setParams(p)}
              style={{
                padding: '4px 14px', fontSize: 12, borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--bg-secondary)',
                color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}>
              {label}
            </button>
          ))}
        </div>

        <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', maxWidth: CW, height: 'auto', display: 'block', margin: '0 auto' }}>
          {ticks.map(t => (
            <g key={t}>
              <line x1={PAD.left} x2={CW - PAD.right} y1={sy(t)} y2={sy(t)} stroke="var(--border, #e8e8e6)" strokeWidth={0.7} />
              <text x={PAD.left - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} fill="var(--text-secondary)">{t}</text>
            </g>
          ))}
          {xTicks.map(i => (
            <text key={i} x={sx(i)} y={CH - 6} textAnchor="middle" fontSize={10} fill="var(--text-secondary)">{i}</text>
          ))}
          <text x={CW / 2} y={CH} textAnchor="middle" fontSize={11} fill="var(--text-secondary)">Time steps</text>
          <text x={10} y={CH / 2} textAnchor="middle" fontSize={11} fill="var(--text-secondary)" transform={`rotate(-90,10,${CH / 2})`}>°C</text>

          {/* target line */}
          <line x1={PAD.left} x2={CW - PAD.right} y1={sy(TARGET)} y2={sy(TARGET)}
            stroke="#c05050" strokeWidth={1.2} strokeDasharray="5 3" opacity={0.5} />
          <text x={CW - PAD.right + 4} y={sy(TARGET) + 4} fontSize={10} fill="#c05050">{TARGET}°C</text>

          {/* temperature curve */}
          <path d={path(temps)} fill="none" stroke="#2d7acc" strokeWidth={2} />
        </svg>
      </div>
    </div>
  );
}
