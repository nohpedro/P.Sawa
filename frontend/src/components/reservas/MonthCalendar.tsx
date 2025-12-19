import { firstWeekdayOfMonth, daysInMonth, toYYYYMMDD } from "../../utils/date.ts";

export default function MonthCalendar({
  month,
  selectedDay,
  onSelectDay,
  onDoubleClickDay,
}: {
  month: Date;
  selectedDay: string; // YYYY-MM-DD
  onSelectDay: (day: string) => void;
  onDoubleClickDay: (day: string) => void;
}) {
  const first = firstWeekdayOfMonth(month); // 0..6
  const total = daysInMonth(month);

  const year = month.getFullYear();
  const m = month.getMonth(); // 0-based

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

          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectDay(c.date!)}
              onDoubleClick={() => onDoubleClickDay(c.date!)}
              style={{
                height: 54,
                borderRadius: 12,
                border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                background: active ? "rgba(255,210,74,0.10)" : "rgba(255,255,255,0.02)",
                color: "var(--color-text)",
                cursor: "pointer",
                fontWeight: 900,
              }}
              title="Doble click para crear reserva"
            >
              {c.day}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 12, opacity: 0.8 }}>
        Tip: <b>Doble click</b> en un día para crear una reserva.
      </div>
    </div>
  );
}
