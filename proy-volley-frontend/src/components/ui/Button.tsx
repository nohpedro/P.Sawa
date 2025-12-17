import React from "react";

type ButtonVariant = "primary" | "outline" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 6,
    border: "1px solid transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontWeight: 700,
    letterSpacing: 0.5,
    userSelect: "none",
    width: fullWidth ? "100%" : undefined,
  };

  const sizes: Record<ButtonSize, React.CSSProperties> = {
    sm: { padding: "8px 10px", fontSize: 12 },
    md: { padding: "10px 14px", fontSize: 14 },
    lg: { padding: "12px 16px", fontSize: 16 },
  };

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: "#ffd24a", color: "#10131a" },
    outline: { background: "transparent", color: "#eaeaea", borderColor: "#2a3243" },
    danger: { background: "transparent", color: "#ff5252", borderColor: "#ff5252" },
    ghost: { background: "transparent", color: "#eaeaea", borderColor: "transparent" },
  };

  return (
    <button
      disabled={disabled}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      {...props}
    />
  );
}
