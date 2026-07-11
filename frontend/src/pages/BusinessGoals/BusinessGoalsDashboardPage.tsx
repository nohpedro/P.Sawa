import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { PATHS } from "../../router/paths";
import GoalNav from "./components/GoalNav";
import GoalProgressCard from "./components/GoalProgressCard";
import { useBusinessGoals } from "./hooks/useBusinessGoals";
import { money } from "./utils/goalCalculations";

export default function BusinessGoalsDashboardPage() {
  const { goals, loading, error } = useBusinessGoals({ periodo: "vigentes" });
  const active = goals.filter((goal) => goal.estado === "activa");
  const target = goals.reduce((sum, goal) => sum + Number(goal.monto_objetivo || 0), 0);
  const accumulated = goals.reduce((sum, goal) => sum + Number(goal.progress?.monto_acumulado || 0), 0);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card title="Panel de metas" subtitle="Resumen ejecutivo de metas financieras, avance y proyeccion." rightSlot={<Link to={PATHS.businessGoalCreate}><Button>+ Nueva meta</Button></Link>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          <div className="goal-panel" style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 14 }}>Metas activas<br /><strong>{active.length}</strong></div>
          <div className="goal-panel" style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 14 }}>Objetivo total<br /><strong>{money(target)}</strong></div>
          <div className="goal-panel" style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 14 }}>Acumulado<br /><strong>{money(accumulated)}</strong></div>
        </div>
      </Card>
      <Card title="Prioritarias" subtitle="Metas con lectura rapida de avance.">
        {loading && <Loader label="Cargando metas..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {goals.slice(0, 6).map((goal) => <GoalProgressCard key={goal.id} goal={goal} />)}
        </div>
      </Card>
    </div>
  );
}
