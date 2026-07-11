import type { BusinessGoal } from "../../../models/businessGoals";
import { money, percent } from "../utils/goalCalculations";
import ModalShell from "./ModalShell";

export default function GoalDetailsModal({ goal, onClose }: { goal: BusinessGoal; onClose: () => void }) {
  const progress = goal.progress;
  return (
    <ModalShell title={goal.nombre} subtitle="La meta es ganancia; los ingresos primero cubren los gastos." onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: 13 }}>
        <div>Meta de ganancia: <strong>{money(goal.monto_objetivo)}</strong></div>
        <div>Ganancia acumulada: <strong>{money(progress?.ganancia_acumulada)}</strong></div>
        <div>Gastos totales: <strong>{money(progress?.gastos_totales)}</strong></div>
        <div>Gastos pendientes: <strong>{money(progress?.gastos_pendientes)}</strong></div>
        <div>Ingreso necesario: <strong>{money(progress?.ingreso_necesario)}</strong></div>
        <div>Ingreso faltante: <strong>{money(progress?.ingreso_faltante)}</strong></div>
        <div>Ingresos por reservas: <strong>{money(progress?.ingresos_reservas)}</strong></div>
        <div>Ingresos por ventas: <strong>{money(progress?.ingresos_ventas)}</strong></div>
        <div>Gastos fijos: <strong>{money(progress?.gastos_fijos)}</strong></div>
        <div>Gastos variables (lotes): <strong>{money(progress?.gastos_variables)}</strong></div>
        <div>Avance de ganancia: <strong>{percent(progress?.porcentaje_avance)}</strong></div>
        <div>Ciclo actual: <strong>{progress?.cycle_number ?? 1}</strong></div>
        <div>Proxima renovacion: <strong>{progress?.proxima_renovacion ?? "Sin fecha"}</strong></div>
      </div>
    </ModalShell>
  );
}
