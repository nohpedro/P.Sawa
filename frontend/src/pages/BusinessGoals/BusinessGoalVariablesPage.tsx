import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { PATHS } from "../../router/paths";
import GoalNav from "./components/GoalNav";
import GoalProgressCard from "./components/GoalProgressCard";
import GoalNodeWorkspace from "./components/GoalNodeWorkspace";
import { selectStyle } from "./constants";
import { useBusinessGoals } from "./hooks/useBusinessGoals";

export default function BusinessGoalVariablesPage() {
  const { goals, loading, error } = useBusinessGoals();
  const [goalId, setGoalId] = useState("");
  const selectedGoal = useMemo(() => goals.find((goal) => goal.id === goalId) ?? goals[0], [goals, goalId]);

  useEffect(() => {
    if (!goalId && goals[0]) setGoalId(goals[0].id);
  }, [goalId, goals]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card
        title="Asignacion de variables"
        subtitle="Selecciona una meta y conecta visualmente ventas, sueldos, servicios, gastos fijos e ingresos manuales."
        rightSlot={selectedGoal ? <Link to={PATHS.businessGoalNodes.replace(":id", selectedGoal.id)}><Button variant="outline">Abrir detalle de nodos</Button></Link> : undefined}
      >
        {loading && <Loader label="Cargando metas..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
        {goals.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 360px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>Meta</span>
              <select value={goalId} onChange={(event) => setGoalId(event.target.value)} style={selectStyle}>
                {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.nombre}</option>)}
              </select>
            </label>
            {selectedGoal && <GoalProgressCard goal={selectedGoal} />}
          </div>
        )}
        {!loading && goals.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Crea una meta antes de configurar variables.</div>}
      </Card>
      {selectedGoal && <GoalNodeWorkspace goalId={selectedGoal.id} compact />}
    </div>
  );
}
