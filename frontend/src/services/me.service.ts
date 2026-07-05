import type { AuthUser } from "../models/auth";
import RequestHandler from "./RequestHandler";

const ENDPOINT = "/api/users/me/";

export interface MeProfile extends AuthUser {
  nombre: string;
  apellido: string;
  telefono: string;
  documento: string;
  notas: string;
}

export type MeProfileWriteDTO = Partial<
  Pick<MeProfile, "username" | "email" | "nombre" | "apellido" | "telefono" | "documento" | "notas"> & {
    password: string;
  }
>;

class MeService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async get(): Promise<MeProfile> {
    return (await this.request.getRequest(ENDPOINT)) as MeProfile;
  }

  async patch(payload: MeProfileWriteDTO): Promise<MeProfile> {
    return (await this.request.patchRequest(ENDPOINT, payload)) as MeProfile;
  }
}

const meService = new MeService();
export default meService;
