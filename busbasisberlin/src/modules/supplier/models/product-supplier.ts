/**
 * product-supplier.ts
 * Pivot entity for many-to-many relationship between products and suppliers
 * Includes supplier-specific data like pricing, lead times, etc.
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const productSupplier = model.define('product_supplier', {
  id: model.id().primaryKey(),

  // Foreign keys to the linked entities
  product_id: model.text(),
  supplier_id: model.text(),

  // Supplier-specific data
  is_primary: model.boolean().default(false), // Primary supplier for this product
  supplier_price: model.number().nullable(), // Supplier's price in cents
  supplier_sku: model.text().nullable(), // Supplier's SKU for this product
  lead_time: model.number().nullable(), // Lead time in days
  minimum_order_quantity: model.number().nullable(), // Minimum order quantity
  maximum_order_quantity: model.number().nullable(), // Maximum order quantity
  stock_quantity: model.number().nullable(), // Current stock at supplier

  // Additional metadata
  notes: model.text().nullable(), // Notes about this supplier-product relationship
  last_order_date: model.dateTime().nullable(), // Last time we ordered from this supplier
  supplier_rating: model.number().nullable(), // Rating for this supplier (1-5)

  // Status
  is_active: model.boolean().default(true), // Whether this supplier is active for this product
});

export type ProductSupplier = InferTypeOf<typeof productSupplier>;

export default productSupplier;
