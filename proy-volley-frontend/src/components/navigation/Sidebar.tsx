import React from "react";

export interface SidebarItem {
  label: string;
  onClick?: () => void;
  href?: string; // si luego quieres usar <NavLink />
}

export default function Sidebar({
  items = [],
  footer,
}: {
  items?: SidebarItem[];
  footer?: React.ReactNode;
}) {
  return (
    <aside
      style={{
        width: 260,
        borderRight: "1px solid #1f2430",
        background: "#0f1420",
        padding: 16,
        color: "#eaeaea",
      }}
    >
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((it) => (
          <button
            key={it.label}
            onClick={it.onClick}
            style={{
              textAlign: "left",
              padding: "10px 12px",
              borderRadius: 8,
              background: "transparent",
              border: "1px solid #1f2430",
              color: "#eaeaea",
              cursor: "pointer",
            }}
          >
            {it.label}
          </button>
        ))}
      </div>

      {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
    </aside>
  );
}
