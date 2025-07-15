/**
 * offer-item.ts
 * Individual line items (products/services) within an offer
 * Links offers to products/services with quantities and pricing
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const offerItem = model.define('offer_item', {
  id: model.id().primaryKey(),

  // Relationships
  offer_id: model.text(), // Foreign key to offer
  product_id: model.text().nullable(), // Product ID if this is a product
  service_id: model.text().nullable(), // Service ID if this is a service
  variant_id: model.text().nullable(), // Product variant ID if this is a specific variant

  // Item identification and description
  item_type: model.text(), // 'product' or 'service'
  sku: model.text().nullable(), // Product SKU or service code
  title: model.text(), // Item name/title
  description: model.text().nullable(), // Item description

  // Quantity and units
  quantity: model.number().default(1), // Quantity ordered
  unit: model.text().default('STK'), // Unit of measurement (STK, kg, m, etc.)

  // Pricing (all in cents for consistency)
  unit_price: model.number(), // Price per unit in cents
  total_price: model.number(), // Total line price (unit_price * quantity)

  // Discounts and adjustments
  discount_percentage: model.number().default(0), // Discount percentage (0-100)
  discount_amount: model.number().default(0), // Fixed discount amount in cents

  // Tax information
  tax_rate: model.number().default(0), // Tax rate percentage (e.g., 19.0 for 19%)
  tax_amount: model.number().default(0), // Calculated tax amount in cents

  // Product/Service specific data
  variant_title: model.text().nullable(), // Product variant title if applicable
  supplier_info: model.text().nullable(), // Supplier information if from specific supplier
  lead_time: model.number().nullable(), // Lead time in days for this item

  // Availability and inventory
  available_quantity: model.number().nullable(), // Available stock at time of offer creation
  reserved_quantity: model.number().default(0), // How many are currently reserved

  // Special instructions and notes
  custom_specifications: model.text().nullable(), // Custom requirements or specifications
  delivery_notes: model.text().nullable(), // Special delivery instructions
});

export type OfferItem = InferTypeOf<typeof offerItem>;
export default offerItem;
