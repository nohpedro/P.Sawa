export type ReservaEstado = "RESERVADA" | "ACTIVA" | "CANCELADA" | "FINALIZADA";

export interface Reserva {
  id: string; // UUID
  espacio: string; // UUID
  espacio_nombre?: string;

  usuario: string; // UUID
  usuario_username?: string;

  actividad: string | null; // UUID TipoActividad o null

  inicio: string; // ISO
  fin: string;    // ISO

  estado: ReservaEstado;
  notas: string;

  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface ReservaCreateDTO {
  espacio: string;
  usuario?: string;   // admin only (self-service: backend lo toma del token)
  actividad: string;
  inicio: string;     // ISO
  bloques: number;    // 1 = base; 2 = doble; etc.
  notas?: string;
}
