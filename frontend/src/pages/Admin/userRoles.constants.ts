import type { ModuleKey } from "../../models/modules";
import type { ManagedUserWriteDTO } from "../../models/user";

export const USER_ROLES_PAGE_SIZE = 5;

export const MODULE_SECTIONS: Array<{
  title: string;
  description: string;
  modules: ModuleKey[];
  includedViews?: string[];
}> = [
  {
    title: "Operacion",
    description: "Pantallas de disponibilidad y uso diario.",
    modules: ["availability"],
  },
  {
    title: "Reservacion",
    description: "Gestion de reservas, caja de productos e historiales.",
    modules: ["reservations", "product_sales", "sales_history", "history"],
  },
  {
    title: "Clientes",
    description: "Consulta y administracion de clientes.",
    modules: ["customers"],
  },
  {
    title: "Inventario",
    description: "Items, lotes y promociones del inventario.",
    modules: ["inventory", "inventory_batches", "inventory_sale_margin", "inventory_promotions"],
  },
  {
    title: "Metas empresariales",
    description: "Panel, metas, variables, gastos fijos y ciclos financieros.",
    modules: ["business_goals"],
    includedViews: [
      "Panel general",
      "Lista de metas",
      "Crear meta",
      "Gastos fijos",
      "Asignacion de variables",
      "Historial de ciclos y movimientos",
    ],
  },
  {
    title: "Administracion",
    description: "Configuracion de espacios, actividades y usuarios.",
    modules: ["spaces", "activities", "space_activities", "users", "audit"],
  },
];

export const emptyUserForm: ManagedUserWriteDTO = {
  username: "",
  email: "",
  password: "",
  is_active: true,
  is_staff: true,
  role: "operador",
  modules: ["availability", "reservations", "product_sales"],
};
