import { useMemo, useState } from "react";

export type HHMM = `${string}:${string}`;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseHHMM(v: string): { h: number; m: number } {
  const [hh, mm] = v.split(":");
  const h = clamp(Number(hh ?? 0), 0, 23);
  const m = clamp(Number(mm ?? 0), 0, 59);
  return { h, m };
}

function toHHMM(h: number, m: number): HHMM {
  return `${pad2(h)}:${pad2(m)}` as HHMM;
}

function roundToStep(min: number, step: number): number {
  const r = Math.round(min / step) * step;
  return (r + 60) % 60;
}

function angleToMinute(angleRad: number, step: number): number {
  // 0 rad arriba. convertimos a grados desde arriba, sentido horario
  const deg = (angleRad * 180) / Math.PI;
  const fromTop = (deg + 90 + 360) % 360;
  const minute = Math.round(fromTop / 6) % 60; // 360/60 = 6 deg
  return roundToStep(minute, step);
}

function angleToHourIndex(angleRad: number): number {
  const deg = (angleRad * 180) / Math.PI;
  const fromTop = (deg + 90 + 360) % 360;
  const idx = Math.round(fromTop / 30) % 12; // 360/12 = 30 deg
  return idx === 0 ? 12 : idx; // 1..12
}

function pointToAngleRad(clientX: number, clientY: number, rect: DOMRect): number {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  return Math.atan2(dy, dx);
}

function handAngleForMinute(min: number): number {
  // 0 min arriba => -90deg en sistema atan2
  return ((min / 60) * 2 * Math.PI) - Math.PI / 2;
}

function handAngleForHour(hour12: number, minute: number): number {
  // hour12 1..12, 0 arriba
  const base = (hour12 % 12) / 12;
  const frac = minute / 60 / 12;
  return ((base + frac) * 2 * Math.PI) - Math.PI / 2;
}

export default function ClockTimePicker({
  label,
  value,
  onChange,
  minuteStep = 5,
  size = 220,
  disabled = false,
}: {
  label: string;
  value: HHMM;
  onChange: (v: HHMM) => void;
  minuteStep?: number;
  size?: number;
  disabled?: boolean;
}) {
  const { h, m } = useMemo(() => parseHHMM(value), [value]);

  // Modo de selección
  const [mode, setMode] = useState<"hour" | "minute">("hour");

  // Para 24h: seleccionas ring 0-11 o 12-23
  const [half, setHalf] = useState<0 | 12>(h >= 12 ? 12 : 0);

  const hour12 = useMemo(() => {
    const hh = h % 12;
    return hh === 0 ? 12 : hh;
  }, [h]);

  const display = useMemo(() => toHHMM(h, m), [h, m]);

  const r = size / 2;
  const center = r;

  const hourHand = useMemo(() => {
    const ang = handAngleForHour(hour12, m);
    const len = r * 0.42;
    return {
      x: center + Math.cos(ang) * len,
      y: center + Math.sin(ang) * len,
    };
  }, [center, r, hour12, m]);

  const minuteHand = useMemo(() => {
    const ang = handAngleForMinute(m);
    const len = r * 0.62;
    return {
      x: center + Math.cos(ang) * len,
      y: center + Math.sin(ang) * len,
    };
  }, [center, r, m]);

  const numbers = useMemo(() => {
    // 12 números
    const out: Array<{ n: number; x: number; y: number }> = [];
    const radius = r * 0.78;
    for (let n = 1; n <= 12; n++) {
      const ang = ((n / 12) * 2 * Math.PI) - Math.PI / 2;
      out.push({
        n,
        x: center + Math.cos(ang) * radius,
        y: center + Math.sin(ang) * radius,
      });
    }
    return out;
  }, [center, r]);

  const onClockClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ang = pointToAngleRad(e.clientX, e.clientY, rect);

    if (mode === "hour") {
      const picked12 = angleToHourIndex(ang); // 1..12
      // convertir a 24h según half
      const picked0to11 = picked12 % 12; // 12->0
      const nextH = half + picked0to11;
      onChange(toHHMM(nextH, m));
      setMode("minute");
      return;
    }

    const nextM = angleToMinute(ang, minuteStep);
    onChange(toHHMM(h, nextM));
  };

  const onSelectHalf = (nextHalf: 0 | 12) => {
    if (disabled) return;
    setHalf(nextHalf);

    // Ajustar hora actual al nuevo rango preservando la parte 0-11
    const base = h % 12; // 0..11
    const nextH = nextHalf + base;
    onChange(toHHMM(nextH, m));
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{label}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontWeight: 900 }}>
            {display}
          </div>

          <button
            type="button"
            onClick={() => setMode("hour")}
            disabled={disabled}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: mode === "hour" ? "rgba(255,255,255,0.06)" : "transparent",
              cursor: disabled ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            Hora
          </button>

          <button
            type="button"
            onClick={() => setMode("minute")}
            disabled={disabled}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: mode === "minute" ? "rgba(255,255,255,0.06)" : "transparent",
              cursor: disabled ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            Min
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {mode === "hour" ? "Selecciona hora tocando el reloj" : `Selecciona minutos (${minuteStep} min)`}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => onSelectHalf(0)}
            disabled={disabled}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: half === 0 ? "rgba(255,255,255,0.06)" : "transparent",
              cursor: disabled ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            0-11
          </button>
          <button
            type="button"
            onClick={() => onSelectHalf(12)}
            disabled={disabled}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: half === 12 ? "rgba(255,255,255,0.06)" : "transparent",
              cursor: disabled ? "not-allowed" : "pointer",
              fontWeight: 800,
            }}
          >
            12-23
          </button>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 12,
          background: "rgba(255,255,255,0.02)",
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} onClick={onClockClick} style={{ display: "block", margin: "0 auto", cursor: disabled ? "not-allowed" : "pointer" }}>
          {/* borde */}
          <circle cx={center} cy={center} r={r * 0.92} fill="transparent" stroke="rgba(255,255,255,0.18)" strokeWidth={2} />
          <circle cx={center} cy={center} r={r * 0.86} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />

          {/* números */}
          {numbers.map(({ n, x, y }) => (
            <g key={n}>
              <circle
                cx={x}
                cy={y}
                r={14}
                fill="rgba(255,255,255,0.03)"
                stroke="rgba(255,255,255,0.10)"
              />
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                fontSize="12"
                fill="rgba(255,255,255,0.85)"
                style={{ userSelect: "none" }}
              >
                {n}
              </text>
            </g>
          ))}

          {/* manecillas */}
          <line x1={center} y1={center} x2={hourHand.x} y2={hourHand.y} stroke="rgba(255,255,255,0.8)" strokeWidth={4} strokeLinecap="round" />
          <line x1={center} y1={center} x2={minuteHand.x} y2={minuteHand.y} stroke="rgba(255,255,255,0.55)" strokeWidth={3} strokeLinecap="round" />

          <circle cx={center} cy={center} r={5} fill="rgba(255,255,255,0.85)" />
        </svg>
      </div>
    </div>
  );
}
