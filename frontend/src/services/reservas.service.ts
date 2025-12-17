import RequestHandler from "./RequestHandler";
import type { Reserva, ReservaCreateDTO } from "../models/reserva";
import type { PaginatedResponse } from "../models/pagination";

const ENDPOINT = "/api/espacios/reservas/";

export class ReservasService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: Record<string, string>): Promise<PaginatedResponse<Reserva>> {
    return (await this.request.getRequest(ENDPOINT, params)) as PaginatedResponse<Reserva>;
  }

  async get(id: string): Promise<Reserva> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as Reserva;
  }

  async create(payload: ReservaCreateDTO): Promise<Reserva> {
    return (await this.request.postRequest(ENDPOINT, payload)) as Reserva;
  }

  async update(id: string, payload: Partial<Reserva>): Promise<Reserva> {
    return (await this.request.putRequest(`${ENDPOINT}${id}/`, payload)) as Reserva;
  }

  async patch(id: string, payload: Partial<Reserva>): Promise<Reserva> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as Reserva;
  }

  async remove(id: string): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }
}

const reservasService = new ReservasService();
export default reservasService;
