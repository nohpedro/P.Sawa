import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { PATHS } from "../router/paths";

import Sidebar from "../components/navigation/Sidebar";
import type { SidebarSection } from "../components/navigation/sidebar.types";

import Breadcrumbs from "../components/navigation/Breadcrumbs";
import Header from "../components/navigation/Header";
import Button from "../components/ui/Button";
import { hasModule, type ModuleKey } from "../models/modules";

import {
  FiBox,
  FiCalendar,
  FiClock,
  FiGrid,
  FiLayers,
  FiMap,
  FiShield,
  FiFileText,
  FiUsers,
} from "react-icons/fi";

export default function AuthLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const can = (module: ModuleKey) => hasModule(user, module);

  const onLogout = async () => {
    await logout();
    navigate(PATHS.login, { replace: true });
  };

  const sidebarSections: SidebarSection[] = [
    {
      title: "Operacion",
      items: [
        ...(can("availability") ? [{ label: "Disponibilidad", to: PATHS.availability, icon: FiGrid }] : []),
      ],
    },
    {
      title: "Administracion",
      items: [
        ...(can("spaces") ? [{ label: "Espacios", to: PATHS.adminEspacios, icon: FiMap }] : []),
        ...(can("activities") ? [{ label: "Actividades", to: PATHS.adminActividades, icon: FiLayers }] : []),
        ...(can("space_activities")
          ? [{ label: "Designacion de actividades", to: PATHS.adminEspacioActividad, icon: FiCalendar }]
          : []),
        ...(can("users") ? [{ label: "Usuarios y roles", to: PATHS.usersRoles, icon: FiShield }] : []),
        ...(can("audit") ? [{ label: "Auditoria", to: PATHS.audit, icon: FiFileText }] : []),
      ],
    },
    {
      title: "Clientes",
      items: [
        ...(can("customers") ? [{ label: "Clientes", to: PATHS.customers, icon: FiUsers }] : []),
      ],
    },
    {
      title: "Reservacion",
      items: [
        ...(can("reservations") ? [{ label: "Reserva", to: PATHS.reservations, icon: FiBox }] : []),
        ...(can("history") ? [{ label: "Historial", to: PATHS.reservationHistory, icon: FiClock }] : []),
      ],
    },
  ].filter((section) => section.items.length > 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "60px 1fr",
        background: "var(--color-bg)",
      }}
    >
      <Header
        rightSlot={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ opacity: 0.85 }}>
              {user?.username} {user?.role ? `/${user.role}` : ""}
            </span>
            <Button variant="danger" onClick={onLogout}>
              Salir
            </Button>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr" }}>
        <Sidebar sections={sidebarSections} />

        <main style={{ padding: 16, color: "var(--color-text)" }}>
          <div style={{ marginBottom: 12 }}>
            <Breadcrumbs />
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
