import RequestHandler from "./RequestHandler";
import type { PaginatedResponse } from "../models/pagination";
import type { Reserva, ReservaWriteDTO } from "../models/reserva";

const ENDPOINT = "/api/espacios/reservas/";

export type ReservasQuery = {
  page?: string;
  page_size?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  espacio?: string;
  usuario?: string;
  cliente?: string;
  actividad?: string;
};

type QueryParams = Record<string, string>;

function cleanParams(params?: ReservasQuery): QueryParams | undefined {
  if (!params) return undefined;

  const out: QueryParams = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return Object.keys(out).length ? out : undefined;
}

class ReservasService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: ReservasQuery): Promise<PaginatedResponse<Reserva>> {
    const q = cleanParams(params);
    return (await this.request.getRequest(ENDPOINT, q)) as PaginatedResponse<Reserva>;
  }

  async get(id: string): Promise<Reserva> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as Reserva;
  }

  /**
   * Crear reserva.
   * Backend requiere ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD incluso en POST.
   */
  async create(payload: ReservaWriteDTO, params: { desde: string; hasta: string }): Promise<Reserva> {
    const q = cleanParams(params);
    return (await this.request.postRequest(ENDPOINT, payload, q)) as Reserva;
  }

  async update(id: string, payload: ReservaWriteDTO): Promise<Reserva> {
    return (await this.request.putRequest(`${ENDPOINT}${id}/`, payload)) as Reserva;
  }

  async patch(id: string, payload: Partial<ReservaWriteDTO>): Promise<Reserva> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as Reserva;
  }

  async remove(id: string): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }
}

const reservasService = new ReservasService();
export default reservasService;
export { ReservasService };
