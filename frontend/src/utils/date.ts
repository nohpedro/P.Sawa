export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toYYYYMMDD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function daysInMonth(d: Date): number {
  return endOfMonth(d).getDate();
}

/**
 * Retorna 0..6 (Dom..Sab) para el primer día del mes
 */
export function firstWeekdayOfMonth(d: Date): number {
  return startOfMonth(d).getDay();
}

export function combineDateAndTimeToISO(dateYYYYMMDD: string, timeHHMM: string): string {
  // interpreta en local y convierte a ISO Z
  const [y, m, day] = dateYYYYMMDD.split("-").map(Number);
  const [hh, mm] = timeHHMM.split(":").map(Number);
  const local = new Date(y, m - 1, day, hh, mm, 0);
  return local.toISOString();
}

export function formatHHMM(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
