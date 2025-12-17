import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}

export default function Card({
  title,
  subtitle,
  children,
  rightSlot,
  style,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        width: "100%",
        minWidth: 0,
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        background: "var(--color-surface)",
        padding: 16,
        color: "var(--color-text)",
        ...style,
      }}
    >
      {(title || rightSlot) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            {title && <div style={{ fontWeight: 950, fontSize: 18 }}>{title}</div>}
            {subtitle && <div style={{ opacity: 0.8, fontSize: 13, marginTop: 4 }}>{subtitle}</div>}
          </div>
          {rightSlot}
        </div>
      )}

      <div style={{ marginTop: title || rightSlot ? 14 : 0, minWidth: 0 }}>{children}</div>
    </section>
  );
}
