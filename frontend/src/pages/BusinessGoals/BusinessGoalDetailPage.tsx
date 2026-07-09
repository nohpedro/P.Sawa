import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { BusinessGoal } from "../../models/businessGoals";
import { PATHS } from "../../router/paths";
import businessGoalsService from "../../services/businessGoals.service";
import { getErrorMessage } from "../../utils/error";
import GoalNav from "./components/GoalNav";
import GoalProgressCard from "./components/GoalProgressCard";
import { panelStyle } from "./constants";
import ConfirmGoalActionModal from "./modals/ConfirmGoalActionModal";
import GoalContributionModal from "./modals/GoalContributionModal";
import GoalDetailsModal from "./modals/GoalDetailsModal";
import GoalRenewalModal from "./modals/GoalRenewalModal";

export default function BusinessGoalDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [goal, setGoal] = useState<BusinessGoal | null>(null);
  const [modal, setModal] = useState<"contribution" | "details" | "renew" | "delete" | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setGoal(await businessGoalsService.getGoal(id));
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo cargar la meta."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const addContribution = async (payload: any) => {
    setLoading(true);
    try {
      await businessGoalsService.addContribution(id, payload);
      setModal(null);
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo registrar el movimiento."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const renew = async () => {
    setLoading(true);
    try {
      await businessGoalsService.renewGoal(id);
      setModal(null);
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo renovar el ciclo."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async () => {
    setLoading(true);
    try {
      await businessGoalsService.deleteGoal(id);
      setModal(null);
      navigate(PATHS.businessGoalsList);
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar la meta."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      {loading && !goal && <Loader label="Cargando meta..." />}
      {goal && (
        <>
          <Card title={goal.nombre} subtitle="Detalle, progreso y acciones del ciclo actual." rightSlot={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Button onClick={() => setModal("contribution")}>+ Movimiento</Button><Button variant="outline" onClick={() => setModal("details")}>Detalles</Button><Button variant="outline" onClick={() => setModal("renew")}>Renovar</Button><Link to={PATHS.businessGoalEdit.replace(":id", goal.id)}><Button variant="outline">Editar</Button></Link><Link to={PATHS.businessGoalNodes.replace(":id", goal.id)}><Button variant="outline">Nodos</Button></Link><Button variant="danger" onClick={() => setModal("delete")}>Eliminar</Button></div>}>
            <GoalProgressCard goal={goal} />
          </Card>
          <Card title="Ciclo actual" subtitle="Informacion operativa sin mezclar el historial completo.">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div style={panelStyle}>Ciclo<br /><strong>{goal.progress?.cycle_number ?? 1}</strong></div>
              <div style={panelStyle}>Proyeccion<br /><strong>{goal.progress?.cumplimiento_estimado ? "Cumple" : "En riesgo"}</strong></div>
              <div style={panelStyle}>Renovacion<br /><strong>{goal.progress?.proxima_renovacion ?? "Sin renovacion"}</strong></div>
            </div>
          </Card>
        </>
      )}
      {modal === "contribution" && createPortal(<GoalContributionModal loading={loading} onClose={() => setModal(null)} onSubmit={addContribution} />, document.body)}
      {modal === "details" && goal && createPortal(<GoalDetailsModal goal={goal} onClose={() => setModal(null)} />, document.body)}
      {modal === "renew" && goal && createPortal(<GoalRenewalModal goal={goal} loading={loading} onClose={() => setModal(null)} onConfirm={renew} />, document.body)}
      {modal === "delete" && goal && createPortal(<ConfirmGoalActionModal title="Eliminar meta" message={`Se eliminara la meta ${goal.nombre}, sus ciclos, nodos, conexiones y movimientos.`} loading={loading} onClose={() => setModal(null)} onConfirm={deleteGoal} />, document.body)}
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
