// src/models/espacio.ts

export type UUID = string;

export interface TipoActividad {
  id: UUID;
  nombre: string;
  descripcion: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Valores vienen del enum EspaciosEstado (backend)
export type EspacioEstadoOperativo = "DISPONIBLE" | "MANTENIMIENTO" | "FUERA_DE_SERVICIO";

// Campo calculado (backend) para GET
export type EspacioEstadoActual = "LIBRE" | "OCUPADO" | "NO_DISPONIBLE";

export interface Espacio {
  id: UUID;
  nombre: string;
  descripcion: string;
  capacidad: number;

  // NUEVO: renombrado en backend
  estado_operativo: EspacioEstadoOperativo;

  // NUEVO: calculado en backend (solo lectura)
  estado_actual: EspacioEstadoActual;

  ubicacion: string;
  tags: string;

  // Lectura (incluye objetos completos)
  actividades: TipoActividad[];

  created_at: string;
  updated_at: string;
}


export interface EspacioWriteDTO {
  nombre: string;
  descripcion?: string;
  capacidad: number;

  // NUEVO: renombrado en backend
  estado_operativo: EspacioEstadoOperativo;

  ubicacion?: string;
  tags?: string;

  // para asociar actividades por ID
  tipo_ids?: UUID[];

  // defaults para nuevas relaciones EspacioActividad (solo si mandas tipo_ids)
  duracion_minutos_default?: number;
  precio_base_default?: string; // DRF manda Decimal como string (recomendado)
}

/**
 * Si quieres usar patch con menos campos sin pelearte con TS
 */
export type EspacioPatchDTO = Partial<EspacioWriteDTO>;
