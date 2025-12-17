import { Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AuthLayout() {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "60px 1fr",
        background: "#0b0e14",
        color: "#eaeaea",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid #1f2430",
          background: "#0f1420",
        }}
      >
        <div style={{ fontWeight: 700, letterSpacing: 1 }}>
          PROY VOLLEY
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <span style={{ opacity: 0.8 }}>
            {user?.username}
          </span>
          <button
            onClick={logout}
            style={{
              background: "transparent",
              border: "1px solid #f44336",
              color: "#f44336",
              padding: "6px 12px",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          padding: 24,
          overflow: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
