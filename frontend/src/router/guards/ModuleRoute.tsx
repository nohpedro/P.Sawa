import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { hasModule, type ModuleKey } from "../../models/modules";

export default function ModuleRoute({ module }: { module: ModuleKey }) {
  const { user } = useAuth();

  if (!hasModule(user, module)) {
    return (
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: 10,
          background: "var(--color-surface)",
          color: "var(--color-text)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18 }}>Sin acceso</div>
        <div style={{ marginTop: 6, color: "var(--color-text-muted)", fontSize: 13 }}>
          Tu usuario no tiene habilitado este modulo.
        </div>
      </div>
    );
  }

  return <Outlet />;
}
