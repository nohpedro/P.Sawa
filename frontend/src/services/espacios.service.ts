import RequestHandler from "./RequestHandler";
import type { Espacio, EspacioWriteDTO } from "../models/espacio";
import type { PaginatedResponse } from "../models/pagination";

const ENDPOINT = "/api/espacios/espacios/";

export class EspaciosService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: Record<string, string>): Promise<PaginatedResponse<Espacio>> {
    return (await this.request.getRequest(ENDPOINT, params)) as PaginatedResponse<Espacio>;
  }

  async get(id: string): Promise<Espacio> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as Espacio;
  }

  async create(payload: EspacioWriteDTO): Promise<Espacio> {
    return (await this.request.postRequest(ENDPOINT, payload)) as Espacio;
  }

  async update(id: string, payload: EspacioWriteDTO): Promise<Espacio> {
    return (await this.request.putRequest(`${ENDPOINT}${id}/`, payload)) as Espacio;
  }

  async patch(id: string, payload: Partial<EspacioWriteDTO>): Promise<Espacio> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as Espacio;
  }

  async remove(id: string): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }
}

const espaciosService = new EspaciosService();
export default espaciosService;
