import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { PATHS } from "../router/paths";

import Sidebar from "../components/navigation/Sidebar";
import type { SidebarSection } from "../components/navigation/sidebar.types";

import Breadcrumbs from "../components/navigation/Breadcrumbs";
import Button from "../components/ui/Button";

import {
  FiGrid,
  FiMap,
  FiLayers,
  FiCalendar,
} from "react-icons/fi";

export default function AuthLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate(PATHS.login, { replace: true });
  };

  const sidebarSections: SidebarSection[] = [
    {
      title: "Operación",
      items: [
        {
          label: "Disponibilidad",
          to: PATHS.availability,
          icon: FiGrid,
        },
      ],
    },
    {
      title: "Administración",
      items: [
        {
          label: "Espacios",
          to: PATHS.adminEspacios,
          icon: FiMap,
        },
        {
          label: "Actividades",
          to: PATHS.adminActividades,
          icon: FiLayers,
        },
        {
          label: "Designacion de Actividades",
          to: PATHS.adminEspacioActividad,
          icon: FiCalendar,
        },
      ],
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "60px 1fr",
        background: "var(--color-bg)",
      }}
    >
      {/* HEADER */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
        }}
      >
        <div style={{ fontWeight: 900, letterSpacing: 1 }}>
          PROY VOLLEY
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ opacity: 0.85 }}>
            {user?.username}
          </span>
          <Button variant="danger" onClick={onLogout}>
            Salir
          </Button>
        </div>
      </header>

      {/* BODY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
        }}
      >
        {/* SIDEBAR */}
        <Sidebar sections={sidebarSections} />

        {/* CONTENT */}
        <main
          style={{
            padding: 16,
            color: "var(--color-text)",
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <Breadcrumbs />
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
