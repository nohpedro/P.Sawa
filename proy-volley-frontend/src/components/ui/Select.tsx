import React from "react";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export default function Select({ label, error, options, style, ...props }: SelectProps) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, opacity: 0.85, letterSpacing: 0.6 }}>
          {label}
        </label>
      )}

      <select
        {...props}
        style={{
          padding: "10px 12px",
          borderRadius: 6,
          border: `1px solid ${error ? "#ff5252" : "#2a3243"}`,
          background: "#0f1420",
          color: "#eaeaea",
          outline: "none",
          ...style,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && <div style={{ fontSize: 12, color: "#ff5252" }}>{error}</div>}
    </div>
  );
}
