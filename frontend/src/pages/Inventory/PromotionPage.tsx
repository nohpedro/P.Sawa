import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Toast from "../../components/ui/Toast";
import type { Espacio } from "../../models/espacio";
import type {
  InventoryItem,
  InventoryPromotion,
  InventoryPromotionType,
  InventoryPromotionWeekday,
  InventoryPromotionWriteDTO,
} from "../../models/inventory";
import espaciosService from "../../services/espacios.service";
import inventoryService from "../../services/inventory.service";
import { getErrorMessage } from "../../utils/error";
import DeletePromotionModal from "./DeletePromotionModal";
import PromotionModal from "./PromotionModal";
import { PROMOTION_TYPES } from "./constants";
import { panelStyle, selectStyle } from "./shared";

type ToastState = { open: boolean; message: string; type: "info" | "success" | "error" };
type ModalMode = "create" | "edit" | "delete" | null;

const emptyPromotion: InventoryPromotionWriteDTO = {
  nombre: "",
  tipo: "item_regalo",
  descripcion: "",
  activo: true,
  fecha_inicio: "",
  fecha_fin: "",
  dias_semana_lista: [],
  aplica_festivos: false,
  min_reserva_minutos: 120,
  horas_pagadas: "0",
  horas_gratis: "0",
  descuento_porcentaje: "0",
  item_regalo: "",
  cantidad_item_regalo: "1",
  aplica_todos_los_espacios: true,
  espacios: [],
  prioridad: "media",
  combinable: false,
  notas: "",
};

function promotionDays(promotion: InventoryPromotion): InventoryPromotionWeekday[] {
  return (promotion.dias_semana ? promotion.dias_semana.split(",") : []).filter(Boolean) as InventoryPromotionWeekday[];
}

function asPromotionPayload(promotion: InventoryPromotionWriteDTO): InventoryPromotionWriteDTO {
  return {
    ...promotion,
    nombre: promotion.nombre.trim(),
    descripcion: promotion.descripcion?.trim() ?? "",
    notas: promotion.notas?.trim() ?? "",
    fecha_inicio: promotion.fecha_inicio || null,
    fecha_fin: promotion.fecha_fin || null,
    dias_semana_lista: promotion.dias_semana_lista ?? [],
    min_reserva_minutos: promotion.tipo === "horas_gratis" ? 0 : Number(promotion.min_reserva_minutos || 0),
    horas_pagadas: promotion.tipo === "horas_gratis" ? promotion.horas_pagadas || "0" : "0",
    horas_gratis: promotion.tipo === "horas_gratis" ? promotion.horas_gratis || "0" : "0",
    descuento_porcentaje: promotion.tipo === "descuento" ? promotion.descuento_porcentaje || "0" : "0",
    item_regalo: promotion.tipo === "item_regalo" ? promotion.item_regalo || null : null,
    cantidad_item_regalo: promotion.tipo === "item_regalo" ? promotion.cantidad_item_regalo || "1" : "0",
    espacios: promotion.aplica_todos_los_espacios ? [] : promotion.espacios ?? [],
  };
}

function promotionRuleSummary(promotion: InventoryPromotion) {
  if (promotion.tipo === "item_regalo") return `${Number(promotion.cantidad_item_regalo).toFixed(0)} x ${promotion.item_regalo_nombre ?? "item"}`;
  if (promotion.tipo === "horas_gratis") return `${promotion.horas_pagadas}h + ${promotion.horas_gratis}h gratis`;
  if (promotion.tipo === "descuento") return `${promotion.descuento_porcentaje}% descuento`;
  return "Regla personalizada";
}

function promotionScopeSummary(promotion: InventoryPromotion) {
  const days = promotion.dias_semana_display?.length ? promotion.dias_semana_display.join(", ") : "Todos los dias";
  const dates = promotion.fecha_inicio || promotion.fecha_fin ? `${promotion.fecha_inicio ?? "Inicio libre"} a ${promotion.fecha_fin ?? "Sin fin"}` : "Sin rango";
  const spaces = promotion.aplica_todos_los_espacios ? "Todos los espacios" : `${promotion.espacios_nombres?.length ?? 0} espacios`;
  return `${days} - ${dates} - ${spaces}`;
}

