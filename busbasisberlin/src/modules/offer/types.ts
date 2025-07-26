/**
 * types.ts
 * Centralized type definitions for the offer module
 * Uses inferred types from models to avoid duplication
 */
import { OfferType } from './models/offer';
import { OfferItemType } from './models/offer-item';

// ✅ UTILITY TYPES: Use inferred types instead of interfaces
export type CreateOfferInput = Partial<
  Omit<OfferType, 'id' | 'offer_number_seq' | 'offer_number' | 'created_at' | 'updated_at'>
> & {
  items?: CreateOfferItemInput[];
};

export type CreateOfferItemInput = Partial<
  Omit<OfferItemType, 'id' | 'offer_id' | 'total_price' | 'tax_amount' | 'created_at' | 'updated_at'>
> & {
  // Only require essential fields for creation
  item_type: 'product' | 'service';
  title: string;
  quantity: number;
  unit_price: number;
};

export type UpdateOfferInput = Partial<
  Omit<OfferType, 'id' | 'offer_number_seq' | 'offer_number' | 'created_at' | 'updated_at'>
>;

export type UpdateOfferItemInput = Partial<
  Omit<OfferItemType, 'id' | 'offer_id' | 'total_price' | 'tax_amount' | 'created_at' | 'updated_at'>
>;

// ✅ COMPUTED TYPES: With relationships
export type OfferWithItems = OfferType & {
  items: OfferItemType[];
};

// ✅ RUNTIME TYPES: For live inventory data (not stored)
export type OfferItemWithInventory = OfferItemType & {
  available_quantity?: number;
  reserved_quantity?: number;
  inventory_status?: 'available' | 'low_stock' | 'out_of_stock';
  can_fulfill?: boolean;
};

export type OfferWithInventory = OfferType & {
  items: OfferItemWithInventory[];
};

// ✅ STATISTICS TYPE: For reporting
export type OfferStatistics = {
  total_offers: number;
  active_offers: number;
  pending_acceptance: number;
  completed_offers: number;
  cancelled_offers: number;
  total_value: number;
  average_offer_value: number;
};

// ✅ INVENTORY STATUS UTILITY
export type InventoryStatus = 'available' | 'low_stock' | 'out_of_stock';

export const getInventoryStatus = (available: number, requested: number): InventoryStatus => {
  if (available === 0) return 'out_of_stock';
  if (available < requested) return 'low_stock';
  return 'available';
};
