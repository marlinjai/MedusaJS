/**
 * types.ts
 * Centralized type definitions for the offer module
 * Uses inferred types from models to avoid duplication
 */
import { OfferType } from './models/offer';
import { OfferItemType } from './models/offer-item';

// Email notification settings type (matches global settings structure)
export type EmailNotificationSettings = {
	offer_created: boolean;
	offer_active: boolean;
	offer_accepted: boolean;
	offer_completed: boolean;
	offer_cancelled: boolean;
};

// ✅ UTILITY TYPES: Use inferred types instead of interfaces
export type CreateOfferInput = Partial<
	Omit<
		OfferType,
		'id' | 'offer_number_seq' | 'offer_number' | 'created_at' | 'updated_at'
	>
> & {
	items?: CreateOfferItemInput[];
};

export type CreateOfferItemInput = Partial<
	Omit<
		OfferItemType,
		| 'id'
		| 'offer_id'
		| 'total_price'
		| 'tax_amount'
		| 'created_at'
		| 'updated_at'
	>
> & {
	// Only require essential fields for creation
	item_type: 'product' | 'service';
	title: string;
	quantity: number;
	unit_price: number;
};

export type UpdateOfferInput = Partial<
	Omit<
		OfferType,
		'id' | 'offer_number_seq' | 'offer_number' | 'created_at' | 'updated_at'
	>
>;

export type UpdateOfferItemInput = Partial<
	Omit<
		OfferItemType,
		| 'id'
		| 'offer_id'
		| 'total_price'
		| 'tax_amount'
		| 'created_at'
		| 'updated_at'
	>
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
	draft_offers: number;
	active_offers: number;
	pending_acceptance: number;
	completed_offers: number;
	cancelled_offers: number;
	// Value sums by status (in cents)
	draft_value: number;
	active_value: number;
	accepted_value: number;
	completed_value: number;
	cancelled_value: number;
	// Total value excluding cancelled and draft offers (only active, accepted, completed)
	total_value: number;
	average_offer_value: number;
};

// ✅ INVENTORY STATUS UTILITY
export type InventoryStatus = 'available' | 'low_stock' | 'out_of_stock';

export const getInventoryStatus = (
	available: number,
	requested: number,
): InventoryStatus => {
	if (available === 0) return 'out_of_stock';
	if (available < requested) return 'low_stock';
	return 'available';
};

// ✅ WORKFLOW INPUT TYPES: For workflow operations
export type ReserveOfferInventoryInput = {
	offer_id: string;
	user_id?: string;
	reason?: string;
};

export type UpdateOfferReservationsInput = {
	offer_id: string;
	items_to_delete: string[];
	items_to_update: Array<{
		id: string;
		variant_id: string;
		sku: string;
		quantity: number;
		title: string;
	}>;
	items_to_create: Array<{
		id: string;
		variant_id: string;
		sku: string;
		quantity: number;
		title: string;
		item_type: string;
	}>;
	user_id?: string;
	change_description?: string;
};

export type FulfillOfferReservationsInput = {
	offer_id: string;
	user_id?: string;
};

export type ReleaseOfferReservationsInput = {
	offer_id: string;
	reason?: string;
	user_id?: string;
};

export type CreatedReservation = {
	reservation_id: string;
	item_id: string;
	variant_id: string;
	quantity: number;
};
