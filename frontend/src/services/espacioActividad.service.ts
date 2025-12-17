import RequestHandler from "./RequestHandler";
import type { EspacioActividad } from "../models/actividad";
import type { PaginatedResponse } from "../models/pagination";

const ENDPOINT = "/api/espacios/espacio-actividad/";

export class EspacioActividadService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: Record<string, string>): Promise<PaginatedResponse<EspacioActividad>> {
    return (await this.request.getRequest(ENDPOINT, params)) as PaginatedResponse<EspacioActividad>;
  }

  async get(id: string): Promise<EspacioActividad> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as EspacioActividad;
  }

  async create(payload: Partial<EspacioActividad>): Promise<EspacioActividad> {
    return (await this.request.postRequest(ENDPOINT, payload)) as EspacioActividad;
  }

  async update(id: string, payload: Partial<EspacioActividad>): Promise<EspacioActividad> {
    return (await this.request.putRequest(`${ENDPOINT}${id}/`, payload)) as EspacioActividad;
  }

  async patch(id: string, payload: Partial<EspacioActividad>): Promise<EspacioActividad> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as EspacioActividad;
  }

  async remove(id: string): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }
}

const espacioActividadService = new EspacioActividadService();
export default espacioActividadService;
