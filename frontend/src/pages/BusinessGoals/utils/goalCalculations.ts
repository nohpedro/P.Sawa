import type { BusinessGoal } from "../../../models/businessGoals";
import { formatBolivianos } from "../../../utils/currency";

export function money(value: string | number | null | undefined): string {
  return formatBolivianos(value);
}

export function percent(value: string | number | null | undefined): string {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

export function progressColor(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  if (n >= 100) return "#8ee59f";
  if (n >= 65) return "#ffd24a";
  return "#ffb4b4";
}

export function emptyGoal(): Omit<BusinessGoal, "id" | "progress" | "current_cycle"> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    nombre: "",
    descripcion: "",
    monto_objetivo: "1000",
    fecha_inicio: today,
    fecha_fin: today,
    prioridad: "media",
    estado: "activa",
    recursos_reservados: "0",
    variables_calculo: {},
    tipo: "no_renovable",
    frecuencia_renovacion: "",
    frecuencia_dias: 30,
    proximo_ciclo: null,
    manejo_saldo: "reset",
    conservar_nodos: true,
  };
}
