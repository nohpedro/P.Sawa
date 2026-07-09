import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, style, ...props }, ref) => {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>
          {label}
        </label>
      )}

      <input
        {...props}
        ref={ref}
        style={{
          padding: "10px 12px",
          borderRadius: 6,
          border: `1px solid ${error ? "#ff5252" : "#2a3243"}`,
          background: "#0f1420",
          color: "#eaeaea",
          outline: "none",
          ...style,
        }}
      />

      {hint && !error && <div style={{ fontSize: 12, opacity: 0.7 }}>{hint}</div>}
      {error && <div style={{ fontSize: 12, color: "#ff5252" }}>{error}</div>}
    </div>
  );
});

Input.displayName = "Input";

export default Input;
