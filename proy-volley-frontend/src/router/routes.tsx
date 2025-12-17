import { PATHS } from "./paths";

// Guard
import PublicOnlyRoute from "./guards/PublicOnlyRoute";

// Layout
import PublicLayout from "../layouts/PublicLayout";

// Page
import LoginPage from "../pages/Login/LoginPage";

export const routes = [
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            path: PATHS.login,
            element: <LoginPage />,
          },
          // Redirección raíz → Login
          {
            path: PATHS.app,
            element: <LoginPage />,
          },
        ],
      },
    ],
  },
] as const;
