import type { Espacio } from "../../../../models/espacio";
import type { EspacioActividad, TipoActividad } from "../../../../models/actividad";

export function moneyLike(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 2) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export function estadoColor(value: string) {
  if (value === "LIBRE" || value === "DISPONIBLE") return "#8ee59f";
  if (value === "OCUPADO" || value === "MANTENIMIENTO") return "#ffd24a";
  return "#cbd5e1";
}

export function filterSpaces(spaces: Espacio[], query: string): Espacio[] {
  const q = query.trim().toLowerCase();
  if (!q) return spaces;
  return spaces.filter((space) =>
    `${space.nombre} ${space.ubicacion} ${space.tags} ${space.estado_operativo}`.toLowerCase().includes(q)
  );
}

export function filterActivities(activities: TipoActividad[], query: string): TipoActividad[] {
  const q = query.trim().toLowerCase();
  if (!q) return activities;
  return activities.filter((activity) => `${activity.nombre} ${activity.descripcion ?? ""}`.toLowerCase().includes(q));
}

export function upsertRelation(relaciones: EspacioActividad[], relation: EspacioActividad): EspacioActividad[] {
  const currentIndex = relaciones.findIndex((rel) => rel.id === relation.id);
  if (currentIndex === -1) return [...relaciones, relation];

  const next = [...relaciones];
  next[currentIndex] = relation;
  return next;
}

export function relationForActivity(relaciones: EspacioActividad[], activityId: string): EspacioActividad | null {
  return relaciones.find((rel) => rel.tipo === activityId) ?? null;
}
