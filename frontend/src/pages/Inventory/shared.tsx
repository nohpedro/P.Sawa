import type { CSSProperties, ReactNode } from "react";
import Button from "../../components/ui/Button";

export const panelStyle: CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

export const selectStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 6,
  border: "1px solid #2a3243",
  background: "#0f1420",
  color: "#eaeaea",
  outline: "none",
};

export function money(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return `Bs ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(5, 8, 15, 0.72)",
        backdropFilter: "blur(3px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(820px, 100%)",
          maxHeight: "88vh",
          overflow: "auto",
          border: "1px solid rgba(255,210,74,0.28)",
          borderRadius: 10,
          background: "var(--color-surface)",
          color: "var(--color-text)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 950 }}>{title}</h2>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 4 }}>{subtitle}</div>
          </div>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {children}
      </section>
    </div>
  );
}
