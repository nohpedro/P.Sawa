export type ReservaEstado = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "FINALIZADA";

export interface Reserva {
  id: string; // UUID

  espacio: string; // UUID
  espacio_nombre?: string;

  usuario: number; // según tu API (viene como 3)
  usuario_username?: string;

  // datos del cliente (solo lectura en response)
  cliente_nombre?: string;
  cliente_apellido?: string;

  actividad: string; // UUID
  actividad_nombre?: string;
  inicio: string; // ISO
  fin: string; // ISO
  duracion_minutos?: number;
  monto_estimado?: string;

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
  notas?: string;
}
