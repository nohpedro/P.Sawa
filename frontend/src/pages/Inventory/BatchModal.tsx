import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import type { InventoryItem, InventoryPurchaseBatchWriteDTO } from "../../models/inventory";
import { DEFAULT_SALE_MARGIN_PERCENT } from "./permissions";
import { Modal, money, panelStyle, selectStyle } from "./shared";

export type BatchDraft = InventoryPurchaseBatchWriteDTO & {
  stock_minimo: string;
  margen_venta_porcentaje: string;
};

export default function BatchModal({
  item,
  draft,
  unitCostPreview,
  salePricePreview,
  marginPreview,
  loading,
  onChange,
  onClose,
  onSubmit,
  canEditSaleMargin,
}: {
  item: InventoryItem;
  draft: BatchDraft;
  unitCostPreview: number;
  salePricePreview: number;
  marginPreview: number;
  loading: boolean;
  onChange: (draft: BatchDraft) => void;
  onClose: () => void;
  onSubmit: () => void;
  canEditSaleMargin: boolean;
}) {
  const set = (patch: Partial<BatchDraft>) => onChange({ ...draft, ...patch });
  const saleMarginValue = canEditSaleMargin ? draft.margen_venta_porcentaje : DEFAULT_SALE_MARGIN_PERCENT;

  return (
    <Modal title="Registrar compra" subtitle={`Lote para ${item.nombre}`} onClose={onClose}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={panelStyle}>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Ejemplo</div>
          <div style={{ fontWeight: 950, marginTop: 4 }}>Lote Bs 10 / 10 unidades = Bs 1.00 costo unitario. Si es para venta, el sistema suma 50%: Bs 1.50.</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Fecha compra" type="date" value={draft.fecha_compra} onChange={(event) => set({ fecha_compra: event.target.value })} />
          <Input label="Proveedor" value={draft.proveedor ?? ""} onChange={(event) => set({ proveedor: event.target.value })} placeholder="Opcional" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <Input label="Cantidad / stock a ingresar" type="number" min="0.01" step="0.01" value={draft.cantidad} onChange={(event) => set({ cantidad: event.target.value })} />
          <Input label="Costo total lote" type="number" min="0" step="0.01" value={draft.costo_total} onChange={(event) => set({ costo_total: event.target.value })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: item.es_para_venta ? "1fr 1fr" : "1fr", gap: 12 }}>
          <Input label="Stock minimo" type="number" min="0" step="0.01" value={draft.stock_minimo} onChange={(event) => set({ stock_minimo: event.target.value })} />
          {item.es_para_venta && (
            <Input
              label="Margen venta %"
              type="number"
              min="0"
              step="0.01"
              value={saleMarginValue}
              disabled={!canEditSaleMargin}
              onChange={(event) => set({ margen_venta_porcentaje: event.target.value })}
            />
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div style={panelStyle}><strong>{money(unitCostPreview)}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Costo unitario</div></div>
          <div style={panelStyle}><strong>{item.es_para_venta ? money(salePricePreview) : "-"}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Venta sugerida</div></div>
          <div style={panelStyle}><strong style={{ color: marginPreview >= 0 ? "#8ee59f" : "#ffb4b4" }}>{item.es_para_venta ? money(marginPreview) : "-"}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Margen unitario</div></div>
        </div>
        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={draft.compra_por_mayor} onChange={(event) => set({ compra_por_mayor: event.target.checked })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Compra por mayor / lote</span>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Notas</span>
          <textarea value={draft.notas ?? ""} onChange={(event) => set({ notas: event.target.value })} rows={3} style={{ ...selectStyle, resize: "vertical" }} />
        </label>
        <Button onClick={onSubmit} disabled={loading || !Number(draft.cantidad) || !Number(draft.costo_total)} fullWidth>
          {loading ? <Loader label="Registrando..." /> : "Registrar compra y sumar stock"}
        </Button>
      </div>
    </Modal>
  );
}
