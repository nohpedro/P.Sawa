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
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 950, color: "#f8fafc" }}>Horario de reserva</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
            Escribe la hora o ajusta con los botones.
          </div>
        </div>
        <div
          style={{
            border: "1px solid #334155",
            borderRadius: 8,
            padding: "8px 10px",
            background: "#0b1220",
            color: "#ffd24a",
            fontWeight: 950,
          }}
        >
          {inicioHHMM} - {finHHMM}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
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
