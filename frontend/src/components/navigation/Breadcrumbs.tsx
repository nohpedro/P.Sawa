import { useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "../../router/paths";

function labelFor(path: string) {
  switch (path) {
    case PATHS.availability:
      return "Disponibilidad";
    case PATHS.me:
      return "Mi cuenta";
    case PATHS.adminEspacios:
      return "Espacios";
    case PATHS.adminActividades:
      return "Tipos de actividad";
    case PATHS.adminEspacioActividad:
      return "Espacio / Actividad";
    case PATHS.customers:
      return "Clientes";
    case PATHS.usersRoles:
      return "Usuarios y roles";
    case PATHS.inventory:
      return "Inventario";
    case PATHS.inventoryBatchHistory:
      return "Historial de lotes";
    case PATHS.inventoryPromotions:
      return "Promociones";
    case PATHS.businessGoalsDashboard:
      return "Metas empresariales";
    case PATHS.businessGoalsList:
      return "Listado de metas";
    case PATHS.businessGoalsPast:
      return "Metas pasadas";
    case PATHS.businessGoalCreate:
      return "Nueva meta";
    case PATHS.businessGoalVariables:
      return "Asignacion de variables";
    case PATHS.businessGoalExpenses:
      return "Gastos fijos";
    case PATHS.businessGoalHistory:
      return "Historial de metas";
    case PATHS.reservations:
      return "Reservas";
    case PATHS.productSales:
      return "Venta productos";
    case PATHS.salesHistory:
      return "Historial ventas";
    case PATHS.reservationHistory:
      return "Historial";
    default:
      return path;
  }
}

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();

  const parts = location.pathname.split("/").filter(Boolean);
  const crumbs = parts.map((_, idx) => `/${parts.slice(0, idx + 1).join("/")}`);

  return (
    <nav style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.85 }}>
      <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate(PATHS.availability)}>
        Home
      </span>

      {crumbs.map((crumb) => (
        <span key={crumb} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.6 }}>/</span>
          <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate(crumb)}>
            {labelFor(crumb)}
          </span>
        </span>
      ))}
    </nav>
  );
}
