import type { PaginatedResponse } from "../models/pagination";
import type {
  InventoryItem,
  InventoryItemWriteDTO,
  InventoryPromotion,
  InventoryPromotionWriteDTO,
  InventoryPurchaseBatch,
  InventoryPurchaseBatchWriteDTO,
} from "../models/inventory";
import RequestHandler from "./RequestHandler";

const ITEMS_ENDPOINT = "/api/inventario/items/";
const BATCHES_ENDPOINT = "/api/inventario/lotes/";
const PROMOTIONS_ENDPOINT = "/api/inventario/promociones/";

class InventoryService {
  private readonly request: RequestHandler;

  constructor(requestHandler?: RequestHandler) {
    this.request = requestHandler ?? new RequestHandler();
  }

  async listItems(params?: Record<string, string>): Promise<PaginatedResponse<InventoryItem>> {
    return (await this.request.getRequest(ITEMS_ENDPOINT, params)) as PaginatedResponse<InventoryItem>;
  }

  async createItem(payload: InventoryItemWriteDTO): Promise<InventoryItem> {
    return (await this.request.postRequest(ITEMS_ENDPOINT, payload)) as InventoryItem;
  }

  async patchItem(id: string, payload: Partial<InventoryItemWriteDTO>): Promise<InventoryItem> {
    return (await this.request.patchRequest(`${ITEMS_ENDPOINT}${id}/`, payload)) as InventoryItem;
  }

  async removeItem(id: string): Promise<void> {
    await this.request.deleteRequest(`${ITEMS_ENDPOINT}${id}/`);
  }

  async listBatches(params?: Record<string, string>): Promise<PaginatedResponse<InventoryPurchaseBatch>> {
    return (await this.request.getRequest(BATCHES_ENDPOINT, params)) as PaginatedResponse<InventoryPurchaseBatch>;
  }

  async createBatch(payload: InventoryPurchaseBatchWriteDTO): Promise<InventoryPurchaseBatch> {
    return (await this.request.postRequest(BATCHES_ENDPOINT, payload)) as InventoryPurchaseBatch;
  }

  async listPromotions(params?: Record<string, string>): Promise<PaginatedResponse<InventoryPromotion>> {
    return (await this.request.getRequest(PROMOTIONS_ENDPOINT, params)) as PaginatedResponse<InventoryPromotion>;
  }

  async createPromotion(payload: InventoryPromotionWriteDTO): Promise<InventoryPromotion> {
    return (await this.request.postRequest(PROMOTIONS_ENDPOINT, payload)) as InventoryPromotion;
  }

  async patchPromotion(id: string, payload: Partial<InventoryPromotionWriteDTO>): Promise<InventoryPromotion> {
    return (await this.request.patchRequest(`${PROMOTIONS_ENDPOINT}${id}/`, payload)) as InventoryPromotion;
  }

  async removePromotion(id: string): Promise<void> {
    await this.request.deleteRequest(`${PROMOTIONS_ENDPOINT}${id}/`);
  }
}

const inventoryService = new InventoryService();
export default inventoryService;
