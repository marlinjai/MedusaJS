/**
 * supplier.ts
 * Defines the supplier model using Medusa's data modeling language (DML)
 * Updated to match JTL VAP system export structure
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const supplier = model.define('supplier', {
  id: model.id().primaryKey(),

  // Basic identification
  supplier_number: model.text().nullable(), // Lieferantennummer
  customer_number: model.text().nullable(), // Eigene Kd-Nr
  internal_key: model.text().nullable(), // Interner Schlüssel

  // Contact person details
  salutation: model.text().nullable(), // Anrede
  first_name: model.text().nullable(), // Vorname
  last_name: model.text().nullable(), // Nachname

  // Company details
  company: model.text(), // Firma
  company_addition: model.text().nullable(), // Firmenzusatz
  contact: model.text().nullable(), // Kontakt

  // Address
  street: model.text().nullable(), // Strasse
  postal_code: model.text().nullable(), // PLZ
  city: model.text().nullable(), // Ort
  country: model.text().nullable(), // Land / ISO (2-stellig)

  // Communication
  phone: model.text().nullable(), // Tel Zentrale
  phone_direct: model.text().nullable(), // Tel Durchwahl
  fax: model.text().nullable(), // Fax
  email: model.text().nullable(), // Email
  website: model.text().nullable(), // WWW
  note: model.text().nullable(), // Anmerkung

  // Business details
  vat_id: model.text().nullable(), // UstID
  status: model.text().default('active').nullable(), // Status
  is_active: model.boolean().default(true), // Aktiv
  language: model.text().default('Deutsch').nullable(), // Sprache
  lead_time: model.number().nullable(), // Lieferzeit (in days)

  // Contact person details (separate from main contact)
  contact_salutation: model.text().nullable(), // Anrede-Ansprechpartner
  contact_first_name: model.text().nullable(), // Vorname-Ansprechpartner
  contact_last_name: model.text().nullable(), // Name-Ansprechpartner
  contact_phone: model.text().nullable(), // Tel-Ansprechpartner
  contact_mobile: model.text().nullable(), // Mobil-Ansprechpartner
  contact_fax: model.text().nullable(), // Fax-Ansprechpartner
  contact_email: model.text().nullable(), // Email-Ansprechpartner
  contact_department: model.text().nullable(), // Abteilung-Ansprechpartner

  // Bank details
  bank_name: model.text().nullable(), // BankName
  bank_code: model.text().nullable(), // BLZ
  account_number: model.text().nullable(), // KontoNr
  account_holder: model.text().nullable(), // Inhaber
  iban: model.text().nullable(), // IBAN
  bic: model.text().nullable(), // BIC
});

export type Supplier = InferTypeOf<typeof supplier>;

export default supplier;
