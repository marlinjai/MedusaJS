/**
 * offer-item.ts
 * Individual line items (products/services) within an offer
 * Links offers to products/services with quantities and pricing
 *
 * TEMPORAL DATA ARCHITECTURE:
 * - References: product_id, service_id, variant_id for inventory lookup
 * - Snapshots: title, description, unit_price, tax_rate captured at offer creation
 * - Live Data: available_quantity, reserved_quantity queried from inventory module
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const offerItem = model.define('offer_item', {
	id: model.id().primaryKey(),

	// ✅ RELATIONSHIPS: References for inventory/lookup
	offer_id: model.text().searchable(), // Foreign key to offer
	product_id: model.text().nullable(), // Product ID if this is a product
	service_id: model.text().nullable(), // Service ID if this is a service
	variant_id: model.text().nullable(), // Product variant ID for inventory lookup
	reservation_id: model.text().nullable(), // Inventory reservation ID for tracking

	// ✅ ITEM IDENTIFICATION: Snapshot data captured at offer creation
	item_type: model.text(), // 'product' or 'service'
	sku: model.text().nullable(), // Product SKU or service code (snapshot)
	title: model.text(), // Item name/title (snapshot)
	description: model.text().nullable(), // Item description (snapshot)
	variant_title: model.text().nullable(), // Product variant title (snapshot)

	// ✅ QUANTITY AND UNITS: Core offer data
	quantity: model.number().default(1), // Quantity ordered
	unit: model.text().default('STK'), // Unit of measurement (STK, kg, m, etc.)

	// ✅ PRICING: Snapshot data for invoice integrity
	unit_price: model.number(), // Price per unit in cents (snapshot)
	total_price: model.number(), // Total line price (unit_price * quantity)

	// ✅ DISCOUNTS AND ADJUSTMENTS: Offer-specific data
	discount_percentage: model.number().default(0), // Discount percentage (0-100)
	discount_amount: model.number().default(0), // Fixed discount amount in cents

	// ✅ TAX INFORMATION: Snapshot data
	tax_rate: model.number().default(0), // Tax rate percentage (snapshot)
	tax_amount: model.number().default(0), // Calculated tax amount in cents

	// ✅ PRODUCT/SERVICE SPECIFIC DATA: Snapshot data
	supplier_info: model.text().nullable(), // Supplier information (snapshot)
	lead_time: model.number().nullable(), // Lead time in days (snapshot)

	// ✅ SPECIAL INSTRUCTIONS AND NOTES: Offer-specific data
	custom_specifications: model.text().nullable(), // Custom requirements or specifications
	delivery_notes: model.text().nullable(), // Special delivery instructions

	// ✅ ORDERING AND GROUPING: UI/UX data
	item_group: model.text().nullable(), // For grouping related items
	sort_order: model.number().default(0), // For custom ordering

	// ❌ REMOVED: Inventory data should be queried live
	// available_quantity: model.number().nullable(), // Query from inventory module
	// reserved_quantity: model.number().default(0), // Query from inventory module
});

export type OfferItemType = InferTypeOf<typeof offerItem>;
export default offerItem;
