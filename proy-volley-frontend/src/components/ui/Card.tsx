import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export default function Card({ title, subtitle, rightSlot, children, style, ...props }: CardProps) {
  return (
    <div
      {...props}
      style={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 10,
        border: "1px solid #1f2430",
        background: "#0f1420",
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {(title || subtitle || rightSlot) && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            {title && <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{subtitle}</div>}
          </div>
          {rightSlot}
        </div>
      )}

      <div style={{ marginTop: title || subtitle || rightSlot ? 14 : 0 }}>{children}</div>
    </div>
  );
}
