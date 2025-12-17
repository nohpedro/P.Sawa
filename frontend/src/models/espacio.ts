import type { TipoActividad } from "./actividad";

export interface Espacio {
  id: string; // UUID
  nombre: string;
  descripcion: string;
  capacidad: number;
  estado: string;        // viene de choices (ej: "Disponible")
  ubicacion: string;
  tags: string;          // CSV
  actividades: TipoActividad[];
  created_at: string;    // ISO
  updated_at: string;    // ISO
}

/**
 * DTO opcional (admin) si en algún momento el frontend crea/edita espacios.
 * En lectura el backend devuelve "actividades" embebidas.
 * En escritura acepta "tipo_ids" + defaults.
 */
export interface EspacioWriteDTO {
  nombre: string;
  descripcion?: string;
  capacidad?: number;
  estado?: string;
  ubicacion?: string;
  tags?: string;

  tipo_ids?: string[]; // UUIDs de TipoActividad
  duracion_minutos_default?: number;
  precio_base_default?: string;
}
