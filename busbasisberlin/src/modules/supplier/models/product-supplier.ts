/**
 * product-supplier.ts
 * Pivot entity for many-to-many relationship between products and suppliers
 * Includes supplier-specific data like pricing, lead times, etc.
 * Updated to match JTL VAP system export structure
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const productSupplier = model.define('product_supplier', {
  id: model.id().primaryKey(),

  // Foreign keys to the linked entities
  product_id: model.text(),
  supplier_id: model.text(),

  // Supplier-specific data from CSV
  is_primary: model.boolean().default(false), // Ist Standardlieferant
  supplier_price: model.number().nullable(), // EK Netto (für GLD) - in cents
  supplier_sku: model.text().nullable(), // Lieferanten-Art.Nr.
  supplier_product_name: model.text().nullable(), // Lieferanten Artikelname
  supplier_vat_rate: model.number().nullable(), // USt. in % (supplier's VAT rate)
  supplier_price_gross: model.number().nullable(), // EK Brutto (supplier's gross price)
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

  // Status
  is_active: model.boolean().default(true), // Whether this supplier is active for this product
});

export type ProductSupplier = InferTypeOf<typeof productSupplier>;

export default productSupplier;
