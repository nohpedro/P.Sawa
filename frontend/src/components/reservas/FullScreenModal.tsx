import { useEffect } from "react";

export default function FullScreenModal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 1000,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text)",
          padding: 18,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{subtitle}</div>}
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              color: "var(--color-text)",
              cursor: "pointer",
              padding: "10px 12px",
              fontWeight: 900,
            }}
            title="Cerrar (Esc)"
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: 16 }}>{children}</div>
      </div>
    </div>
  );
}
