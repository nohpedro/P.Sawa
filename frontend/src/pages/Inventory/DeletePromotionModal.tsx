import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import type { InventoryPromotion } from "../../models/inventory";
import { Modal, panelStyle } from "./shared";

export default function DeletePromotionModal({
  promotion,
  loading,
  onClose,
  onConfirm,
}: {
  promotion: InventoryPromotion;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Eliminar promocion" subtitle="Confirma la eliminacion de esta regla promocional." onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            ...panelStyle,
            borderColor: "rgba(255,82,82,0.38)",
            background: "rgba(255,82,82,0.06)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18 }}>{promotion.nombre}</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
            Esta accion eliminara la promocion del inventario. Las reservas existentes no se modifican automaticamente.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="danger" onClick={onConfirm} disabled={loading} fullWidth>
            {loading ? <Loader label="Eliminando..." /> : "Eliminar promocion"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
