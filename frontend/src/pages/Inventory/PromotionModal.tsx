import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import type { Espacio } from "../../models/espacio";
import type {
  InventoryItem,
  InventoryPromotionPriority,
  InventoryPromotionType,
  InventoryPromotionWeekday,
  InventoryPromotionWriteDTO,
} from "../../models/inventory";
import { PROMOTION_PRIORITIES, PROMOTION_TYPES, WEEKDAYS } from "./constants";
import { Modal, panelStyle, selectStyle } from "./shared";

export default function PromotionModal({
  mode,
  draft,
  items,
  spaces,
  loading,
  onChange,
  onClose,
  onSubmit,
  onDelete,
}: {
  mode: "create" | "edit";
  draft: InventoryPromotionWriteDTO;
  items: InventoryItem[];
  spaces: Espacio[];
  loading: boolean;
  onChange: (draft: InventoryPromotionWriteDTO) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const set = (patch: Partial<InventoryPromotionWriteDTO>) => onChange({ ...draft, ...patch });
  const saleItems = items.filter((item) => item.activo && item.es_para_venta);
  const selectedDays = draft.dias_semana_lista ?? [];
  const selectedSpaces = draft.espacios ?? [];
  const needsGift = draft.tipo === "item_regalo";
  const needsFreeHours = draft.tipo === "horas_gratis";
  const needsDiscount = draft.tipo === "descuento";
  const disabled =
    loading ||
    !draft.nombre.trim() ||
    (needsGift && (!draft.item_regalo || !Number(draft.cantidad_item_regalo))) ||
    (needsFreeHours && (!Number(draft.horas_pagadas) || !Number(draft.horas_gratis))) ||
    (needsDiscount && !Number(draft.descuento_porcentaje));

  const toggleDay = (day: InventoryPromotionWeekday) => {
    set({
      dias_semana_lista: selectedDays.includes(day)
        ? selectedDays.filter((current) => current !== day)
        : [...selectedDays, day],
    });
  };

  const toggleSpace = (spaceId: string) => {
    set({
      espacios: selectedSpaces.includes(spaceId)
        ? selectedSpaces.filter((current) => current !== spaceId)
        : [...selectedSpaces, spaceId],
    });
  };

  return (
    <Modal
      title={mode === "create" ? "Nueva promocion" : "Editar promocion"}
      subtitle="Configura beneficios para reservas, fechas especiales o reglas manuales."
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div style={panelStyle}>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Ejemplos</div>
          <div style={{ fontWeight: 900, marginTop: 4, lineHeight: 1.45 }}>
            Reserva 2 horas y recibe 1 Coca-Cola personal. Miercoles: paga 3 horas y recibe 1 hora gratis. Festivos: descuento especial.
          </div>
        </div>

        <Input label="Nombre" value={draft.nombre} onChange={(event) => set({ nombre: event.target.value })} placeholder="Ej: Miercoles 3+1, Promo festivo, Reserva con bebida" />

        <div style={{ display: "grid", gridTemplateColumns: needsFreeHours ? "1fr" : "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Tipo de promocion</span>
            <select
              value={draft.tipo}
              onChange={(event) => {
                const tipo = event.target.value as InventoryPromotionType;
                set({ tipo, min_reserva_minutos: tipo === "horas_gratis" ? 0 : draft.min_reserva_minutos });
              }}
              style={selectStyle}
            >
              {PROMOTION_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </select>
          </label>
          {!needsFreeHours && (
            <Input label="Reserva minima (minutos)" type="number" min="0" step="15" value={String(draft.min_reserva_minutos ?? 0)} onChange={(event) => set({ min_reserva_minutos: Number(event.target.value || 0) })} />
          )}
        </div>

        {needsGift && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Item de regalo</span>
              <select value={draft.item_regalo ?? ""} onChange={(event) => set({ item_regalo: event.target.value })} style={selectStyle}>
                <option value="">Seleccionar item</option>
                {saleItems.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
              </select>
            </label>
            <Input label="Cantidad" type="number" min="1" step="1" value={draft.cantidad_item_regalo ?? "1"} onChange={(event) => set({ cantidad_item_regalo: event.target.value })} />
          </div>
        )}

        {needsFreeHours && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...panelStyle, color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.45 }}>
              Para horas gratis no hace falta reserva minima: si el cliente paga estas horas, el sistema agrega las horas gratis al final. Si ese horario ya esta ocupado, genera saldo pendiente para canjear despues.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Horas pagadas" type="number" min="0.01" step="0.5" value={draft.horas_pagadas ?? "0"} onChange={(event) => set({ horas_pagadas: event.target.value, min_reserva_minutos: 0 })} />
              <Input label="Horas gratis" type="number" min="0.01" step="0.5" value={draft.horas_gratis ?? "0"} onChange={(event) => set({ horas_gratis: event.target.value, min_reserva_minutos: 0 })} />
            </div>
          </div>
        )}

        {needsDiscount && (
          <Input label="Descuento %" type="number" min="0.01" max="100" step="0.01" value={draft.descuento_porcentaje ?? "0"} onChange={(event) => set({ descuento_porcentaje: event.target.value })} />
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Fecha inicio (opcional)" type="date" value={draft.fecha_inicio ?? ""} onChange={(event) => set({ fecha_inicio: event.target.value })} />
          <Input label="Fecha fin (opcional)" type="date" value={draft.fecha_fin ?? ""} onChange={(event) => set({ fecha_fin: event.target.value })} />
        </div>

        <div style={panelStyle}>
          <div style={{ color: "var(--color-text-muted)", fontSize: 12, marginBottom: 8 }}>Dias de la semana</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {WEEKDAYS.map((day) => (
              <Button key={day.key} size="sm" variant={selectedDays.includes(day.key) ? "primary" : "outline"} onClick={() => toggleDay(day.key)}>
                {day.label}
              </Button>
            ))}
          </div>
        </div>

        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={draft.aplica_festivos} onChange={(event) => set({ aplica_festivos: event.target.checked })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Aplicar tambien en dias festivos</span>
        </label>

        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={draft.aplica_todos_los_espacios} onChange={(event) => set({ aplica_todos_los_espacios: event.target.checked, espacios: event.target.checked ? [] : draft.espacios })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Aplica a todos los espacios</span>
        </label>

        {!draft.aplica_todos_los_espacios && (
          <div style={{ ...panelStyle, display: "grid", gap: 8, maxHeight: 180, overflow: "auto" }}>
            {spaces.map((space) => (
              <label key={space.id} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" checked={selectedSpaces.includes(space.id)} onChange={() => toggleSpace(space.id)} />
                <span>{space.nombre}</span>
              </label>
            ))}
            {spaces.length === 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No hay espacios cargados.</div>}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Prioridad</span>
            <select value={draft.prioridad ?? "media"} onChange={(event) => set({ prioridad: event.target.value as InventoryPromotionPriority })} style={selectStyle}>
              {PROMOTION_PRIORITIES.map((priority) => <option key={priority.key} value={priority.key}>{priority.label}</option>)}
            </select>
            <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
              Alta gana sobre media y baja cuando varias promociones aplican a la misma reserva.
            </span>
          </label>
          <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={draft.combinable} onChange={(event) => set({ combinable: event.target.checked })} />
            <span style={{ fontSize: 13, fontWeight: 850 }}>Combinable con otras promociones</span>
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Descripcion</span>
          <textarea value={draft.descripcion ?? ""} onChange={(event) => set({ descripcion: event.target.value })} rows={3} style={{ ...selectStyle, resize: "vertical" }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>Notas internas</span>
          <textarea value={draft.notas ?? ""} onChange={(event) => set({ notas: event.target.value })} rows={3} style={{ ...selectStyle, resize: "vertical" }} />
        </label>

        <label style={{ ...panelStyle, display: "flex", gap: 10, alignItems: "center" }}>
          <input type="checkbox" checked={draft.activo} onChange={(event) => set({ activo: event.target.checked })} />
          <span style={{ fontSize: 13, fontWeight: 850 }}>Promocion activa</span>
        </label>

        <Button onClick={onSubmit} disabled={disabled} fullWidth>
          {loading ? <Loader label="Guardando..." /> : mode === "create" ? "Crear promocion" : "Guardar cambios"}
        </Button>
        {mode === "edit" && onDelete && (
          <Button variant="danger" onClick={onDelete} disabled={loading} fullWidth>
            Eliminar promocion
          </Button>
        )}
      </div>
    </Modal>
  );
}
