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
import ProductSalesPage from "../pages/Reservations/ProductSalesPage.tsx";
import SalesHistoryPage from "../pages/Reservations/SalesHistoryPage.tsx";
import ReservationHistoryPage from "../pages/Reservations/ReservationHistoryPage.tsx";
import UserRolesPage from "../pages/Admin/UserRolesPage.tsx";
import AuditPage from "../pages/Admin/AuditPage.tsx";
import MePage from "../pages/Me/MePage.tsx";
import InventoryPage from "../pages/Inventory/InventoryPage.tsx";
import PromotionPage from "../pages/Inventory/PromotionPage.tsx";
import BusinessGoalDetailPage from "../pages/BusinessGoals/BusinessGoalDetailPage.tsx";
import BusinessGoalFormPage from "../pages/BusinessGoals/BusinessGoalFormPage.tsx";
import BusinessGoalHistoryPage from "../pages/BusinessGoals/BusinessGoalHistoryPage.tsx";
import BusinessGoalNodesPage from "../pages/BusinessGoals/BusinessGoalNodesPage.tsx";
import BusinessGoalVariablesPage from "../pages/BusinessGoals/BusinessGoalVariablesPage.tsx";
import BusinessGoalsDashboardPage from "../pages/BusinessGoals/BusinessGoalsDashboardPage.tsx";
import BusinessGoalsListPage from "../pages/BusinessGoals/BusinessGoalsListPage.tsx";
import BusinessFixedExpensesPage from "../pages/BusinessGoals/BusinessFixedExpensesPage.tsx";

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
          { element: <ModuleRoute module="inventory_promotions" />, children: [{ path: PATHS.inventoryPromotions, element: <PromotionPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalsDashboard, element: <BusinessGoalsDashboardPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalsList, element: <BusinessGoalsListPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalCreate, element: <BusinessGoalFormPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalExpenses, element: <BusinessFixedExpensesPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalVariables, element: <BusinessGoalVariablesPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalHistory, element: <BusinessGoalHistoryPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalEdit, element: <BusinessGoalFormPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalNodes, element: <BusinessGoalNodesPage /> }] },
          { element: <ModuleRoute module="business_goals" />, children: [{ path: PATHS.businessGoalDetail, element: <BusinessGoalDetailPage /> }] },
          { element: <ModuleRoute module="customers" />, children: [{ path: PATHS.customers, element: <CustomersPage /> }] },
          { element: <ModuleRoute module="customers" />, children: [{ path: PATHS.customerDetail, element: <CustomerDetailPage /> }] },
          { element: <ModuleRoute module="reservations" />, children: [{ path: PATHS.reservations, element: <ReservationsPage /> }] },
          { element: <ModuleRoute module="product_sales" />, children: [{ path: PATHS.productSales, element: <ProductSalesPage /> }] },
          { element: <ModuleRoute module="sales_history" />, children: [{ path: PATHS.salesHistory, element: <SalesHistoryPage /> }] },
          { element: <ModuleRoute module="history" />, children: [{ path: PATHS.reservationHistory, element: <ReservationHistoryPage /> }] },
          { element: <ModuleRoute module="users" />, children: [{ path: PATHS.usersRoles, element: <UserRolesPage /> }] },
          { element: <ModuleRoute module="audit" />, children: [{ path: PATHS.audit, element: <AuditPage /> }] },
        ],
      },
    ],
  },
] as const;
