import { Navigate } from "react-router-dom";
import { PATHS } from "./paths";

import PublicOnlyRoute from "./guards/PublicOnlyRoute";
import ProtectedRoute from "./guards/ProtectedRoute";

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
          { path: PATHS.availability, element: <AvailabilityPage /> },

          { path: PATHS.adminEspacios, element: <SpacesPage /> },
          { path: PATHS.adminActividades, element: <ActivitiesPage /> },
          { path: PATHS.adminEspacioActividad, element: <SpaceActivitiesPage /> },
          { path: PATHS.customers, element: <CustomersPage /> },
          { path: PATHS.customerDetail, element: <CustomerDetailPage /> },
          { path: PATHS.reservations, element: <ReservationsPage /> },
        ],
      },
    ],
  },
] as const;
