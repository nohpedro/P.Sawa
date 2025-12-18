import RequestHandler from "./RequestHandler";
import type { Cliente, ClienteWriteDTO } from "../models/cliente";
import type { PaginatedResponse } from "../models/pagination";

const ENDPOINT = "/api/users/clientes/";

class ClientesService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: Record<string, string>): Promise<PaginatedResponse<Cliente>> {
    return (await this.request.getRequest(ENDPOINT, params)) as PaginatedResponse<Cliente>;
  }

  async get(id: string): Promise<Cliente> {
    return (await this.request.getRequest(`${ENDPOINT}${id}/`)) as Cliente;
  }

  async create(payload: ClienteWriteDTO): Promise<Cliente> {
    return (await this.request.postRequest(ENDPOINT, payload)) as Cliente;
  }

  async update(id: string, payload: ClienteWriteDTO): Promise<Cliente> {
    return (await this.request.putRequest(`${ENDPOINT}${id}/`, payload)) as Cliente;
  }

  async patch(id: string, payload: Partial<ClienteWriteDTO>): Promise<Cliente> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as Cliente;
  }

  async remove(id: string): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }
}

const clientesService = new ClientesService();
export default clientesService;
export { ClientesService };
