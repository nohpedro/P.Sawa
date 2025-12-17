import { Navigate, Outlet } from "react-router-dom";
import { PATHS } from "../paths";
import { useAuth } from "../../hooks/useAuth";

export default function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  // TEMPORAL: como aún no existe /availability, mantenemos al usuario en login
  if (isAuthenticated) {
    return <Navigate to={PATHS.login} replace />;
  }

  return <Outlet />;
}
