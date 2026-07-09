import { useState } from "react";
import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import type { BusinessGoalWriteDTO } from "../../../models/businessGoals";
import GoalForm from "../components/GoalForm";
import { emptyGoal } from "../utils/goalCalculations";
import { validateGoalDraft } from "../utils/validations";
import ModalShell from "./ModalShell";

export default function CreateGoalModal({ loading, onClose, onSubmit }: { loading: boolean; onClose: () => void; onSubmit: (draft: BusinessGoalWriteDTO) => void }) {
  const [draft, setDraft] = useState<BusinessGoalWriteDTO>(emptyGoal());
  const validation = validateGoalDraft(draft);
  return (
    <ModalShell title="Crear meta" subtitle="Define la meta financiera y su regla de renovacion." onClose={onClose}>
      <GoalForm value={draft} onChange={setDraft} />
      <div style={{ marginTop: 16 }}><Button fullWidth disabled={loading || !!validation} onClick={() => onSubmit(draft)}>{loading ? <Loader label="Guardando..." /> : "Crear meta"}</Button></div>
    </ModalShell>
  );
}
