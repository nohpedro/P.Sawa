import type { BusinessFixedExpenseWriteDTO } from "../../../models/businessGoals";

export type FixedExpenseSplitMode = "none" | "weekly" | "daily";

const splitConfig = {
  none: { suffix: "", divisor: 1, frecuencia: "monthly", frecuencia_dias: 30 },
  weekly: { suffix: "Semanal", divisor: 4, frecuencia: "weekly", frecuencia_dias: 7 },
  daily: { suffix: "Diario", divisor: 30, frecuencia: "custom_days", frecuencia_dias: 1 },
} as const;

export function fixedExpenseSplitLabel(mode: FixedExpenseSplitMode): string {
  if (mode === "weekly") return "Semanal";
  if (mode === "daily") return "Diario";
  return "Sin dividir";
}

export function buildSplitFixedExpense(draft: BusinessFixedExpenseWriteDTO, mode: FixedExpenseSplitMode): BusinessFixedExpenseWriteDTO {
  if (mode === "none") return draft;

  const config = splitConfig[mode];
  const amount = Number(draft.monto || 0) / config.divisor;
  const cleanName = draft.nombre.replace(/\s+(Semanal|Diario)$/i, "").trim();

  return {
    ...draft,
    nombre: `${cleanName} ${config.suffix}`.trim(),
    monto: amount.toFixed(2),
    frecuencia: config.frecuencia,
    frecuencia_dias: config.frecuencia_dias,
  };
}

export function previewSplitAmount(amount: string | number, mode: FixedExpenseSplitMode): number {
  if (mode === "none") return Number(amount || 0);
  return Number(amount || 0) / splitConfig[mode].divisor;
}
