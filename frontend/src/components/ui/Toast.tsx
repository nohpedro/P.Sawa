import React from "react";

type ToastType = "info" | "success" | "error";

export interface ToastProps {
  open: boolean;
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

export default function Toast({ open, message, type = "info", onClose }: ToastProps) {
  if (!open) return null;

  const colors: Record<ToastType, React.CSSProperties> = {
    info: { borderColor: "#2a3243", color: "#eaeaea" },
    success: { borderColor: "#4caf50", color: "#eaeaea" },
    error: { borderColor: "#ff5252", color: "#eaeaea" },
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 18,
        right: 18,
        minWidth: 260,
        maxWidth: 420,
        borderRadius: 10,
        border: "1px solid",
        background: "#0f1420",
        padding: "12px 14px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        ...colors[type],
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{ fontSize: 13, opacity: 0.95 }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid #2a3243",
            color: "#eaeaea",
            borderRadius: 8,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          OK
        </button>
      )}
    </div>
  );
}
