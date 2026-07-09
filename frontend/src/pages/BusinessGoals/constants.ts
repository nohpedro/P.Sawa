import type { GoalNodeType } from "../../models/businessGoals";

export const goalPriorities = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Critica" },
] as const;

export const goalStatuses = [
  { value: "borrador", label: "Borrador" },
  { value: "activa", label: "Activa" },
  { value: "pausada", label: "Pausada" },
  { value: "cumplida", label: "Cumplida" },
  { value: "cancelada", label: "Cancelada" },
] as const;

export const nodeTypes: Array<{ value: GoalNodeType; label: string }> = [
  { value: "ventas", label: "Ventas" },
  { value: "reservas", label: "Reservas" },
  { value: "salarios", label: "Salarios" },
  { value: "servicios", label: "Servicios" },
  { value: "alquiler", label: "Alquiler" },
  { value: "gastos_variables", label: "Gastos variables" },
  { value: "facturas_pendientes", label: "Facturas pendientes" },
  { value: "ingreso_manual", label: "Ingreso manual" },
  { value: "porcentaje_reservado", label: "Porcentaje reservado" },
  { value: "periodo_calculo", label: "Periodo de calculo" },
  { value: "gasto_fijo", label: "Gasto fijo" },
];

export const panelStyle = {
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  background: "rgba(255,255,255,0.02)",
  padding: 14,
};

export const selectStyle = {
  width: "100%",
  border: "1px solid #2a3243",
  background: "#0f1420",
  color: "var(--color-text)",
  borderRadius: 6,
  padding: "10px 12px",
};
