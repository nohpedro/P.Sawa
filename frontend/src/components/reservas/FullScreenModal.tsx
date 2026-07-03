import { useEffect } from "react";
import type React from "react";

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
        background: "rgba(3,7,18,0.76)",
        display: "grid",
        placeItems: "center",
        padding: 14,
        zIndex: 1000,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(980px, 100%)",
          maxHeight: "92vh",
          overflow: "auto",
          borderRadius: 12,
          border: "1px solid #334155",
          background: "#0f172a",
          color: "#f8fafc",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            display: "flex",
            alignItems: "start",
            gap: 12,
            padding: 18,
            borderBottom: "1px solid #263244",
            background: "#0f172a",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 950 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{subtitle}</div>}
          </div>

          <button
            onClick={onClose}
            style={{
              background: "#111827",
              border: "1px solid #334155",
              borderRadius: 8,
              color: "#f8fafc",
              cursor: "pointer",
              minWidth: 42,
              minHeight: 38,
              fontWeight: 900,
              fontSize: 16,
            }}
            title="Cerrar (Esc)"
          >
            X
          </button>
        </div>

        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}
