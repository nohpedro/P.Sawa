export const MODULES = [
  { key: "availability", label: "Disponibilidad" },
  { key: "reservations", label: "Reservas" },
  { key: "history", label: "Historial" },
  { key: "customers", label: "Clientes" },
  { key: "spaces", label: "Espacios" },
  { key: "activities", label: "Actividades" },
  { key: "space_activities", label: "Designacion de actividades" },
  { key: "inventory", label: "Inventario" },
  { key: "inventory_batches", label: "Registrar lotes" },
  { key: "inventory_promotions", label: "Promociones" },
  { key: "inventory_sale_margin", label: "Editar margen venta" },
  { key: "product_sales", label: "Venta de productos" },
  { key: "sales_history", label: "Historial de ventas" },
  { key: "business_goals", label: "Metas empresariales" },
  { key: "users", label: "Usuarios y roles" },
  { key: "audit", label: "Auditoria" },
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
