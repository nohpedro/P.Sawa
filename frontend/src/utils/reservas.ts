import type { Espacio } from "../models/espacio";

/**
 * Verifica si un espacio tiene asignada la actividad seleccionada.
 * Útil antes de enviar ReservaWriteDTO (especialmente admin).
 */
export function espacioTieneActividad(espacio: Espacio | null, actividadId: string): boolean {
  if (!espacio || !actividadId) return false;
  return (espacio.actividades ?? []).some((a) => a.id === actividadId);
}

/**
 * Calcula la diferencia en minutos entre 2 ISO strings.
 * Si fin <= inicio retorna 0.
 */
export function calcularDuracionMinutos(inicioISO: string, finISO: string): number {
  const inicio = new Date(inicioISO).getTime();
  const fin = new Date(finISO).getTime();
  if (!Number.isFinite(inicio) || !Number.isFinite(fin)) return 0;
  const diffMs = fin - inicio;
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 60_000);
}

/**
 * Convierte minutos a horas decimales (ej: 90 min => 1.5 horas).
 */
export function minutosAHoras(minutos: number): number {
  const m = Math.max(0, minutos);
  return m / 60;
}

/**
 * Parsea Decimal (string) a number de forma segura.
 * Si viene vacío o inválido => 0.
 */
export function parseDecimal(decimalStr: string | undefined | null): number {
  if (!decimalStr) return 0;
  const n = Number(String(decimalStr).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Redondeo típico a 2 decimales (para Bs).
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula el costo total de una reserva con base en:
 * - inicio/fin (duración real)
 * - precioBase (Bs por hora)
 *
 * Si tu backend maneja precio base por hora, usa esta función.
 */
export function calcularCostoPorHora(
  inicioISO: string,
  finISO: string,
  precioBaseHoraStr: string
): { minutos: number; horas: number; total: number } {
  const minutos = calcularDuracionMinutos(inicioISO, finISO);
  const horas = minutosAHoras(minutos);
  const precioHora = parseDecimal(precioBaseHoraStr);
  const total = round2(horas * precioHora);
  return { minutos, horas, total };
}

/**
 * Alternativa (opcional): costo por "bloques".
 * Útil si tu negocio cobra por bloques (ej: 60 min) usando EspacioActividad.duracion_minutos.
 *
 * - duracionMinutosBase: ej 60
 * - Se cobra por bloques completos (ceil)
 * - precioBaseBloqueStr: Bs por bloque
 */
export function calcularCostoPorBloques(
  inicioISO: string,
  finISO: string,
  duracionMinutosBase: number,
  precioBaseBloqueStr: string
): { minutos: number; bloques: number; total: number } {
  const minutos = calcularDuracionMinutos(inicioISO, finISO);
  const base = Math.max(1, Math.floor(duracionMinutosBase));
  const bloques = Math.max(1, Math.ceil(minutos / base));
  const precioBloque = parseDecimal(precioBaseBloqueStr);
  const total = round2(bloques * precioBloque);
  return { minutos, bloques, total };
}

/**
 * Reutilizas tu función previa (si aún la necesitas):
 * Dado inicio, duración base y bloques => fin ISO
 */
export function calcularFinISO(inicioISO: string, duracionMinutosBase: number, bloques: number): string {
  const inicio = new Date(inicioISO);
  const total = duracionMinutosBase * Math.max(1, bloques);
  return new Date(inicio.getTime() + total * 60_000).toISOString();
}
