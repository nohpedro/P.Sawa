export const MODULES = [
  { key: "availability", label: "Disponibilidad" },
  { key: "reservations", label: "Reservas" },
  { key: "history", label: "Historial" },
  { key: "customers", label: "Clientes" },
  { key: "spaces", label: "Espacios" },
  { key: "activities", label: "Actividades" },
  { key: "space_activities", label: "Designacion de actividades" },
  { key: "users", label: "Usuarios y roles" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];

export function hasModule(
  user: { is_superuser?: boolean; modules?: string[] } | null | undefined,
  module: ModuleKey
): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  return (user.modules ?? []).includes(module);
}

export function moduleLabel(key: string): string {
  return MODULES.find((module) => module.key === key)?.label ?? key;
}
