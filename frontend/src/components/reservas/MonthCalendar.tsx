import { firstWeekdayOfMonth, daysInMonth, toYYYYMMDD } from "../../utils/date.ts";

export default function MonthCalendar({
  month,
  selectedDay,
  disablePastDays = false,
  onSelectDay,
  onDoubleClickDay,
}: {
  month: Date;
  selectedDay: string; // YYYY-MM-DD
  disablePastDays?: boolean;
  onSelectDay: (day: string) => void;
  onDoubleClickDay: (day: string) => void;
}) {
  const first = firstWeekdayOfMonth(month); // 0..6
  const total = daysInMonth(month);

  const year = month.getFullYear();
  const m = month.getMonth(); // 0-based
  const today = toYYYYMMDD(new Date());

  const cells: Array<{ day: number | null; key: string; date?: string }> = [];

  for (let i = 0; i < first; i++) {
    cells.push({ day: null, key: `pad-${i}` });
  }

  for (let day = 1; day <= total; day++) {
    const date = toYYYYMMDD(new Date(year, m, day));
    cells.push({ day, key: date, date });
  }

  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, opacity: 0.8, fontSize: 12 }}>
        {weekDays.map((w) => (
          <div key={w} style={{ textAlign: "center", padding: "6px 0" }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {cells.map((c) => {
          if (!c.day || !c.date) {
            return <div key={c.key} style={{ height: 54 }} />;
          }

          const active = c.date === selectedDay;
          const disabled = disablePastDays && c.date < today;

          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) onSelectDay(c.date!);
              }}
              onDoubleClick={() => {
                if (!disabled) onDoubleClickDay(c.date!);
              }}
              style={{
                height: 54,
                borderRadius: 12,
                border: `1px solid ${disabled ? "#1f2937" : active ? "var(--color-accent)" : "var(--color-border)"}`,
                background: disabled ? "#0b1020" : active ? "rgba(255,210,74,0.10)" : "rgba(255,255,255,0.02)",
                color: disabled ? "#64748b" : "var(--color-text)",
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: 900,
                opacity: disabled ? 0.55 : 1,
              }}
              title={disabled ? "Fecha no disponible para reserva" : "Doble click para crear reserva"}
            >
              {c.day}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Tip: selecciona un día y usa <b>Nueva reserva</b>. El doble click tambien abre el formulario.
      </div>
    </div>
  );
}
