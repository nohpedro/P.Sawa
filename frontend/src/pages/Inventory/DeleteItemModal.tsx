import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import type { InventoryItem } from "../../models/inventory";
import { Modal, panelStyle } from "./shared";

export default function DeleteItemModal({
  item,
  loading,
  onClose,
  onConfirm,
}: {
  item: InventoryItem;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Eliminar item" subtitle="Confirma la eliminacion del item de inventario." onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            ...panelStyle,
            borderColor: "rgba(255,82,82,0.38)",
            background: "rgba(255,82,82,0.06)",
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 18 }}>{item.nombre}</div>
          <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
            Esta accion eliminara el item del inventario. Si tiene lotes asociados, el backend puede rechazar la eliminacion para proteger el historial.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="danger" onClick={onConfirm} disabled={loading} fullWidth>
            {loading ? <Loader label="Eliminando..." /> : "Eliminar item"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
