import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { PATHS } from "../../router/paths";
import { formatBolivianos } from "../../utils/currency";
import GoalNav from "./components/GoalNav";
import GoalNodeWorkspace from "./components/GoalNodeWorkspace";
import { useBusinessGoals } from "./hooks/useBusinessGoals";
import { percent, progressColor } from "./utils/goalCalculations";

export default function BusinessGoalVariablesPage() {
  const { goals, loading, error } = useBusinessGoals();
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === selectedGoalId) ?? null, [goals, selectedGoalId]);

  if (selectedGoal) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <GoalNav />
        <GoalNodeWorkspace goalId={selectedGoal.id} compact onBack={() => setSelectedGoalId("")} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card
        title="Seleccionar meta"
        subtitle="Elige una meta para abrir su mapa visual y conectar gastos fijos, ventas, reservas e ingresos."
        rightSlot={<Link to={PATHS.businessGoalCreate}><Button>+ Crear meta</Button></Link>}
      >
        {loading && <Loader label="Cargando metas..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
        {goals.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            {goals.map((goal) => {
              const progress = goal.progress;
              const value = Number(progress?.porcentaje_avance ?? 0);
              const color = progressColor(value);

              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setSelectedGoalId(goal.id)}
                  style={{
                    border: "1px solid rgba(255,210,74,0.25)",
                    borderRadius: 10,
                    background: "linear-gradient(135deg, rgba(255,210,74,0.10), rgba(255,255,255,0.025))",
                    color: "var(--color-text)",
                    padding: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    display: "grid",
                    gap: 10,
                    boxShadow: "0 12px 26px rgba(0,0,0,0.16)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>{goal.nombre}</div>
                      <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                        {goal.estado_label ?? goal.estado} - {goal.tipo_label ?? goal.tipo}
                      </div>
                    </div>
                    <span style={{ color, fontSize: 13, fontWeight: 950, whiteSpace: "nowrap" }}>{percent(value)}</span>
                  </div>

                  <div style={{ height: 8, borderRadius: 999, background: "#0f1420", overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: color }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                    <span>
                      Objetivo<br />
                      <strong style={{ color: "#ffd24a" }}>{formatBolivianos(goal.monto_objetivo)}</strong>
                    </span>
                    <span>
                      Faltante<br />
                      <strong style={{ color: "var(--color-text)" }}>{formatBolivianos(progress?.monto_faltante)}</strong>
                    </span>
                  </div>

                  <span style={{ color: "#8ee59f", fontSize: 12, fontWeight: 950 }}>Abrir mapa visual</span>
                </button>
              );
            })}
          </div>
        )}
        {!loading && goals.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Crea una meta antes de configurar variables.</div>}
      </Card>
    </div>
  );
}
