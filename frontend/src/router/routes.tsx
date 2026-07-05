import { Navigate } from "react-router-dom";
import { PATHS } from "./paths";

import PublicOnlyRoute from "./guards/PublicOnlyRoute";
import ProtectedRoute from "./guards/ProtectedRoute";
import ModuleRoute from "./guards/ModuleRoute";

import PublicLayout from "../layouts/PublicLayout";
import AuthLayout from "../layouts/AuthLayout";

import LoginPage from "../pages/Login/LoginPage";
import AvailabilityPage from "../pages/Availability/AvailabilityPage";

import SpacesPage from "../pages/Admin/SpacesPage";
import ActivitiesPage from "../pages/Admin/ActivitiesPage";
import SpaceActivitiesPage from "../pages/Admin/SpaceActivitiesPage";
import CustomersPage from "../pages/Customers/CustomersPage.tsx";
import CustomerDetailPage from "../pages/Customers/CustomerDetailPage.tsx";
import ReservationsPage from "../pages/Reservations/ReservationsPage.tsx";
import ReservationHistoryPage from "../pages/Reservations/ReservationHistoryPage.tsx";
import UserRolesPage from "../pages/Admin/UserRolesPage.tsx";
import AuditPage from "../pages/Admin/AuditPage.tsx";
import MePage from "../pages/Me/MePage.tsx";
import InventoryPage from "../pages/Inventory/InventoryPage.tsx";
import PromotionPage from "../pages/Inventory/PromotionPage.tsx";

export const routes = [
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: PATHS.login, element: <LoginPage /> },
          { path: PATHS.app, element: <Navigate to={PATHS.login} replace /> },
        ],
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: PATHS.app, element: <Navigate to={PATHS.availability} replace /> },
          { path: PATHS.me, element: <MePage /> },
          { element: <ModuleRoute module="availability" />, children: [{ path: PATHS.availability, element: <AvailabilityPage /> }] },
          { element: <ModuleRoute module="spaces" />, children: [{ path: PATHS.adminEspacios, element: <SpacesPage /> }] },
          { element: <ModuleRoute module="activities" />, children: [{ path: PATHS.adminActividades, element: <ActivitiesPage /> }] },
          { element: <ModuleRoute module="space_activities" />, children: [{ path: PATHS.adminEspacioActividad, element: <SpaceActivitiesPage /> }] },
          { element: <ModuleRoute module="inventory" />, children: [{ path: PATHS.inventory, element: <InventoryPage /> }] },
          { element: <ModuleRoute module="inventory" />, children: [{ path: PATHS.inventoryPromotions, element: <PromotionPage /> }] },
          { element: <ModuleRoute module="customers" />, children: [{ path: PATHS.customers, element: <CustomersPage /> }] },
          { element: <ModuleRoute module="customers" />, children: [{ path: PATHS.customerDetail, element: <CustomerDetailPage /> }] },
          { element: <ModuleRoute module="reservations" />, children: [{ path: PATHS.reservations, element: <ReservationsPage /> }] },
          { element: <ModuleRoute module="history" />, children: [{ path: PATHS.reservationHistory, element: <ReservationHistoryPage /> }] },
          { element: <ModuleRoute module="users" />, children: [{ path: PATHS.usersRoles, element: <UserRolesPage /> }] },
          { element: <ModuleRoute module="audit" />, children: [{ path: PATHS.audit, element: <AuditPage /> }] },
        ],
      },
    ],
  },
] as const;
