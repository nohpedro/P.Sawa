// src/utils/apiError.ts

type UnknownRecord = Record<string, unknown>;

function isObject(v: unknown): v is UnknownRecord {
  return typeof v === "object" && v !== null;
}

function joinMessages(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.filter((x) => typeof x === "string") as string[];
    return parts.length ? parts.join(" ") : null;
  }
  return null;
}

export function formatDRFError(data: unknown): string {
  if (!data) return "No se pudo completar la operación.";

  // {"detail":"..."}
  if (isObject(data) && typeof data.detail === "string") return data.detail;

  // {"inicio":["..."], "fin":["..."]}
  if (isObject(data)) {
    const lines: string[] = [];
    for (const [field, value] of Object.entries(data)) {
      const msg = joinMessages(value);
      if (msg) lines.push(`${field}: ${msg}`);
    }
    if (lines.length) return lines.join("\n");
  }

  try {
    return JSON.stringify(data);
  } catch {
    return "No se pudo completar la operación.";
  }
}

export function humanizeReservaError(message: string): string {
  const m = message.toLowerCase();

  // Caso típico del backend: {'inicio': ['Existe una reserva que se solapa.']}
  if (m.includes("solapa") || m.includes("solap")) {
    return "Ese horario ya está reservado. Elige otro rango de horas.";
  }

  return message;
}

/**
 * Extrae data de error para casos comunes:
 * - axios: err.response.data
 * - fetch wrapper: err.data
 * - Error normal: err.message
 */
export function extractErrorMessage(err: unknown): string {
  if (isObject(err) && "response" in err && isObject((err as any).response)) {
    const data = (err as any).response.data;
    return formatDRFError(data);
  }

  if (isObject(err) && "data" in err) {
    return formatDRFError((err as any).data);
  }

  if (err instanceof Error) return err.message;

  return "No se pudo completar la operación.";
}
