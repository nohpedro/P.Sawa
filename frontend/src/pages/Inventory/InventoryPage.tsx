import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { InventoryItem, InventoryItemType, InventoryItemWriteDTO } from "../../models/inventory";
import inventoryService from "../../services/inventory.service";
import { getErrorMessage } from "../../utils/error";
import BatchModal, { type BatchDraft } from "./BatchModal";
import DeleteItemModal from "./DeleteItemModal";
import InventoryItemModal from "./InventoryItemModal";
import { ITEM_TYPES } from "./constants";
import { money, panelStyle, selectStyle } from "./shared";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };
type ModalMode = "create" | "edit" | "batch" | "delete" | null;

const emptyItem: InventoryItemWriteDTO = {
  nombre: "",
  tipo: "consumible",
  unidad: "unidad",
  descripcion: "",
  sku: "",
  stock_actual: "0",
  stock_minimo: "0",
  es_para_venta: false,
  margen_venta_porcentaje: "50",
  requiere_mantenimiento: false,
  fecha_ultimo_mantenimiento: "",
  fecha_proximo_mantenimiento: "",
  activo: true,
};

const emptyBatch: BatchDraft = {
  item: "",
  fecha_compra: new Date().toISOString().slice(0, 10),
  proveedor: "",
  cantidad: "10",
  costo_total: "10",
  stock_minimo: "0",
  margen_venta_porcentaje: "50",
  compra_por_mayor: true,
  notas: "",
};

