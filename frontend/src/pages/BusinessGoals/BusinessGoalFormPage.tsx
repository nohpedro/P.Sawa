import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { BusinessGoal, BusinessGoalWriteDTO } from "../../models/businessGoals";
import { PATHS } from "../../router/paths";
import businessGoalsService from "../../services/businessGoals.service";
import { getErrorMessage } from "../../utils/error";
import GoalForm from "./components/GoalForm";
import GoalNav from "./components/GoalNav";
import { emptyGoal } from "./utils/goalCalculations";
import { applyGoalRenewalDefaults } from "./utils/renewalDefaults";
import { validateGoalDraft } from "./utils/validations";
import { useEffect } from "react";

export default function BusinessGoalFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<BusinessGoalWriteDTO>(emptyGoal());
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    businessGoalsService.getGoal(id).then((goal: BusinessGoal) => setDraft({
      nombre: goal.nombre,
      descripcion: goal.descripcion,
      monto_objetivo: goal.monto_objetivo,
      fecha_inicio: goal.fecha_inicio,
      fecha_fin: goal.fecha_fin,
      prioridad: goal.prioridad,
      estado: goal.estado,
      recursos_reservados: goal.recursos_reservados,
      variables_calculo: goal.variables_calculo ?? {},
      tipo: goal.tipo,
      frecuencia_renovacion: goal.frecuencia_renovacion ?? "",
      frecuencia_dias: goal.frecuencia_dias,
      proximo_ciclo: goal.proximo_ciclo ?? null,
      manejo_saldo: goal.manejo_saldo,
      conservar_nodos: goal.conservar_nodos,
    })).catch((err) => setToast({ open: true, message: getErrorMessage(err, "No se pudo cargar la meta."), type: "error" })).finally(() => setLoading(false));
  }, [id]);

  const save = async () => {
    const normalizedDraft = applyGoalRenewalDefaults(draft, {});
    const validation = validateGoalDraft(normalizedDraft);
    if (validation) {
      setToast({ open: true, message: validation, type: "error" });
      return;
    }
    setLoading(true);
    try {
      const goal = id ? await businessGoalsService.patchGoal(id, normalizedDraft) : await businessGoalsService.createGoal(normalizedDraft);
      navigate(PATHS.businessGoalDetail.replace(":id", goal.id));
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo guardar la meta."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      <Card title={id ? "Editar meta" : "Crear meta"} subtitle="Datos principales y configuracion de renovacion.">
        {loading && id ? <Loader label="Cargando..." /> : <GoalForm value={draft} onChange={setDraft} />}
        <div style={{ marginTop: 16 }}><Button onClick={save} disabled={loading || !draft.nombre.trim()} fullWidth>{loading ? <Loader label="Guardando..." /> : "Guardar meta"}</Button></div>
      </Card>
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, open: false }))} />
    </div>
  );
}
