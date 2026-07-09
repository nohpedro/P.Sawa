import { NavLink } from "react-router-dom";
import { PATHS } from "../../../router/paths";

const links = [
  { to: PATHS.businessGoalsDashboard, label: "Panel" },
  { to: PATHS.businessGoalsList, label: "Metas" },
  { to: PATHS.businessGoalCreate, label: "Nueva" },
  { to: PATHS.businessGoalExpenses, label: "Gastos fijos" },
  { to: PATHS.businessGoalVariables, label: "Variables" },
  { to: PATHS.businessGoalHistory, label: "Historial" },
];

export default function GoalNav() {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={({ isActive }) => ({
            border: `1px solid ${isActive ? "rgba(255,210,74,0.6)" : "var(--color-border)"}`,
            borderRadius: 8,
            color: "var(--color-text)",
            background: isActive ? "rgba(255,210,74,0.09)" : "rgba(255,255,255,0.02)",
            padding: "9px 12px",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 900,
          })}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
