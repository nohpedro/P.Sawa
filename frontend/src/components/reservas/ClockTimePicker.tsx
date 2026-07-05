import type React from "react";

export type HHMM = `${string}:${string}`;

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#111827",
  color: "#f8fafc",
  outline: "none",
  padding: "10px 12px",
  fontSize: 15,
  fontWeight: 800,
  colorScheme: "dark",
};

const STEP_BUTTON_STYLE: React.CSSProperties = {
  minHeight: 34,
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#182235",
  color: "#f8fafc",
  cursor: "pointer",
  fontWeight: 900,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseHHMM(value: string): { h: number; m: number } {
  const [rawH, rawM] = value.split(":");
  const h = clamp(Number(rawH || 0), 0, 23);
  const m = clamp(Number(rawM || 0), 0, 59);
  return { h, m };
}

function toHHMM(h: number, m: number): HHMM {
  return `${pad2(clamp(h, 0, 23))}:${pad2(clamp(m, 0, 59))}` as HHMM;
}

function minutesFromHHMM(value: string): number {
  const { h, m } = parseHHMM(value);
  return h * 60 + m;
}

function fromMinutes(total: number): HHMM {
  const day = 24 * 60;
  const normalized = ((total % day) + day) % day;
  return toHHMM(Math.floor(normalized / 60), normalized % 60);
}

function roundToStep(value: string, minuteStep: number): HHMM {
  const total = minutesFromHHMM(value);
  const rounded = Math.round(total / minuteStep) * minuteStep;
  return fromMinutes(rounded);
}

function TimeButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...STEP_BUTTON_STYLE,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function ClockTimePicker({
  label,
  value,
  onChange,
  minuteStep = 5,
  disabled = false,
}: {
  label: string;
  value: HHMM;
  onChange: (v: HHMM) => void;
  minuteStep?: number;
  size?: number;
  disabled?: boolean;
}) {
  const { h, m } = parseHHMM(value);

  const setByMinutes = (delta: number) => {
    if (disabled) return;
    onChange(fromMinutes(minutesFromHHMM(value) + delta));
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        border: "1px solid #263244",
        borderRadius: 8,
        background: "#0b1220",
        padding: 10,
        color: "#f8fafc",
        opacity: disabled ? 0.65 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 900 }}>{label}</label>
        <div style={{ fontSize: 20, lineHeight: 1, fontWeight: 950, color: "#ffd24a" }}>
          {pad2(h)}:{pad2(m)}
        </div>
      </div>

      <input
        type="time"
        value={value}
        step={minuteStep * 60}
        disabled={disabled}
        onChange={(evt) => onChange(roundToStep(evt.target.value, minuteStep))}
        style={FIELD_STYLE}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        <TimeButton disabled={disabled} onClick={() => setByMinutes(-60)}>
          -1 h
        </TimeButton>
        <TimeButton disabled={disabled} onClick={() => setByMinutes(60)}>
          +1 h
        </TimeButton>
        <TimeButton disabled={disabled} onClick={() => setByMinutes(-minuteStep)}>
          -{minuteStep} m
        </TimeButton>
        <TimeButton disabled={disabled} onClick={() => setByMinutes(minuteStep)}>
          +{minuteStep} m
        </TimeButton>
      </div>
    </div>
  );
}
