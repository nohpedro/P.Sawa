import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { BusinessGoal } from "../../models/businessGoals";
import { PATHS } from "../../router/paths";
import businessGoalsService from "../../services/businessGoals.service";
import { getErrorMessage } from "../../utils/error";
import GoalNav from "./components/GoalNav";
import GoalProgressCard from "./components/GoalProgressCard";
import { selectStyle } from "./constants";
import { useBusinessGoals } from "./hooks/useBusinessGoals";
import ConfirmGoalActionModal from "./modals/ConfirmGoalActionModal";
import { useMemo, useState } from "react";

export default function BusinessGoalsListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [deleteGoal, setDeleteGoal] = useState<BusinessGoal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });
  const { goals, loading, error, reload } = useBusinessGoals(status === "all" ? { periodo: "vigentes" } : { periodo: "vigentes", estado: status });
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? goals.filter((goal) => `${goal.nombre} ${goal.descripcion}`.toLowerCase().includes(q)) : goals;
  }, [goals, query]);

  const confirmDelete = async () => {
    if (!deleteGoal) return;
    setDeleting(true);
    try {
      await businessGoalsService.deleteGoal(deleteGoal.id);
      setDeleteGoal(null);
      await reload();
      setToast({ open: true, message: "Meta eliminada correctamente.", type: "success" });
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar la meta."), type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card title="Metas" subtitle="Lista filtrable de metas financieras." rightSlot={<Link to={PATHS.businessGoalCreate}><Button>+ Nueva</Button></Link>}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 220px", gap: 12, marginBottom: 14 }}>
          <Input label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label style={{ display: "grid", gap: 6 }}><span style={{ fontSize: 12 }}>Estado</span><select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}><option value="all">Todos</option><option value="activa">Activas</option><option value="pausada">Pausadas</option><option value="cumplida">Cumplidas</option></select></label>
        </div>
        {loading && <Loader label="Cargando metas..." />}
        {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((goal) => (
            <div key={goal.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "stretch" }}>
              <Link to={PATHS.businessGoalDetail.replace(":id", goal.id)} style={{ color: "inherit", textDecoration: "none" }}>
                <GoalProgressCard goal={goal} />
              </Link>
              <div style={{ display: "grid", alignContent: "center", gap: 8 }}>
                <Link to={PATHS.businessGoalEdit.replace(":id", goal.id)}><Button size="sm" variant="outline">Editar</Button></Link>
                <Button size="sm" variant="danger" onClick={() => setDeleteGoal(goal)}>Eliminar</Button>
              </div>
            </div>
          ))}
          {!loading && filtered.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay metas para mostrar.</div>}
        </div>
      </Card>
      {deleteGoal && createPortal(<ConfirmGoalActionModal title="Eliminar meta" message={`Se eliminara la meta ${deleteGoal.nombre}, sus ciclos, nodos, conexiones y movimientos.`} loading={deleting} onClose={() => setDeleteGoal(null)} onConfirm={confirmDelete} />, document.body)}
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />
    </div>
  );
}
