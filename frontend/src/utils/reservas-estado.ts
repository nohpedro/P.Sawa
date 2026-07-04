import type { Reserva } from "../models/reserva";
import type { Espacio } from "../models/espacio";

export function intersectaAhora(res: Reserva, now = new Date()): boolean {
  const a = new Date(res.inicio).getTime();
  const b = new Date(res.fin).getTime();
  const t = now.getTime();
  return t >= a && t < b;
}

export function estadoActualDesdeReservas(
  espacio: Espacio,
  reservasDelDia: Reserva[],
  now = new Date()
): "LIBRE" | "OCUPADO" | "NO_DISPONIBLE" {
  if (espacio.estado_operativo !== "DISPONIBLE") return "NO_DISPONIBLE";

  const relevantes = reservasDelDia.filter((r) => r.espacio === espacio.id);
  const ocupado = relevantes.some((r) => {
    // ocupan si PENDIENTE o CONFIRMADA (ajusta si quieres)
    if (r.estado_reserva === "CANCELADA" || r.estado_reserva === "FINALIZADA") return false;
    return intersectaAhora(r, now);
  });

  return ocupado ? "OCUPADO" : "LIBRE";
}
