import type { ModuleKey } from "./modules";

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  role: string;
  modules: ModuleKey[];
  date_joined: string;
}

export interface ManagedUserWriteDTO {
  username: string;
  email?: string;
  password?: string;
  is_active: boolean;
  is_staff: boolean;
  role: string;
  modules: ModuleKey[];
}
