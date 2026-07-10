import { hasModule } from "../../models/modules";

export const DEFAULT_SALE_MARGIN_PERCENT = "50";
export const CREATE_ITEMS_MODULE = "inventory_items_create";
export const BATCHES_MODULE = "inventory_batches";
export const SALE_MARGIN_MODULE = "inventory_sale_margin";

export function canCreateInventoryItems(user: { is_superuser?: boolean; modules?: string[] } | null | undefined): boolean {
  return hasModule(user, CREATE_ITEMS_MODULE);
}

export function canRegisterBatches(user: { is_superuser?: boolean; modules?: string[] } | null | undefined): boolean {
  return hasModule(user, BATCHES_MODULE);
}

export function canEditSaleMargin(user: { is_superuser?: boolean; modules?: string[] } | null | undefined): boolean {
  return hasModule(user, SALE_MARGIN_MODULE);
}

export function saleMarginOrDefault(value: string | null | undefined, canEdit: boolean): string {
  if (!canEdit) return DEFAULT_SALE_MARGIN_PERCENT;
  return value || DEFAULT_SALE_MARGIN_PERCENT;
}
