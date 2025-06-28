/**
 * contact.ts
 * Contact model for supplier contacts with proper foreign key relationship
 * Uses Medusa's relational pattern with supplier_id as foreign key
 */
import { InferTypeOf } from '@medusajs/framework/types';
import { model } from '@medusajs/framework/utils';

const contact = model.define('contact', {
  id: model.id().primaryKey(),

  // Foreign key to supplier (belongsTo relationship)
  supplier_id: model.text(), // References supplier.id

  // Contact person details
  salutation: model.text().nullable(), // Anrede
  first_name: model.text().nullable(), // Vorname
  last_name: model.text().nullable(), // Nachname
  department: model.text().nullable(), // Abteilung

  // Contact type and priority
  is_main_contact: model.boolean().default(false), // Is this the main contact?
  contact_type: model.text().default('additional'), // 'main', 'additional', 'billing', 'technical'
  label: model.text().nullable(), // Custom label like "Sales Manager", "Technical Support"

  // Multiple phone numbers stored as JSON (removed, now handled by ContactPhone model)
  // phones: model.json().nullable(),

  // Multiple email addresses stored as JSON (removed, now handled by ContactEmail model)
  // emails: model.json().nullable(),

  // Additional contact methods
  fax: model.text().nullable(), // Fax number
  website: model.text().nullable(), // Personal website

  // Status and metadata
  is_active: model.boolean().default(true),
  notes: model.text().nullable(), // Additional notes about this contact
});

export type Contact = InferTypeOf<typeof contact>;
export default contact;
