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
    <div style={{ display: "grid", gap: 14 }}>
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
  );
}
