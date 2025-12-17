import RequestHandler from "./RequestHandler";
import type { TipoActividad } from "../models/actividad";
import type { PaginatedResponse } from "../models/pagination";

const ENDPOINT = "/api/espacios/tipos-actividad/";

export class TiposActividadService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  // GET list (paginado DRF)
  async list(params?: Record<string, string>): Promise<PaginatedResponse<TipoActividad>> {
    return (await this.request.getRequest(ENDPOINT, params)) as PaginatedResponse<TipoActividad>;
  }

  // GET detail
  async get(id: string): Promise<TipoActividad> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as TipoActividad;
  }

  // POST create
  async create(payload: Partial<TipoActividad>): Promise<TipoActividad> {
    return (await this.request.postRequest(ENDPOINT, payload)) as TipoActividad;
  }

  // PUT update (full)
  async update(id: string, payload: Partial<TipoActividad>): Promise<TipoActividad> {
    return (await this.request.putRequest(`${ENDPOINT}${id}/`, payload)) as TipoActividad;
  }

  // PATCH update (partial)
  async patch(id: string, payload: Partial<TipoActividad>): Promise<TipoActividad> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as TipoActividad;
  }

  // DELETE
  async remove(id: string): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }
}

const tiposActividadService = new TiposActividadService();
export default tiposActividadService;
