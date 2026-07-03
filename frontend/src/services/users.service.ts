import RequestHandler from "./RequestHandler";
import type { PaginatedResponse } from "../models/pagination";
import type { ManagedUser, ManagedUserWriteDTO } from "../models/user";

const ENDPOINT = "/api/users/users/";

class UsersService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: Record<string, string>): Promise<PaginatedResponse<ManagedUser>> {
    return (await this.request.getRequest(ENDPOINT, params)) as PaginatedResponse<ManagedUser>;
  }

  async create(payload: ManagedUserWriteDTO): Promise<ManagedUser> {
    return (await this.request.postRequest(ENDPOINT, payload)) as ManagedUser;
  }

  async patch(id: number, payload: Partial<ManagedUserWriteDTO>): Promise<ManagedUser> {
    return (await this.request.patchRequest(`${ENDPOINT}${id}/`, payload)) as ManagedUser;
  }

  async remove(id: number): Promise<void> {
    await this.request.deleteRequest(`${ENDPOINT}${id}/`);
  }

  async resetPassword(id: number, password?: string): Promise<{ id: number; username: string; password: string }> {
    return (await this.request.postRequest(`${ENDPOINT}${id}/reset-password/`, { password: password ?? "" })) as {
      id: number;
      username: string;
      password: string;
    };
  }
}

const usersService = new UsersService();
export default usersService;
