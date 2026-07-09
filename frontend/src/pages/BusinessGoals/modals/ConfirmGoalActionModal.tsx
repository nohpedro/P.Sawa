import Button from "../../../components/ui/Button";
import Loader from "../../../components/ui/Loader";
import ModalShell from "./ModalShell";

export default function ConfirmGoalActionModal({ title, message, loading, onClose, onConfirm }: { title: string; message: string; loading: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <ModalShell title={title} onClose={onClose}>
      <div style={{ color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>{message}</div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}><Button variant="danger" onClick={onConfirm} disabled={loading} fullWidth>{loading ? <Loader label="Procesando..." /> : "Confirmar"}</Button><Button variant="outline" onClick={onClose}>Cancelar</Button></div>
    </ModalShell>
  );
}
