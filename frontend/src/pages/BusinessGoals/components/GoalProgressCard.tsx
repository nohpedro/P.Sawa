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
        <span>Ganancia: <strong>{money(progress?.ganancia_acumulada)}</strong> / {money(goal.monto_objetivo)}</span>
        <span>Gastos pendientes: <strong>{money(progress?.gastos_pendientes)}</strong></span>
        <span>Ingreso faltante: <strong>{money(progress?.ingreso_faltante)}</strong></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
        <span>Ingreso acumulado: <strong style={{ color: "var(--color-text)" }}>{money(progress?.ingreso_acumulado)}</strong></span>
        <span>Ingreso necesario: <strong style={{ color: "var(--color-text)" }}>{money(progress?.ingreso_necesario)}</strong></span>
        <span>Dias: <strong>{progress?.dias_restantes ?? 0}</strong></span>
      </div>
    </div>
  );
}
