export type InventoryItemType = "consumible" | "mantenimiento" | "variado";
export type InventoryUnit = "unidad";
export type InventoryPromotionType = "item_regalo" | "horas_gratis" | "descuento" | "personalizada";
export type InventoryPromotionWeekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
export type InventoryPromotionPriority = "baja" | "media" | "alta";

export interface InventoryPurchaseBatch {
  id: string;
  item: string;
  item_nombre?: string;
  fecha_compra: string;
  proveedor: string;
  cantidad: string;
  costo_total: string;
  costo_unitario: string;
  precio_venta_unitario: string;
  compra_por_mayor: boolean;
  notas: string;
  creado_por?: number | null;
  creado_por_username?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  nombre: string;
  tipo: InventoryItemType;
  tipo_label?: string;
  unidad: InventoryUnit;
  unidad_label?: string;
  descripcion: string;
  sku?: string | null;
  stock_actual: string;
  stock_minimo: string;
  stock_bajo: boolean;
  es_para_venta: boolean;
  margen_venta_porcentaje: string;
  requiere_mantenimiento: boolean;
  fecha_ultimo_mantenimiento?: string | null;
  fecha_proximo_mantenimiento?: string | null;
  precio_venta_sugerido: string;
  margen_sugerido: string;
  activo: boolean;
  ultimo_lote?: {
    id: string;
    fecha_compra: string;
    cantidad: string;
    costo_unitario: string;
    precio_venta_unitario: string;
    compra_por_mayor: boolean;
    proveedor: string;
  } | null;
  lotes_count: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemWriteDTO {
  nombre: string;
  tipo: InventoryItemType;
  unidad: InventoryUnit;
  descripcion?: string;
  sku?: string;
  stock_actual?: string;
  stock_minimo?: string;
  es_para_venta?: boolean;
  margen_venta_porcentaje?: string;
  requiere_mantenimiento?: boolean;
  fecha_ultimo_mantenimiento?: string | null;
  fecha_proximo_mantenimiento?: string | null;
  activo: boolean;
}

export interface InventoryPurchaseBatchWriteDTO {
  item: string;
  fecha_compra: string;
  proveedor?: string;
  cantidad: string;
  costo_total: string;
  compra_por_mayor: boolean;
  notas?: string;
}

export interface InventoryPromotion {
  id: string;
  nombre: string;
  tipo: InventoryPromotionType;
  tipo_label?: string;
  descripcion: string;
  activo: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  dias_semana: string;
  dias_semana_display: string[];
  aplica_festivos: boolean;
  min_reserva_minutos: number;
  horas_pagadas: string;
  horas_gratis: string;
  descuento_porcentaje: string;
  item_regalo?: string | null;
  item_regalo_nombre?: string | null;
  cantidad_item_regalo: string;
  aplica_todos_los_espacios: boolean;
  espacios: string[];
  espacios_nombres: string[];
  prioridad: InventoryPromotionPriority;
  prioridad_label?: string;
  combinable: boolean;
  notas: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryPromotionWriteDTO {
  nombre: string;
  tipo: InventoryPromotionType;
  descripcion?: string;
  activo: boolean;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  dias_semana_lista?: InventoryPromotionWeekday[];
  aplica_festivos: boolean;
  min_reserva_minutos: number;
  horas_pagadas?: string;
  horas_gratis?: string;
  descuento_porcentaje?: string;
  item_regalo?: string | null;
  cantidad_item_regalo?: string;
  aplica_todos_los_espacios: boolean;
  espacios?: string[];
  prioridad: InventoryPromotionPriority;
  combinable: boolean;
  notas?: string;
}
