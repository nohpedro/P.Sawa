import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import type { InventoryItemType, InventoryItemWriteDTO } from "../../models/inventory";
import { ITEM_TYPES } from "./constants";
import { Modal, panelStyle, selectStyle } from "./shared";

export default function InventoryItemModal({
  mode,
  draft,
  loading,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  draft: InventoryItemWriteDTO;
  loading: boolean;
  onChange: (draft: InventoryItemWriteDTO) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const set = (patch: Partial<InventoryItemWriteDTO>) => onChange({ ...draft, ...patch });
  const needsMaintenance = draft.tipo === "mantenimiento" || draft.requiere_mantenimiento;

  return (
    <Modal
      title={mode === "create" ? "Nuevo item" : "Editar item"}
      subtitle={mode === "create" ? "Registra el item. El stock inicia en 0 hasta agregar un lote." : "Edita datos, stock actual y stock minimo."}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Input label="Nombre" value={draft.nombre} onChange={(event) => set({ nombre: event.target.value })} placeholder="Ej: Gaseosa 500ml, Balon N5, Red principal" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Categoria</span>
            <select value={draft.tipo} onChange={(event) => set({ tipo: event.target.value as InventoryItemType })} style={selectStyle}>
              {ITEM_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>
          <div style={panelStyle}>
            <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Unidad</div>
            <div style={{ fontWeight: 950, marginTop: 4 }}>Unidad</div>
          </div>
        </div>
        <Input label="Codigo" value={draft.sku ?? ""} onChange={(event) => set({ sku: event.target.value })} placeholder="Opcional" />
        {mode === "edit" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <Input label="Stock actual" type="number" min="0" step="0.01" value={draft.stock_actual ?? "0"} onChange={(event) => set({ stock_actual: event.target.value })} />
            <Input label="Stock minimo" type="number" min="0" step="0.01" value={draft.stock_minimo ?? "0"} onChange={(event) => set({ stock_minimo: event.target.value })} />
          </div>
        )}
        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={!!draft.es_para_venta} onChange={(event) => set({ es_para_venta: event.target.checked, margen_venta_porcentaje: draft.margen_venta_porcentaje || "50" })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Este item es para venta</span>
        </label>
        {draft.es_para_venta && (
          <Input label="Margen venta %" type="number" min="0" step="0.01" value={draft.margen_venta_porcentaje ?? "50"} onChange={(event) => set({ margen_venta_porcentaje: event.target.value })} />
        )}
        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={needsMaintenance} disabled={draft.tipo === "mantenimiento"} onChange={(event) => set({ requiere_mantenimiento: event.target.checked })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>
            Requiere mantenimiento periodico <small style={{ color: "var(--color-text-muted)", fontWeight: 700 }}>(fechas opcionales)</small>
          </span>
        </label>
        {needsMaintenance && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Ultimo mantenimiento (Opcional)" type="date" value={draft.fecha_ultimo_mantenimiento ?? ""} onChange={(event) => set({ fecha_ultimo_mantenimiento: event.target.value })} />
            <Input label="Proximo mantenimiento (Opcional)" type="date" value={draft.fecha_proximo_mantenimiento ?? ""} onChange={(event) => set({ fecha_proximo_mantenimiento: event.target.value })} />
          </div>
        )}
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Descripcion</span>
          <textarea value={draft.descripcion ?? ""} onChange={(event) => set({ descripcion: event.target.value })} rows={3} style={{ ...selectStyle, resize: "vertical" }} />
        </label>
        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={draft.activo} onChange={(event) => set({ activo: event.target.checked })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Item activo</span>
        </label>
        <Button onClick={onSubmit} disabled={loading || !draft.nombre.trim()} fullWidth>
          {loading ? <Loader label="Guardando..." /> : mode === "create" ? "Crear item" : "Guardar cambios"}
        </Button>
        {mode === "edit" && onDelete && (
          <Button variant="danger" onClick={onDelete} disabled={loading} fullWidth>
            Eliminar item
          </Button>
        )}
      </div>
    </Modal>
  );
}
