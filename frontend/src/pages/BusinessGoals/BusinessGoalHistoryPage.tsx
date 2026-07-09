import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { BusinessGoalCycle, BusinessGoalMovement } from "../../models/businessGoals";
import businessGoalsService from "../../services/businessGoals.service";
import { getErrorMessage } from "../../utils/error";
import GoalNav from "./components/GoalNav";
import { panelStyle } from "./constants";
import { money } from "./utils/goalCalculations";

export default function BusinessGoalHistoryPage() {
  const [cycles, setCycles] = useState<BusinessGoalCycle[]>([]);
  const [movements, setMovements] = useState<BusinessGoalMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      businessGoalsService.listCycles({ page: "1", page_size: "100", ordering: "-fecha_inicio" }),
      businessGoalsService.listMovements({ page: "1", page_size: "100", ordering: "-fecha" }),
    ]).then(([cycleRes, movementRes]) => {
      setCycles(cycleRes.results ?? []);
      setMovements(movementRes.results ?? []);
    }).catch((err) => setToast({ open: true, message: getErrorMessage(err, "No se pudo cargar historial."), type: "error" })).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card title="Historial de ciclos" subtitle="Cada ciclo conserva su propio periodo sin sobrescribir anteriores.">
        {loading && <Loader label="Cargando historial..." />}
        <div style={{ display: "grid", gap: 10 }}>
          {cycles.map((cycle) => <div key={cycle.id} style={panelStyle}>Ciclo {cycle.numero}: {cycle.fecha_inicio} a {cycle.fecha_fin} - <strong>{money(cycle.monto_acumulado)}</strong> / {money(cycle.monto_objetivo)}</div>)}
        </div>
      </Card>
      <Card title="Movimientos" subtitle="Ingresos, gastos, reservas y ajustes asociados a metas.">
        <div style={{ display: "grid", gap: 10 }}>
          {movements.map((movement) => <div key={movement.id} style={panelStyle}><strong>{movement.concepto}</strong> - {movement.tipo} - {money(movement.monto)}<div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{movement.fecha} - {movement.categoria || "Sin categoria"}</div></div>)}
        </div>
      </Card>
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
