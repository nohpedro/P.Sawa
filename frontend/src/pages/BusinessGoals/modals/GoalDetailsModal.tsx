import type { BusinessGoal } from "../../../models/businessGoals";
import { money, percent } from "../utils/goalCalculations";
import ModalShell from "./ModalShell";

export default function GoalDetailsModal({ goal, onClose }: { goal: BusinessGoal; onClose: () => void }) {
  const progress = goal.progress;
  return (
    <ModalShell title={goal.nombre} subtitle="Detalle financiero de la meta." onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: 13 }}>
        <div>Objetivo: <strong>{money(goal.monto_objetivo)}</strong></div>
        <div>Acumulado: <strong>{money(progress?.monto_acumulado)}</strong></div>
        <div>Faltante: <strong>{money(progress?.monto_faltante)}</strong></div>
        <div>Avance: <strong>{percent(progress?.porcentaje_avance)}</strong></div>
        <div>Ciclo actual: <strong>{progress?.cycle_number ?? 1}</strong></div>
        <div>Proxima renovacion: <strong>{progress?.proxima_renovacion ?? "Sin fecha"}</strong></div>
      </div>
    </ModalShell>
  );
}
