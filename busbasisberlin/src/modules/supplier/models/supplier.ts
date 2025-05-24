/**
 * supplier.ts
 * Defines the supplier model using Medusa's data modeling language (DML)
 */
import { InferTypeOf } from "@medusajs/framework/types"
import { model } from "@medusajs/framework/utils"

const supplier = model.define("supplier", {
  id: model.id().primaryKey(),
  supplier_number: model.text().nullable(),
  customer_number: model.text().nullable(),
  internal_key: model.text().nullable(),
  salutation: model.text().nullable(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  company: model.text(),
  company_addition: model.text().nullable(),
  contact: model.text().nullable(),
  street: model.text().nullable(),
  postal_code: model.text().nullable(),
  city: model.text().nullable(),
  country: model.text().nullable(),
  phone: model.text().nullable(),
  phone_direct: model.text().nullable(),
  fax: model.text().nullable(),
  email: model.text().nullable(),
  website: model.text().nullable(),
  note: model.text().nullable(),
  vat_id: model.text().nullable(),
  status: model.text().default("active").nullable(),
  active: model.boolean().default(true).nullable(),
  language: model.text().default("de").nullable(),
  delivery_time: model.number().default(0).nullable(),
  
  // Contact person details
  contact_salutation: model.text().nullable(),
  contact_first_name: model.text().nullable(),
  contact_last_name: model.text().nullable(),
  contact_phone: model.text().nullable(),
  contact_mobile: model.text().nullable(),
  contact_fax: model.text().nullable(),
  contact_email: model.text().nullable(),
  contact_department: model.text().nullable(),
  
  // Bank details
  bank_name: model.text().nullable(),
  bank_code: model.text().nullable(),
  account_number: model.text().nullable(),
  account_holder: model.text().nullable(),
  iban: model.text().nullable(),
  bic: model.text().nullable(),
})

export type Supplier = InferTypeOf<typeof supplier>

export default supplier 