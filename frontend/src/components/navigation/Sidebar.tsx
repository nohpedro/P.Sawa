import { NavLink } from "react-router-dom";
import { useState } from "react";
import type { SidebarSection } from "./sidebar.types";

export default function Sidebar({
  sections = [],
  footer,
}: {
  sections: SidebarSection[];
  footer?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      style={{
        width: collapsed ? 72 : 260,
        transition: "width 0.2s ease",
        borderRight: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        color: "var(--color-text)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Toggle */}
      <div
        style={{
          padding: 12,
          display: "flex",
          justifyContent: collapsed ? "center" : "flex-end",
        }}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          style={{
            background: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            color: "var(--color-text)",
            cursor: "pointer",
            padding: "6px 8px",
            fontWeight: 800,
          }}
          title={collapsed ? "Expandir menú" : "Ocultar menú"}
        >
          {collapsed ? "→" : "≡"}
        </button>
      </div>

      {/* Sections */}
      <div style={{ flex: 1, padding: collapsed ? "8px 6px" : "8px 12px" }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: 16 }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.65,
                  letterSpacing: 1,
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                {section.title}
              </div>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              {section.items.map((it) => {
                const Icon = it.icon;
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    title={collapsed ? it.label : undefined}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px" : "10px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: isActive
                        ? "rgba(255,255,255,0.08)"
                        : "transparent",
                      color: "var(--color-text)",
                      textDecoration: "none",
                      fontWeight: isActive ? 800 : 600,
                      letterSpacing: 0.2,
                      gap: 10,
                    })}
                  >
                    <Icon size={18} />
                    {!collapsed && <span>{it.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {footer && (
        <div
          style={{
            padding: collapsed ? 8 : 12,
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}
