/**
 * product-supplier.ts
 * Pivot entity for many-to-many relationship between products and suppliers
 * Includes supplier-specific data like pricing, lead times, etc.
 * Updated to support multiple entries per supplier (e.g., different oil grades)
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const productSupplier = model.define('product_supplier', {
  id: model.id().primaryKey(),

  // Foreign keys to the linked entities
  product_id: model.text(),
  supplier_id: model.text(),

  // NEW: Support for multiple entries per supplier
  variant_name: model.text().nullable(), // e.g., "5W-30", "10W-40", "Premium Grade"
  variant_description: model.text().nullable(), // Additional details about this variant

  // Supplier-specific data from CSV
  is_primary: model.boolean().default(false), // Ist Standardlieferant

  // ENHANCED: Separate netto and brutto pricing for better accuracy
  supplier_price_netto: model.number().nullable(), // EK Netto (supplier net price) - in cents
  supplier_price_brutto: model.number().nullable(), // EK Brutto (supplier gross price) - in cents
  supplier_price: model.number().nullable(), // Legacy field, keep for backward compatibility

  supplier_sku: model.text().nullable(), // Lieferanten-Art.Nr.
  supplier_product_name: model.text().nullable(), // Lieferanten Artikelname
  supplier_vat_rate: model.number().nullable(), // USt. in % (supplier's VAT rate)
  supplier_currency: model.text().default('EUR').nullable(), // Währung
  supplier_lead_time: model.number().nullable(), // Lieferanten Lieferzeit (in days)
  supplier_delivery_time: model.number().nullable(), // Lieferfrist (in days)
  supplier_min_order_qty: model.number().nullable(), // Mindestabnahme Lieferant
  supplier_order_interval: model.number().nullable(), // Lieferant Abnahmeintervall
  supplier_stock: model.number().nullable(), // Lieferantenbestand
  supplier_comment: model.text().nullable(), // Kommentar
  supplier_merge_stock: model.boolean().default(false), // Lagerbestand zusammenführen
  is_dropshipping: model.boolean().default(false), // Ist Dropshippingartikel
  use_supplier_lead_time: model.boolean().default(false), // Lieferzeit vom Lieferanten beziehen

  // Additional metadata
  notes: model.text().nullable(), // Notes about this supplier-product relationship
  last_order_date: model.dateTime().nullable(), // Last time we ordered from this supplier
  supplier_rating: model.number().nullable(), // Rating for this supplier (1-5)

  // NEW: Order and grouping support
  sort_order: model.number().default(0), // For custom ordering within supplier group
  is_favorite: model.boolean().default(false), // Mark important variants

  // Status
  is_active: model.boolean().default(true), // Whether this supplier is active for this product
});

export type ProductSupplier = InferTypeOf<typeof productSupplier>;

export default productSupplier;
