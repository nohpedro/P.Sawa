import type { BusinessFixedExpenseWriteDTO, BusinessGoalWriteDTO } from "../../../models/businessGoals";

export function validateGoalDraft(draft: BusinessGoalWriteDTO): string | null {
  if (!draft.nombre.trim()) return "El nombre de la meta es obligatorio.";
  if (Number(draft.monto_objetivo) <= 0) return "El monto objetivo debe ser mayor a 0.";
  if (!draft.fecha_inicio || !draft.fecha_fin) return "Define fecha de inicio y fecha fin.";
  if (draft.fecha_fin < draft.fecha_inicio) return "La fecha fin no puede ser anterior a la fecha inicio.";
  if (draft.tipo === "renovable" && !draft.frecuencia_renovacion) return "Selecciona la frecuencia de renovacion.";
  return null;
}

export function validateFixedExpenseDraft(draft: BusinessFixedExpenseWriteDTO): string | null {
  if (!draft.nombre.trim()) return "El nombre del gasto es obligatorio.";
  if (!draft.categoria.trim()) return "La categoria es obligatoria.";
  if (Number(draft.monto) < 0) return "El monto no puede ser negativo.";
  if (!draft.fecha_pago) return "La fecha de pago es obligatoria.";
  return null;
}
