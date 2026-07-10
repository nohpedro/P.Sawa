import type { Cliente } from "../../../models/cliente";

export type SalesNoteLineSource = "reserva" | "producto" | "manual";
export type SalesNotePrintSize = "page" | "roll";

export interface SalesNoteLine {
  id: string;
  source: SalesNoteLineSource;
  description: string;
  reference?: string;
  quantity: string;
  unitPrice: string;
  locked?: boolean;
}

export interface SalesNotePrintPayload {
  cliente: Cliente;
  date: string;
  lines: SalesNoteLine[];
  size: SalesNotePrintSize;
  logoUrl: string;
}
