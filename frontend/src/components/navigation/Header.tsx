import React from "react";

export default function Header({
  title = "PROY VOLLEY",
  rightSlot,
}: {
  title?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header
      style={{
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        borderBottom: "1px solid #1f2430",
        background: "#0f1420",
        color: "#eaeaea",
      }}
    >
      <div style={{ fontWeight: 800, letterSpacing: 1 }}>{title}</div>
      {rightSlot}
    </header>
  );
}
