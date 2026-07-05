import type { InventoryItemType, InventoryPromotionPriority, InventoryPromotionType, InventoryPromotionWeekday } from "../../models/inventory";

export const ITEM_TYPES: Array<{ key: InventoryItemType; label: string; description: string }> = [
  { key: "consumible", label: "Consumibles", description: "Comida, bebidas e insumos que se venden o consumen." },
  { key: "mantenimiento", label: "Con mantenimiento", description: "Balones, redes, conos y equipamiento con revision." },
  { key: "variado", label: "Variados", description: "Cualquier item fuera de las categorias principales." },
];

export const PROMOTION_TYPES: Array<{ key: InventoryPromotionType; label: string; description: string }> = [
  { key: "item_regalo", label: "Item de regalo", description: "Ej: reserva 2 horas y recibe una Coca-Cola personal." },
  { key: "horas_gratis", label: "Horas gratis", description: "Ej: miercoles reserva 3 horas y recibe 1 hora gratis." },
  { key: "descuento", label: "Descuento", description: "Promocion porcentual para fechas, festivos o dias especificos." },
  { key: "personalizada", label: "Personalizada", description: "Regla flexible para variaciones que se aplicaran manualmente." },
];

export const WEEKDAYS: Array<{ key: InventoryPromotionWeekday; label: string }> = [
  { key: "MO", label: "Lun" },
  { key: "TU", label: "Mar" },
  { key: "WE", label: "Mie" },
  { key: "TH", label: "Jue" },
  { key: "FR", label: "Vie" },
  { key: "SA", label: "Sab" },
  { key: "SU", label: "Dom" },
];

export const PROMOTION_PRIORITIES: Array<{ key: InventoryPromotionPriority; label: string; description: string }> = [
  { key: "baja", label: "Baja", description: "Se usa si no hay una promocion mejor para esa reserva." },
  { key: "media", label: "Media", description: "Prioridad normal para promociones comunes." },
  { key: "alta", label: "Alta", description: "Gana cuando varias promociones aplican al mismo horario." },
];
