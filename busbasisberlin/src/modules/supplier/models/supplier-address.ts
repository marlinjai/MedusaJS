/**
 * supplier-address.ts
 * Address model for supplier addresses with proper foreign key relationship
 * Uses Medusa's relational pattern with supplier_id as foreign key
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const supplierAddress = model.define('supplier_address', {
  id: model.id().primaryKey(),

  // Foreign key to supplier (belongsTo relationship)
  supplier_id: model.text(), // References supplier.id

  // Address details
  label: model.text().nullable(), // Custom label like "Headquarters", "Warehouse", "Branch Office"
  is_default: model.boolean().default(false), // Is this the default address?

  // Street address
  street: model.text().nullable(),
  street_number: model.text().nullable(), // House number
  postal_code: model.text().nullable(),
  city: model.text().nullable(),
  country_name: model.text().nullable(), // Full country name

  // Additional address fields
  state: model.text().nullable(), // State/Province
  region: model.text().nullable(), // Region/County

  // Contact information for this address
  phone: model.text().nullable(), // Phone number for this address
  fax: model.text().nullable(), // Fax number for this address
  email: model.text().nullable(), // Email for this address

  // Status and metadata
  is_active: model.boolean().default(true),
  notes: model.text().nullable(), // Additional notes about this address
});

export type SupplierAddress = InferTypeOf<typeof supplierAddress>;
export default supplierAddress;
