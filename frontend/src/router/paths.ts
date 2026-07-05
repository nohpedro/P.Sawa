export const PATHS = {
  login: "/login",
  app: "/",
  me: "/me",

  availability: "/availability",

  adminEspacios: "/admin/espacios",
  adminActividades: "/admin/actividades",
  adminEspacioActividad: "/admin/espacio-actividad",
  customers: "/admin/clientes",
  customerDetail: "/admin/clientes/:id",
  usersRoles: "/admin/usuarios-roles",
  inventory: "/admin/inventario",
  inventoryPromotions: "/admin/inventario/promociones",
  audit: "/admin/auditoria",
  reservations: "/reservas",
  reservationHistory: "/historial-reservas",

  notFound: "*",
} as const;
