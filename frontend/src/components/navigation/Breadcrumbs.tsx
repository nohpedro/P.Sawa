import { useLocation, useNavigate } from "react-router-dom";
import { PATHS } from "../../router/paths";

function labelFor(path: string) {
  switch (path) {
    case PATHS.availability:
      return "Disponibilidad";
    case PATHS.adminEspacios:
      return "Espacios";
    case PATHS.adminActividades:
      return "Tipos de Actividad";
    case PATHS.adminEspacioActividad:
      return "Espacio → Actividad";
    default:
      return path;
  }
}

export default function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();

  const parts = location.pathname.split("/").filter(Boolean);
  const crumbs = parts.map((_, idx) => "/" + parts.slice(0, idx + 1).join("/"));

  return (
    <nav style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, opacity: 0.85 }}>
      <span
        style={{ cursor: "pointer", textDecoration: "underline" }}
        onClick={() => navigate(PATHS.availability)}
      >
        Home
      </span>

      {crumbs.map((c) => (
        <span key={c} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ opacity: 0.6 }}>/</span>
          <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate(c)}
          >
            {labelFor(c)}
          </span>
        </span>
      ))}
    </nav>
  );
}
