import RequestHandler from "./RequestHandler";
import type { PaginatedResponse } from "../models/pagination";
import type { AuditLog } from "../models/audit";

const ENDPOINT = "/api/auditoria/logs/";

export type AuditQuery = {
  page?: string;
  page_size?: string;
  desde?: string;
  hasta?: string;
  user?: string;
  module?: string;
  action?: string;
  search?: string;
};

class AuditService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async list(params?: AuditQuery): Promise<PaginatedResponse<AuditLog>> {
    const cleanParams = params
      ? Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ""))
      : undefined;
    return (await this.request.getRequest(ENDPOINT, cleanParams as Record<string, string> | undefined)) as PaginatedResponse<AuditLog>;
  }
}

const auditService = new AuditService();
export default auditService;
