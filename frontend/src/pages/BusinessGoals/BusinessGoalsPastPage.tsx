import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import { PATHS } from "../../router/paths";
import GoalNav from "./components/GoalNav";
import GoalProgressCard from "./components/GoalProgressCard";
import { selectStyle } from "./constants";
import { useBusinessGoals } from "./hooks/useBusinessGoals";

export default function BusinessGoalsPastPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { goals, loading, error } = useBusinessGoals(status === "all" ? { periodo: "pasadas" } : { periodo: "pasadas", estado: status });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? goals.filter((goal) => `${goal.nombre} ${goal.descripcion}`.toLowerCase().includes(q)) : goals;
  }, [goals, query]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card title="Metas pasadas" subtitle="Metas cuyo periodo termino o que ya fueron cerradas.">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 220px", gap: 12, marginBottom: 14 }}>
          <Input label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12 }}>Estado</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
              <option value="all">Todos</option>
              <option value="activa">Activas vencidas</option>
              <option value="pausada">Pausadas vencidas</option>
              <option value="cumplida">Cumplidas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </label>
        </div>

        {loading && <Loader label="Cargando metas pasadas..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((goal) => (
            <div key={goal.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "stretch" }}>
              <Link to={PATHS.businessGoalDetail.replace(":id", goal.id)} style={{ color: "inherit", textDecoration: "none" }}>
                <GoalProgressCard goal={goal} />
              </Link>
              <div style={{ display: "grid", alignContent: "center", gap: 8 }}>
                <Link to={PATHS.businessGoalEdit.replace(":id", goal.id)}>
                  <Button size="sm" variant="outline">Editar</Button>
                </Link>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay metas pasadas para mostrar.</div>}
        </div>
      </Card>
    </div>
  );
}
