import { useState, useMemo, useCallback } from 'react';

// ---- Simulation parameters ----
const STEPS = 64;
const AMBIENT = 10;   // initial / ambient temperature
const DT = 1;         // time step

function simulate(target: number, kp: number, disturbance: number) {
  const temps: number[] = [];
  const heaters: number[] = [];
  let temp = AMBIENT;

  for (let i = 0; i < STEPS; i++) {
    const error = target - temp;
    let heater = kp * error;
    heater = Math.max(0, Math.min(12, heater)); // clamp 0-12

    // simple first-order model
    const dTemp = (heater - 0.3 * (temp - AMBIENT)) * DT * 0.3;
    temp += dTemp + disturbance * Math.sin(i * 0.5) * 0.3;
    temps.push(temp);
    heaters.push(heater);
  }
  return { temps, heaters };
}

// ---- Chart drawing helpers ----
const CHART_W = 640;
const CHART_H = 260;
const PAD = { top: 20, right: 52, bottom: 36, left: 44 };
const PW = CHART_W - PAD.left - PAD.right;
const PH = CHART_H - PAD.top - PAD.bottom;

function scaleX(i: number) {
  return PAD.left + (i / (STEPS - 1)) * PW;
}

function buildPath(data: number[], yMin: number, yMax: number) {
  return data
    .map((v, i) => {
      const x = scaleX(i);
      const y = PAD.top + PH - ((v - yMin) / (yMax - yMin)) * PH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

// ---- Slider component ----
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
      <span style={{ width: 100, fontSize: 14, fontWeight: 500, color: 'var(--text)', textAlign: 'right' }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent, #10b981)' }}
      />
      <span style={{ width: 56, fontSize: 14, fontWeight: 600, color: 'var(--text)', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)' }}>
        {format ? format(value) : value}
      </span>
    </div>
  );
}

interface Props {
  lang?: 'zh' | 'en';
}

export default function ThermostatSimulator(_props: Props = {}) {
  const [target, setTarget] = useState(28);
  const [kp, setKp] = useState(14);
  const [disturbance, setDisturbance] = useState(0);

  const { temps, heaters } = useMemo(
    () => simulate(target, kp, disturbance),
    [target, kp, disturbance],
  );

  // Y-axis ranges
  const tempMin = 10;
  const tempMax = 35;
  const heatMin = 0;
  const heatMax = 12;

  const scaleYTemp = useCallback(
    (v: number) => PAD.top + PH - ((v - tempMin) / (tempMax - tempMin)) * PH,
    [],
  );
  const scaleYHeat = useCallback(
    (v: number) => PAD.top + PH - ((v - heatMin) / (heatMax - heatMin)) * PH,
    [],
  );

  // grid lines for temp axis
  const tempTicks = [10, 15, 20, 25, 30, 35];
  const heatTicks = [0, 2, 4, 6, 8, 10, 12];
  const xTicks = [0, 7, 14, 21, 28, 35, 42, 49, 56];

  return (
    <div className="interactive-block">
      <div className="interactive-block-header">
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="badge-interactive" />
          Interactive · Thermostat Simulator
        </span>
      </div>
      <div className="interactive-block-body" style={{ padding: '24px 32px' }}>
        {/* Sliders */}
        <div style={{ maxWidth: 520, margin: '0 auto 20px' }}>
          <Slider label="Target temp" value={target} min={15} max={35} step={1} onChange={setTarget} format={(v) => `${v}\u00B0C`} />
          <Slider label="Gain (Kp)" value={kp} min={1} max={30} step={1} onChange={setKp} />
          <Slider label="Disturbance" value={disturbance} min={0} max={10} step={0.5} onChange={setDisturbance} format={(v) => v.toFixed(1)} />
        </div>

        {/* Chart */}
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} style={{ width: '100%', maxWidth: CHART_W, height: 'auto', display: 'block', margin: '0 auto' }}>
          {/* grid */}
          {tempTicks.map((t) => (
            <line key={`g-${t}`} x1={PAD.left} x2={CHART_W - PAD.right} y1={scaleYTemp(t)} y2={scaleYTemp(t)} stroke="var(--border, #e8e8e6)" strokeWidth={0.8} />
          ))}

          {/* x ticks */}
          {xTicks.map((i) => (
            <text key={`xt-${i}`} x={scaleX(i)} y={CHART_H - 6} textAnchor="middle" fontSize={11} fill="var(--text-secondary, #888)">
              {i}
            </text>
          ))}
          <text x={CHART_W / 2} y={CHART_H} textAnchor="middle" fontSize={12} fill="var(--text-secondary, #888)">
            Time steps
          </text>

          {/* Y axis left (temp) */}
          {tempTicks.map((t) => (
            <text key={`yt-${t}`} x={PAD.left - 8} y={scaleYTemp(t) + 4} textAnchor="end" fontSize={11} fill="var(--text-secondary, #888)">
              {t}
            </text>
          ))}
          <text x={14} y={CHART_H / 2} textAnchor="middle" fontSize={12} fill="var(--text-secondary, #888)" transform={`rotate(-90, 14, ${CHART_H / 2})`}>
            °C
          </text>

          {/* Y axis right (heater) */}
          {heatTicks.map((t) => (
            <text key={`yh-${t}`} x={CHART_W - PAD.right + 8} y={scaleYHeat(t) + 4} textAnchor="start" fontSize={11} fill="var(--text-secondary, #888)">
              {t}
            </text>
          ))}
          <text x={CHART_W - 10} y={CHART_H / 2} textAnchor="middle" fontSize={12} fill="var(--text-secondary, #888)" transform={`rotate(90, ${CHART_W - 10}, ${CHART_H / 2})`}>
            Heater
          </text>

          {/* target dashed line */}
          <line
            x1={PAD.left}
            x2={CHART_W - PAD.right}
            y1={scaleYTemp(target)}
            y2={scaleYTemp(target)}
            stroke="#c05050"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.6}
          />

          {/* heater area */}
          <path
            d={`${buildPath(heaters, heatMin, heatMax)} L${scaleX(STEPS - 1).toFixed(1)},${(PAD.top + PH).toFixed(1)} L${PAD.left.toFixed(1)},${(PAD.top + PH).toFixed(1)} Z`}
            fill="rgba(16,120,80,0.12)"
          />
          {/* heater line */}
          <path d={buildPath(heaters, heatMin, heatMax)} fill="none" stroke="#2d8060" strokeWidth={1.5} />

          {/* temperature line */}
          <path d={buildPath(temps, tempMin, tempMax)} fill="none" stroke="#c05050" strokeWidth={2.2} />
        </svg>
      </div>
    </div>
  );
}
