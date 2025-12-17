export interface TipoActividad {
  id: string; // UUID
  nombre: string;
  descripcion: string;
  activo: boolean;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface EspacioActividad {
  id: string; // UUID
  espacio: string; // UUID
  espacio_nombre?: string;
  tipo: string; // UUID (TipoActividad)
  tipo_nombre?: string;
  duracion_minutos: number;
  precio_base: string; // DRF suele devolver decimal como string
  activo: boolean;
  created_at: string; // ISO
  updated_at: string; // ISO
}
