import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import type { BusinessGoal } from "../../../models/businessGoals";
import ModalShell from "./ModalShell";

export default function GoalRenewalModal({ goal, loading, onClose, onConfirm }: { goal: BusinessGoal; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell title="Renovar ciclo" subtitle={goal.nombre} onClose={onClose}>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>Se evaluara la configuracion de renovacion, se cerrara el ciclo vencido y se creara un nuevo ciclo conservando el historial anterior.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}><Button onClick={onConfirm} disabled={loading} fullWidth>{loading ? <Loader label="Renovando..." /> : "Renovar ahora"}</Button><Button variant="outline" onClick={onClose}>Cancelar</Button></div>
    </ModalShell>
  );
}
