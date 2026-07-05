import ClockTimePicker, { type HHMM } from "./ClockTimePicker";

export default function TimeRangePicker({
  inicioHHMM,
  onInicioChange,
  finHHMM,
  onFinChange,
  minuteStep = 5,
  disabled = false,
}: {
  inicioHHMM: HHMM;
  onInicioChange: (v: HHMM) => void;

  finHHMM: HHMM;
  onFinChange: (v: HHMM) => void;

  minuteStep?: number;
  disabled?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 950, color: "#f8fafc" }}>Horario</div>
        </div>
        <div
          style={{
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "7px 10px",
            background: "#0b1220",
            color: "#ffd24a",
            fontWeight: 950,
          }}
        >
          {inicioHHMM} - {finHHMM}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
      <ClockTimePicker
        label="Hora inicio"
        value={inicioHHMM}
        onChange={onInicioChange}
        minuteStep={minuteStep}
        disabled={disabled}
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
