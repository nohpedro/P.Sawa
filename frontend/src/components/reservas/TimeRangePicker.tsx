import ClockTimePicker, { type HHMM } from "./ClockTimePicker";
import { hhmmToMinutes } from "./reservationTime";

export default function TimeRangePicker({
  inicioHHMM,
  onInicioChange,
  finHHMM,
  onFinChange,
  minuteStep = 5,
  disabled = false,
  minInicioHHMM,
}: {
  inicioHHMM: HHMM;
  onInicioChange: (v: HHMM) => void;

  finHHMM: HHMM;
  onFinChange: (v: HHMM) => void;

  minuteStep?: number;
  disabled?: boolean;
  minInicioHHMM?: HHMM;
}) {
  const minutes = Math.max(0, hhmmToMinutes(finHHMM) - hhmmToMinutes(inicioHHMM));
  const durationLabel = minutes > 0 ? `${minutes} min` : "Revisar hora fin";

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        border: "1px solid #263244",
        borderRadius: 10,
        background: "#0b1220",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 950, color: "#f8fafc" }}>Horario</div>
          <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>Ajusta inicio y fin en un solo lugar.</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              border: "1px solid #334155",
              borderRadius: 999,
              padding: "6px 10px",
              background: "#111827",
              color: "#ffd24a",
              fontWeight: 950,
              fontSize: 13,
            }}
          >
            {inicioHHMM} - {finHHMM}
          </div>
          <div
            style={{
              border: "1px solid rgba(148,163,184,0.22)",
              borderRadius: 999,
              padding: "6px 10px",
              color: "#cbd5e1",
              fontSize: 12,
              fontWeight: 850,
            }}
          >
            {durationLabel}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <ClockTimePicker
          label="Hora inicio"
          value={inicioHHMM}
          onChange={onInicioChange}
          minuteStep={minuteStep}
          disabled={disabled}
          minValue={minInicioHHMM}
        />

        <ClockTimePicker
          label="Hora fin"
          value={finHHMM}
          onChange={onFinChange}
          minuteStep={minuteStep}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
