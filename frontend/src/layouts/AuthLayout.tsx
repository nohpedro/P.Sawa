import { Link, Outlet, useNavigate } from "react-router-dom";
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
  FiLogOut,
  FiUser,
  FiUsers,
} from "react-icons/fi";

function getInitials(value?: string) {
  const source = (value ?? "U").trim();
  return source.slice(0, 2).toUpperCase();
}

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
          <div className="app-header-actions">
            <Link className="app-header-user" to={PATHS.me} title="Editar mi perfil">
              <span className="app-header-user__avatar" aria-hidden="true">{getInitials(user?.username)}</span>
              <span className="app-header-user__text">
                <span className="app-header-user__name">{user?.username ?? "Usuario"}</span>
                <span className="app-header-user__role">
                  <FiUser size={12} />
                  {user?.role || "Sin rol"}
                </span>
              </span>
            </Link>

            <Button className="app-header-logout" variant="danger" onClick={onLogout} title="Salir">
              <FiLogOut size={16} />
              <span>Salir</span>
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
