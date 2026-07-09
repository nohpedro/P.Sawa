import type { PaginatedResponse } from "../models/pagination";
import type {
  BusinessFixedExpense,
  BusinessFixedExpenseWriteDTO,
  BusinessGoal,
  BusinessGoalConnection,
  BusinessGoalCycle,
  BusinessGoalMovement,
  BusinessGoalNode,
  BusinessGoalNodeWriteDTO,
  BusinessGoalWriteDTO,
  GoalProgress,
} from "../models/businessGoals";
import RequestHandler from "./RequestHandler";

const GOALS = "/api/metas/metas/";
const EXPENSES = "/api/metas/gastos-fijos/";
const CYCLES = "/api/metas/ciclos/";
const MOVEMENTS = "/api/metas/movimientos/";
const NODES = "/api/metas/nodos/";
const CONNECTIONS = "/api/metas/conexiones/";

class BusinessGoalsService {
  private readonly request = new RequestHandler();

  async listGoals(params?: Record<string, string>): Promise<PaginatedResponse<BusinessGoal>> {
    return (await this.request.getRequest(GOALS, params)) as PaginatedResponse<BusinessGoal>;
  }

  async getGoal(id: string): Promise<BusinessGoal> {
    return (await this.request.getRequest(`${GOALS}${id}/`)) as BusinessGoal;
  }

  async createGoal(payload: BusinessGoalWriteDTO): Promise<BusinessGoal> {
    return (await this.request.postRequest(GOALS, payload)) as BusinessGoal;
  }

  async patchGoal(id: string, payload: Partial<BusinessGoalWriteDTO>): Promise<BusinessGoal> {
    return (await this.request.patchRequest(`${GOALS}${id}/`, payload)) as BusinessGoal;
  }

  async deleteGoal(id: string): Promise<void> {
    await this.request.deleteRequest(`${GOALS}${id}/`);
  }

  async goalProgress(id: string): Promise<GoalProgress> {
    return (await this.request.getRequest(`${GOALS}${id}/progreso/`)) as GoalProgress;
  }

  async addContribution(id: string, payload: Partial<BusinessGoalMovement>): Promise<BusinessGoalMovement> {
    return (await this.request.postRequest(`${GOALS}${id}/aporte/`, payload)) as BusinessGoalMovement;
  }

  async renewGoal(id: string): Promise<BusinessGoalCycle> {
    return (await this.request.postRequest(`${GOALS}${id}/renovar/`)) as BusinessGoalCycle;
  }

  async listExpenses(params?: Record<string, string>): Promise<PaginatedResponse<BusinessFixedExpense>> {
    return (await this.request.getRequest(EXPENSES, params)) as PaginatedResponse<BusinessFixedExpense>;
  }

  async createExpense(payload: BusinessFixedExpenseWriteDTO): Promise<BusinessFixedExpense> {
    return (await this.request.postRequest(EXPENSES, payload)) as BusinessFixedExpense;
  }

  async patchExpense(id: string, payload: Partial<BusinessFixedExpenseWriteDTO>): Promise<BusinessFixedExpense> {
    return (await this.request.patchRequest(`${EXPENSES}${id}/`, payload)) as BusinessFixedExpense;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.request.deleteRequest(`${EXPENSES}${id}/`);
  }

  async listCycles(params?: Record<string, string>): Promise<PaginatedResponse<BusinessGoalCycle>> {
    return (await this.request.getRequest(CYCLES, params)) as PaginatedResponse<BusinessGoalCycle>;
  }

  async listMovements(params?: Record<string, string>): Promise<PaginatedResponse<BusinessGoalMovement>> {
    return (await this.request.getRequest(MOVEMENTS, params)) as PaginatedResponse<BusinessGoalMovement>;
  }

  async listNodes(params?: Record<string, string>): Promise<PaginatedResponse<BusinessGoalNode>> {
    return (await this.request.getRequest(NODES, params)) as PaginatedResponse<BusinessGoalNode>;
  }

  async createNode(payload: BusinessGoalNodeWriteDTO): Promise<BusinessGoalNode> {
    return (await this.request.postRequest(NODES, payload)) as BusinessGoalNode;
  }

  async patchNode(id: string, payload: Partial<BusinessGoalNodeWriteDTO>): Promise<BusinessGoalNode> {
    return (await this.request.patchRequest(`${NODES}${id}/`, payload)) as BusinessGoalNode;
  }

  async deleteNode(id: string): Promise<void> {
    await this.request.deleteRequest(`${NODES}${id}/`);
  }

  async listConnections(params?: Record<string, string>): Promise<PaginatedResponse<BusinessGoalConnection>> {
    return (await this.request.getRequest(CONNECTIONS, params)) as PaginatedResponse<BusinessGoalConnection>;
  }

  async createConnection(payload: Partial<BusinessGoalConnection>): Promise<BusinessGoalConnection> {
    return (await this.request.postRequest(CONNECTIONS, payload)) as BusinessGoalConnection;
  }

  async patchConnection(id: string, payload: Partial<BusinessGoalConnection>): Promise<BusinessGoalConnection> {
    return (await this.request.patchRequest(`${CONNECTIONS}${id}/`, payload)) as BusinessGoalConnection;
  }

  async deleteConnection(id: string): Promise<void> {
    await this.request.deleteRequest(`${CONNECTIONS}${id}/`);
  }
}

const businessGoalsService = new BusinessGoalsService();
export default businessGoalsService;
