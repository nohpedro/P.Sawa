import { Navigate, Outlet, useLocation } from "react-router-dom";
import { PATHS } from "../paths";
import { useAuth } from "../../hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // aquí luego puedes poner <Loader />

  if (!isAuthenticated) {
    return (
      <Navigate
        to={PATHS.login}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
