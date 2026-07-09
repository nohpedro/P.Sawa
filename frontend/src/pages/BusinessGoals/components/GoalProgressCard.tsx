import type { BusinessGoal } from "../../../models/businessGoals";
import { panelStyle } from "../constants";
import { money, percent, progressColor } from "../utils/goalCalculations";

export default function GoalProgressCard({ goal }: { goal: BusinessGoal }) {
  const progress = goal.progress;
  const value = Number(progress?.porcentaje_avance ?? 0);

  return (
    <div style={{ ...panelStyle, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 950 }}>{goal.nombre}</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{goal.estado_label ?? goal.estado} - {goal.tipo_label ?? goal.tipo}</div>
        </div>
        <strong style={{ color: progressColor(value) }}>{percent(value)}</strong>
      </div>
      <div style={{ height: 10, borderRadius: 999, background: "#0f1420", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: progressColor(value) }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
        <span>Acumulado: <strong>{money(progress?.monto_acumulado)}</strong></span>
        <span>Faltante: <strong>{money(progress?.monto_faltante)}</strong></span>
        <span>Dias: <strong>{progress?.dias_restantes ?? 0}</strong></span>
      </div>
    </div>
  );
}
