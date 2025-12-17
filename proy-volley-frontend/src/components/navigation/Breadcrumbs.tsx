import React from "react";

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.8 }}>
      {items.map((c, idx) => (
        <React.Fragment key={`${c.label}-${idx}`}>
          <span
            onClick={c.onClick}
            style={{
              cursor: c.onClick ? "pointer" : "default",
              textDecoration: c.onClick ? "underline" : "none",
            }}
          >
            {c.label}
          </span>
          {idx < items.length - 1 && <span style={{ opacity: 0.6 }}>/</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}
