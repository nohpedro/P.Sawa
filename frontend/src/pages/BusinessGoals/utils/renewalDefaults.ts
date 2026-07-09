import type { BusinessGoalWriteDTO, RenewalFrequency } from "../../../models/businessGoals";

type GoalRenewalFrequency = Extract<RenewalFrequency, "weekly" | "monthly">;

const FREQUENCY_DAYS: Record<GoalRenewalFrequency, number> = {
  weekly: 7,
  monthly: 30,
};

function addDays(date: string, days: number): string {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function normalizeFrequency(frequency: RenewalFrequency | ""): GoalRenewalFrequency {
  return frequency === "weekly" ? "weekly" : "monthly";
}

function daysForFrequency(frequency: GoalRenewalFrequency): number {
  if (frequency === "weekly") return FREQUENCY_DAYS.weekly;
  return FREQUENCY_DAYS.monthly;
}

export function applyGoalRenewalDefaults(
  current: BusinessGoalWriteDTO,
  patch: Partial<BusinessGoalWriteDTO>,
): BusinessGoalWriteDTO {
  const next = { ...current, ...patch };

  if (next.tipo !== "renovable") {
    return {
      ...next,
      frecuencia_renovacion: "",
      proximo_ciclo: null,
    };
  }

  const hadUnsupportedFrequency = Boolean(next.frecuencia_renovacion && next.frecuencia_renovacion !== "weekly" && next.frecuencia_renovacion !== "monthly");
  const frequency = normalizeFrequency(next.frecuencia_renovacion || "monthly");
  const days = daysForFrequency(frequency);
  const shouldRecalculateDates =
    "tipo" in patch ||
    "frecuencia_renovacion" in patch ||
    "frecuencia_dias" in patch ||
    "fecha_inicio" in patch ||
    hadUnsupportedFrequency ||
    !next.proximo_ciclo;
  const nextCycle = shouldRecalculateDates ? addDays(next.fecha_inicio, days) : next.proximo_ciclo;
  const cycleEnd = shouldRecalculateDates ? addDays(next.fecha_inicio, days - 1) : next.fecha_fin;

  return {
    ...next,
    frecuencia_renovacion: frequency,
    frecuencia_dias: days,
    fecha_fin: cycleEnd || next.fecha_fin,
    proximo_ciclo: nextCycle || next.proximo_ciclo,
  };
}