export default function PromotionPage() {
  const [promotions, setPromotions] = useState<InventoryPromotion[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [spaces, setSpaces] = useState<Espacio[]>([]);
  const [selectedPromotion, setSelectedPromotion] = useState<InventoryPromotion | null>(null);
  const [promotionDraft, setPromotionDraft] = useState<InventoryPromotionWriteDTO>(emptyPromotion);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [promotionTypeFilter, setPromotionTypeFilter] = useState<InventoryPromotionType | "all">("all");
  const [promotionStatusFilter, setPromotionStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [promotionQuery, setPromotionQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({ open: false, message: "", type: "info" });

  const loadPromotions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { page: "1", page_size: "100", ordering: "prioridad,nombre" };
      if (promotionTypeFilter !== "all") params.tipo = promotionTypeFilter;
      if (promotionStatusFilter !== "all") params.activo = promotionStatusFilter === "active" ? "true" : "false";
      const res = await inventoryService.listPromotions(params);
      setPromotions(res.results ?? []);
      if (selectedPromotion?.id) {
        setSelectedPromotion(res.results?.find((promotion) => promotion.id === selectedPromotion.id) ?? null);
      }
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las promociones."));
    } finally {
      setLoading(false);
    }
  };

  const loadReferences = async () => {
    try {
      const [itemsRes, spacesRes] = await Promise.all([
        inventoryService.listItems({ page: "1", page_size: "200", ordering: "nombre" }),
        espaciosService.list({ page: "1", page_size: "200", ordering: "nombre" }),
      ]);
      setItems(itemsRes.results ?? []);
      setSpaces(spacesRes.results ?? []);
    } catch {
      // Las listas auxiliares no deben impedir ver promociones existentes.
    }
  };

  useEffect(() => {
    void loadReferences();
  }, []);

  useEffect(() => {
    void loadPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promotionTypeFilter, promotionStatusFilter]);

  const filteredPromotions = useMemo(() => {
    const q = promotionQuery.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter((promotion) =>
      `${promotion.nombre} ${promotion.descripcion} ${promotion.item_regalo_nombre ?? ""} ${promotion.espacios_nombres?.join(" ") ?? ""}`.toLowerCase().includes(q)
    );
  }, [promotions, promotionQuery]);

  const promotionStats = useMemo(() => {
    return promotions.reduce(
      (acc, promotion) => {
        acc.total += 1;
        if (promotion.activo) acc.active += 1;
        if (promotion.tipo === "item_regalo") acc.gifts += 1;
        if (promotion.tipo === "horas_gratis") acc.freeHours += 1;
        return acc;
      },
      { total: 0, active: 0, gifts: 0, freeHours: 0 }
    );
  }, [promotions]);

  const openCreatePromotion = () => {
    setPromotionDraft(emptyPromotion);
    setSelectedPromotion(null);
    setModalMode("create");
  };

  const openEditPromotion = (promotion: InventoryPromotion) => {
    setSelectedPromotion(promotion);
    setPromotionDraft({
      nombre: promotion.nombre,
      tipo: promotion.tipo,
      descripcion: promotion.descripcion ?? "",
      activo: promotion.activo,
      fecha_inicio: promotion.fecha_inicio ?? "",
      fecha_fin: promotion.fecha_fin ?? "",
      dias_semana_lista: promotionDays(promotion),
      aplica_festivos: promotion.aplica_festivos,
      min_reserva_minutos: promotion.tipo === "horas_gratis" ? 0 : promotion.min_reserva_minutos,
      horas_pagadas: promotion.horas_pagadas || "0",
      horas_gratis: promotion.horas_gratis || "0",
      descuento_porcentaje: promotion.descuento_porcentaje || "0",
      item_regalo: promotion.item_regalo ?? "",
      cantidad_item_regalo: promotion.cantidad_item_regalo || "1",
      aplica_todos_los_espacios: promotion.aplica_todos_los_espacios,
      espacios: promotion.espacios ?? [],
      prioridad: promotion.prioridad,
      combinable: promotion.combinable,
      notas: promotion.notas ?? "",
    });
    setModalMode("edit");
  };

  const onCreatePromotion = async () => {
    if (!promotionDraft.nombre.trim()) return;
    setLoading(true);
    try {
      const created = await inventoryService.createPromotion(asPromotionPayload(promotionDraft));
      setSelectedPromotion(created);
      setModalMode(null);
      setToast({ open: true, message: "Promocion creada.", type: "success" });
      await loadPromotions();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo crear la promocion."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onSavePromotion = async () => {
    if (!selectedPromotion || !promotionDraft.nombre.trim()) return;
    setLoading(true);
    try {
      const updated = await inventoryService.patchPromotion(selectedPromotion.id, asPromotionPayload(promotionDraft));
      setSelectedPromotion(updated);
      setModalMode(null);
      setToast({ open: true, message: "Promocion actualizada.", type: "success" });
      await loadPromotions();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo guardar la promocion."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onDeletePromotion = async () => {
    if (!selectedPromotion) return;
    setLoading(true);
    try {
      await inventoryService.removePromotion(selectedPromotion.id);
      setSelectedPromotion(null);
      setModalMode(null);
      setToast({ open: true, message: "Promocion eliminada.", type: "success" });
      await loadPromotions();
    } catch (err) {
      setToast({ open: true, message: getErrorMessage(err, "No se pudo eliminar la promocion."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card
        title="Promociones"
        subtitle="Administra reglas promocionales para reservas, fechas especiales e inventario."
        rightSlot={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={openCreatePromotion}>+ Nueva promocion</Button>
            <Button variant="outline" onClick={() => void loadPromotions()} disabled={loading}>
              Refrescar
            </Button>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div style={panelStyle}><strong>{promotionStats.total}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Promociones</div></div>
          <div style={panelStyle}><strong>{promotionStats.active}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Activas</div></div>
          <div style={panelStyle}><strong>{promotionStats.gifts}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Regalos</div></div>
          <div style={panelStyle}><strong>{promotionStats.freeHours}</strong><div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Horas gratis</div></div>
        </div>
        <div style={{ ...panelStyle, marginTop: 12, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
          <strong style={{ color: "var(--color-text)" }}>Prioridad:</strong> Alta gana sobre Media y Baja cuando varias promociones aplican al mismo horario.
          Media es la opcion normal. Baja queda como respaldo.
        </div>
      </Card>

      <Card title="Listado" subtitle="Crea reglas como 2 horas con bebida, festivos con descuento o miercoles 3+1.">
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 220px 180px", gap: 12 }}>
            <Input label="Buscar" placeholder="Nombre, item, espacio..." value={promotionQuery} onChange={(event) => setPromotionQuery(event.target.value)} />
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Tipo</span>
              <select value={promotionTypeFilter} onChange={(event) => setPromotionTypeFilter(event.target.value as InventoryPromotionType | "all")} style={selectStyle}>
                <option value="all">Todas</option>
                {PROMOTION_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Estado</span>
              <select value={promotionStatusFilter} onChange={(event) => setPromotionStatusFilter(event.target.value as "all" | "active" | "inactive")} style={selectStyle}>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
                <option value="all">Todas</option>
              </select>
            </label>
          </div>

          {loading && <Loader label="Cargando promociones..." />}
          {error && <div style={{ color: "#ff5252", fontSize: 13 }}>{error}</div>}

          <div style={{ ...panelStyle, display: "grid", gap: 10, maxHeight: 650, overflow: "auto" }}>
            {filteredPromotions.map((promotion) => (
              <button
                key={promotion.id}
                type="button"
                onClick={() => openEditPromotion(promotion)}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  background: promotion.activo ? "#0f1420" : "rgba(255,255,255,0.025)",
                  color: "var(--color-text)",
                  padding: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  opacity: promotion.activo ? 1 : 0.74,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) 0.9fr 0.9fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{promotion.nombre}</strong>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 4 }}>
                      {promotion.tipo_label ?? promotion.tipo} - {promotion.activo ? "Activa" : "Inactiva"} - Prioridad {promotion.prioridad_label ?? promotion.prioridad}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{promotionRuleSummary(promotion)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Beneficio</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 950 }}>{promotionScopeSummary(promotion)}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Aplicacion</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); openEditPromotion(promotion); }}>
                      Editar
                    </Button>
                  </div>
                </div>
              </button>
            ))}
            {!loading && filteredPromotions.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay promociones para mostrar.</div>}
          </div>
        </div>
      </Card>

      {(modalMode === "create" || modalMode === "edit") && createPortal(
        <PromotionModal
          mode={modalMode}
          draft={promotionDraft}
          items={items}
          spaces={spaces}
          loading={loading}
          onChange={setPromotionDraft}
          onClose={() => setModalMode(null)}
          onSubmit={() => void (modalMode === "create" ? onCreatePromotion() : onSavePromotion())}
          onDelete={modalMode === "edit" ? () => setModalMode("delete") : undefined}
        />,
        document.body
      )}

      {modalMode === "delete" && selectedPromotion && createPortal(
        <DeletePromotionModal
          promotion={selectedPromotion}
          loading={loading}
          onClose={() => setModalMode("edit")}
          onConfirm={() => void onDeletePromotion()}
        />,
        document.body
      )}

      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast((state) => ({ ...state, open: false }))} />
    </div>
  );
}
