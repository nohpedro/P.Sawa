import RequestHandler from "./RequestHandler";
import type { PaginatedResponse } from "../models/pagination";
import type { Reserva, ReservaWriteDTO } from "../models/reserva";

const ENDPOINT = "/api/espacios/reservas/";

export type ReservasQuery = {
  page?: string;
  desde?: string; // YYYY-MM-DD
  hasta?: string; // YYYY-MM-DD
  espacio?: string; // opcional si backend soporta
  usuario?: string; // opcional si backend soporta
  actividad?: string; // opcional si backend soporta
};

class ReservasService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  /**
   * Lista reservas (DRF paginado)
   * Soporta filtros opcionales: desde/hasta (YYYY-MM-DD) si backend los acepta.
   */
  async list(params?: ReservasQuery): Promise<PaginatedResponse<Reserva>> {
    return (await this.request.getRequest(ENDPOINT, params as Record<string, string> | undefined)) as PaginatedResponse<Reserva>;
  }

  async get(id: string): Promise<Reserva> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as Reserva;
  }

  /**
   * Crear reserva:
   * Backend requiere ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD incluso en POST (según tu especificación).
   */
  async create(payload: ReservaWriteDTO, desde: string, hasta: string): Promise<Reserva> {
    const params: Record<string, string> = { desde, hasta };
    return (await this.request.postRequest(ENDPOINT, payload, params)) as Reserva;
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
