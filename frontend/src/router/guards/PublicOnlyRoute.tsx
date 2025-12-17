import { Navigate, Outlet } from "react-router-dom";
import { PATHS } from "../paths";
import { useAuth } from "../../hooks/useAuth";

export default function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to={PATHS.availability} replace />;
  }

  return <Outlet />;
}
