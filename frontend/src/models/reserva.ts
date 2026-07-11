export type ReservaEstado = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "FINALIZADA";
export type ReservaPromotionCreditStatus = "PENDIENTE" | "PARCIAL" | "USADO" | "CANCELADO";

export interface ReservaPromotionApplied {
  tipo: "horas_gratis" | "item_regalo" | "descuento" | "saldo_pendiente" | string;
  nombre: string;
  beneficio?: string;
  detalle?: string;
  estado?: string;
  promocion_id?: string;
  minutos?: number;
  item_regalo_nombre?: string;
  cantidad?: string;
  entregable?: boolean;
  entregada?: boolean;
  entregada_en?: string;
  entregada_por?: string;
  descuento_porcentaje?: string;
}

export interface ReservaPromotionCredit {
  id: string;
  cliente: string;
  cliente_nombre?: string;
  promocion?: string | null;
  promocion_nombre?: string | null;
  reserva_origen?: string | null;
  reserva_canje?: string | null;
  minutos_total: number;
  minutos_disponibles: number;
  estado: ReservaPromotionCreditStatus;
  notas: string;
  created_at: string;
  updated_at: string;
}

export interface Reserva {
  id: string; // UUID

  espacio: string; // UUID
  espacio_nombre?: string;

  usuario: number; // según tu API (viene como 3)
  usuario_username?: string;

  cliente?: string | null;
  // datos del cliente (solo lectura en response)
  cliente_nombre?: string;
  cliente_apellido?: string;

  actividad: string; // UUID
  actividad_nombre?: string;
  inicio: string; // ISO
  fin: string; // ISO
  duracion_minutos?: number;
  monto_estimado?: string;
  descuento_promocion?: string | null;
  descuento_promocion_nombre?: string | null;
  credito_promocion_canjeado?: string | null;
  credito_promocion_canjeado_nombre?: string | null;
  promociones_aplicadas?: ReservaPromotionApplied[];
  minutos_promocion_gratis_aplicados?: number;
  minutos_promocion_pendientes_generados?: number;
  minutos_credito_aplicados?: number;

  estado_reserva: ReservaEstado;

  notas: string;

  created_at: string; // ISO
  updated_at: string; // ISO
}

/**
 * DTO para crear/editar reservas
 * - Admin puede enviar "usuario"
 * - No-admin: backend ignora usuario y toma del token (por eso usuario es opcional)
 */
export interface ReservaWriteDTO {
  espacio: string;      // UUID
  usuario?: number;
  cliente: string;
  actividad: string;    // UUID
  inicio: string;       // ISO
  fin: string;          // ISO
  descuento_promocion?: string | null;
  credito_promocion_canjeado?: string | null;
  notas?: string;
}
