import { useState } from "react";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import type { BusinessGoal, BusinessGoalWriteDTO } from "../../../models/businessGoals";
import GoalForm from "../components/GoalForm";
import { applyGoalRenewalDefaults } from "../utils/renewalDefaults";
import { validateGoalDraft } from "../utils/validations";
import ModalShell from "./ModalShell";

export default function EditGoalModal({ goal, loading, onClose, onSubmit }: { goal: BusinessGoal; loading: boolean; onClose: () => void; onSubmit: (draft: BusinessGoalWriteDTO) => void }) {
  const [draft, setDraft] = useState<BusinessGoalWriteDTO>({
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
  });
  const normalizedDraft = applyGoalRenewalDefaults(draft, {});
  const validation = validateGoalDraft(normalizedDraft);
  return (
    <ModalShell title="Editar meta" subtitle={goal.nombre} onClose={onClose}>
      <GoalForm value={draft} onChange={setDraft} />
      <div style={{ marginTop: 16 }}><Button fullWidth disabled={loading || !!validation} onClick={() => onSubmit(normalizedDraft)}>{loading ? <Loader label="Guardando..." /> : "Guardar meta"}</Button></div>
    </ModalShell>
  );
}