function asPayload(item: InventoryItemWriteDTO): InventoryItemWriteDTO {
  return {
    ...item,
    nombre: item.nombre.trim(),
    descripcion: item.descripcion?.trim() ?? "",
    sku: item.sku?.trim() ?? "",
    fecha_ultimo_mantenimiento: item.fecha_ultimo_mantenimiento || null,
    fecha_proximo_mantenimiento: item.fecha_proximo_mantenimiento || null,
    requiere_mantenimiento: item.tipo === "mantenimiento" || !!item.requiere_mantenimiento,
    stock_actual: item.stock_actual || "0",
    stock_minimo: item.stock_minimo || "0",
    es_para_venta: !!item.es_para_venta,
    margen_venta_porcentaje: item.margen_venta_porcentaje || "50",
  };
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [itemDraft, setItemDraft] = useState<InventoryItemWriteDTO>(emptyItem);
  const [batchDraft, setBatchDraft] = useState<BatchDraft>(emptyBatch);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [typeFilter, setTypeFilter] = useState<InventoryItemType | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: "1", page_size: "100", ordering: "nombre" };
      if (typeFilter !== "all") params.tipo = typeFilter;
      const res = await inventoryService.listItems(params);
      setItems(res.results ?? []);
      if (selected?.id) {
        setSelected(res.results?.find((item) => item.id === selected.id) ?? null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cargar inventario."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.nombre} ${item.sku ?? ""} ${item.descripcion}`.toLowerCase().includes(q));
  }, [items, query]);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.stock_bajo) acc.stockBajo += 1;
        if (item.tipo === "consumible") acc.consumibles += 1;
        if (item.tipo === "mantenimiento") acc.mantenimiento += 1;
        if (item.tipo === "variado") acc.variados += 1;
        return acc;
      },
      { total: 0, stockBajo: 0, consumibles: 0, mantenimiento: 0, variados: 0 }
    );
  }, [items]);

  const unitCostPreview = useMemo(() => {
    const cantidad = Number(batchDraft.cantidad);
    const total = Number(batchDraft.costo_total);
    if (!cantidad || !total || cantidad <= 0) return 0;
    return total / cantidad;
  }, [batchDraft.cantidad, batchDraft.costo_total]);

  const salePricePreview = selected?.es_para_venta
    ? unitCostPreview * (1 + Number(batchDraft.margen_venta_porcentaje || 50) / 100)
    : 0;
  const marginPreview = salePricePreview - unitCostPreview;

  const openCreate = () => {
    setItemDraft(emptyItem);
    setSelected(null);
    setModalMode("create");
  };

  const openEdit = (item: InventoryItem) => {
    setSelected(item);
    setItemDraft({
      nombre: item.nombre,
      tipo: item.tipo,
      unidad: item.unidad,
      descripcion: item.descripcion ?? "",
      sku: item.sku ?? "",
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
      requiere_mantenimiento: item.requiere_mantenimiento,
      es_para_venta: item.es_para_venta,
      margen_venta_porcentaje: item.margen_venta_porcentaje || "50",
      fecha_ultimo_mantenimiento: item.fecha_ultimo_mantenimiento ?? "",
      fecha_proximo_mantenimiento: item.fecha_proximo_mantenimiento ?? "",
      activo: item.activo,
    });
    setModalMode("edit");
  };

  const openBatch = (item: InventoryItem) => {
    setSelected(item);
    setBatchDraft({
      ...emptyBatch,
      item: item.id,
      stock_minimo: item.stock_minimo || "0",
      margen_venta_porcentaje: item.margen_venta_porcentaje || "50",
    });
    setModalMode("batch");
  };

  const onCreate = async () => {
    if (!itemDraft.nombre.trim()) return;
    setLoading(true);
    try {
      const created = await inventoryService.createItem(asPayload(itemDraft));
      setSelected(created);
      setModalMode(null);
      setToast({ open: true, message: "Item creado.", type: "success" });
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo crear el item."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!selected || !itemDraft.nombre.trim()) return;
    setLoading(true);
    try {
      const updated = await inventoryService.patchItem(selected.id, asPayload(itemDraft));
      setSelected(updated);
      setModalMode(null);
      setToast({ open: true, message: "Item actualizado.", type: "success" });
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo guardar el item."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await inventoryService.removeItem(selected.id);
      setSelected(null);
      setModalMode(null);
      setToast({ open: true, message: "Item eliminado.", type: "success" });
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar el item."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onCreateBatch = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await inventoryService.patchItem(selected.id, {
        stock_minimo: batchDraft.stock_minimo || "0",
        ...(selected.es_para_venta ? { margen_venta_porcentaje: batchDraft.margen_venta_porcentaje || "50" } : {}),
      });
      await inventoryService.createBatch({
        item: selected.id,
        fecha_compra: batchDraft.fecha_compra,
        cantidad: batchDraft.cantidad,
        costo_total: batchDraft.costo_total,
        compra_por_mayor: batchDraft.compra_por_mayor,
        proveedor: batchDraft.proveedor?.trim() ?? "",
        notas: batchDraft.notas?.trim() ?? "",
      });
      setModalMode(null);
      setToast({ open: true, message: "Compra registrada y stock actualizado.", type: "success" });
      await load();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo registrar la compra."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Items y lotes"
        subtitle="Controla consumibles, equipamiento con mantenimiento y articulos variados."
        rightSlot={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={openCreate}>+ Nuevo item</Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div style={panelStyle}><strong>{stats.total}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Items</div></div>
          <div style={panelStyle}><strong style={{ color: stats.stockBajo ? "#ffb4b4" : "#8ee59f" }}>{stats.stockBajo}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Stock bajo</div></div>
          <div style={panelStyle}><strong>{stats.consumibles}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Consumibles</div></div>
          <div style={panelStyle}><strong>{stats.mantenimiento}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Mantenimiento</div></div>
        </div>
      </Card>

      <Card title="Listado" subtitle="Selecciona un item para editarlo o registrar una compra por lote.">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 220px", gap: 12 }}>
            <Input label="Buscar" placeholder="Nombre, codigo o descripcion..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Categoria</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as InventoryItemType | "all")} style={selectStyle}>
                <option value="all">Todas</option>
                {ITEM_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant={typeFilter === "all" ? "primary" : "outline"} onClick={() => setTypeFilter("all")}>
              Todos
            </Button>
            {ITEM_TYPES.map((type) => (
              <Button key={type.key} size="sm" variant={typeFilter === type.key ? "primary" : "outline"} onClick={() => setTypeFilter(type.key)}>
                {type.label}
              </Button>
            ))}
          </div>

          {loading && <Loader label="Cargando inventario..." />}
          {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 650, overflow: "auto" }}>
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openEdit(item)}
                style={{
                  border: `1px solid ${item.stock_bajo ? "rgba(255,82,82,0.55)" : "var(--color-border)"}`,
                  borderRadius: 8,
                  background: item.stock_bajo ? "rgba(255,82,82,0.06)" : "#0f1420",
                  color: "var(--color-text)",
                  padding: 14,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 0.8fr 0.8fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{item.nombre}</strong>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                      {item.tipo_label ?? item.tipo} - {item.es_para_venta ? "Para venta" : "Uso interno"} - {item.sku || "Sin codigo"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{Number(item.stock_actual).toFixed(2)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Unidades</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{money(item.precio_venta_sugerido)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Venta sugerida</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openBatch(item); }}>
                      + Lote
                    </Button>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openEdit(item); }}>
                      Editar
                    </Button>
                  </div>
                </div>
              </button>
            ))}
            {!loading && filtered.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay items para mostrar.</div>}
          </div>
        </div>
      </Card>

      {(modalMode === "create" || modalMode === "edit") && createPortal(
        <InventoryItemModal
          mode={modalMode}
          draft={itemDraft}
          loading={loading}
          onChange={setItemDraft}
          onClose={() => setModalMode(null)}
          onSubmit={() => void (modalMode === "create" ? onCreate() : onSave())}
          onDelete={modalMode === "edit" ? () => setModalMode("delete") : undefined}
        />,
        document.body
      )}

      {modalMode === "batch" && selected && createPortal(
        <BatchModal
          item={selected}
          draft={batchDraft}
          unitCostPreview={unitCostPreview}
          salePricePreview={salePricePreview}
          marginPreview={marginPreview}
          loading={loading}
          onChange={setBatchDraft}
          onClose={() => setModalMode(null)}
          onSubmit={() => void onCreateBatch()}
        />,
        document.body
      )}

      {modalMode === "delete" && selected && createPortal(
        <DeleteItemModal
          item={selected}
          loading={loading}
          onClose={() => setModalMode("edit")}
          onConfirm={() => void onDelete()}
        />,
        document.body
      )}

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />
    </div>
  );
}
