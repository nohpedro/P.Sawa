import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { PATHS } from "../router/paths";

import Sidebar from "../components/navigation/Sidebar";
import type { SidebarSection } from "../components/navigation/sidebar.types";

import Breadcrumbs from "../components/navigation/Breadcrumbs";
import Header from "../components/navigation/Header";
import Button from "../components/ui/Button";
import Toast from "../components/ui/Toast";
import { hasModule, type ModuleKey } from "../models/modules";
import inventoryService from "../services/inventory.service";

import {
  FiBox,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiGrid,
  FiGitBranch,
  FiLayers,
  FiMap,
  FiPackage,
  FiShield,
  FiFileText,
  FiTrendingUp,
  FiPlusCircle,
  FiLogOut,
  FiTag,
  FiUser,
  FiUsers,
  FiShoppingCart,
} from "react-icons/fi";

function getInitials(value?: string) {
  const source = (value ?? "U").trim();
  return source.slice(0, 2).toUpperCase();
}

export default function AuthLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const can = (module: ModuleKey) => hasModule(user, module);
  const canInventory = can("inventory");
  const canInventoryBatchHistory = can("inventory_batch_history");
  const canInventoryPromotions = can("inventory_promotions");
  const [inventoryToast, setInventoryToast] = useState({ open: false, message: "", type: "info" as "info" | "success" | "error" });

  const onLogout = async () => {
    await logout();
    navigate(PATHS.login, { replace: true });
  };

  useEffect(() => {
    if (!canInventory) return;

    let active = true;
    let lastCount = -1;
    const checkStock = async () => {
      try {
        const res = await inventoryService.listItems({ stock_bajo: "true", page: "1", page_size: "5" });
        if (!active || !res.count || res.count === lastCount) return;
        lastCount = res.count;
        const names = (res.results ?? []).map((item) => item.nombre).join(", ");
        setInventoryToast({
          open: true,
          type: "error",
          message: `Inventario con stock bajo: ${res.count} item(s)${names ? ` (${names})` : ""}.`,
        });
      } catch {
        // La alerta de inventario no debe interrumpir la navegacion.
      }
    };

    void checkStock();
    const timer = window.setInterval(checkStock, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [canInventory]);

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
      title: "Metas empresariales",
      items: [
        ...(can("business_goals") ? [{ label: "Panel general", to: PATHS.businessGoalsDashboard, icon: FiTrendingUp, end: true }] : []),
        ...(can("business_goals") ? [{ label: "Lista de metas", to: PATHS.businessGoalsList, icon: FiFileText }] : []),
        ...(can("business_goals") ? [{ label: "Crear meta", to: PATHS.businessGoalCreate, icon: FiPlusCircle }] : []),
        ...(can("business_goals") ? [{ label: "Gastos fijos", to: PATHS.businessGoalExpenses, icon: FiDollarSign }] : []),
        ...(can("business_goals") ? [{ label: "Asignacion de variables", to: PATHS.businessGoalVariables, icon: FiGitBranch }] : []),
        ...(can("business_goals") ? [{ label: "Historial", to: PATHS.businessGoalHistory, icon: FiClock }] : []),
      ],
    },
    {
      title: "Inventario",
      items: [
        ...(canInventory ? [{ label: "Items y lotes", to: PATHS.inventory, icon: FiPackage, end: true }] : []),
        ...(canInventoryBatchHistory ? [{ label: "Historial de lotes", to: PATHS.inventoryBatchHistory, icon: FiClock }] : []),
        ...(canInventoryPromotions ? [{ label: "Promociones", to: PATHS.inventoryPromotions, icon: FiTag }] : []),
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
        ...(can("reservations")
          ? [
              { label: "Reserva", to: PATHS.reservations, icon: FiBox, end: true },
            ]
          : []),
        ...(can("product_sales") ? [{ label: "Venta productos", to: PATHS.productSales, icon: FiShoppingCart }] : []),
        ...(can("sales_history") ? [{ label: "Historial ventas", to: PATHS.salesHistory, icon: FiFileText }] : []),
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

      <Toast
        open={inventoryToast.open}
        message={inventoryToast.message}
        type={inventoryToast.type}
        durationMs={5200}
        onClose={() => setInventoryToast((state) => ({ ...state, open: false }))}
      />
    </div>
  );
}
