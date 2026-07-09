import type { BusinessFixedExpense, BusinessGoalNodeWriteDTO, GoalNodeType } from "../../../models/businessGoals";

export function nodeTypeForFixedExpense(expense: BusinessFixedExpense): GoalNodeType {
  const category = expense.categoria.toLowerCase();
  if (category.includes("salario") || category.includes("sueldo")) return "salarios";
  if (category.includes("alquiler")) return "alquiler";
  if (category.includes("luz") || category.includes("agua") || category.includes("internet") || category.includes("servicio")) return "servicios";
  if (category.includes("impuesto") || category.includes("factura")) return "facturas_pendientes";
  if (category.includes("mantenimiento")) return "gasto_fijo";
  return "gasto_fijo";
}

export function nodeDraftFromFixedExpense({
  goalId,
  cycleId,
  expense,
  index,
}: {
  goalId: string;
  cycleId?: string | null;
  expense: BusinessFixedExpense;
  index: number;
}): BusinessGoalNodeWriteDTO {
  return {
    goal: goalId,
    cycle: cycleId ?? null,
    tipo: nodeTypeForFixedExpense(expense),
    etiqueta: expense.nombre,
    valor: expense.monto,
    porcentaje: "100",
    periodo_inicio: null,
    periodo_fin: null,
    posicion_x: 520,
    posicion_y: 70 + index * 172,
    config: {
      fixed_expense_id: expense.id,
      frecuencia: expense.frecuencia,
      estado: expense.estado,
      categoria: expense.categoria,
      prioridad: expense.prioridad,
    },
  };
}
