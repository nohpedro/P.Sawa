export interface Cliente {
  id: string; // UUID
  username: string;
  email: string;

  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  notas: string;

  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface ClienteWriteDTO {
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  notas: string;
}
